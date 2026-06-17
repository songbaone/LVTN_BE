const { db } = require('../../database/connection');
const { TABLES, ORDER_STATUS } = require('../../config/constants');
const { AppError } = require('../../middleware/errorHandler');

function parseAddressId(addressId) {
  const id = parseInt(addressId, 10);

  if (Number.isNaN(id) || id < 1) {
    throw new AppError('Invalid address ID', 400);
  }

  return id;
}

function parseBoolean(value) {
  return [true, 1, '1', 'true'].includes(value);
}

function mapAddress(record) {
  if (!record) {
    return null;
  }

  return {
    address_id: record.address_id,
    recipient_name: record.receiver_name,
    phone: record.receiver_phone,
    address_line: record.detail_address,
    ward: record.ward ?? null,
    province: record.province ?? null,
    is_default: Boolean(record.is_default),
    district: record.district ?? null,
  };
}

function mapToDbFields(data) {
  const mapped = {};

  if (data.recipient_name !== undefined) {
    mapped.receiver_name = data.recipient_name;
  }

  if (data.phone !== undefined) {
    mapped.receiver_phone = data.phone;
  }

  if (data.address_line !== undefined) {
    mapped.detail_address = data.address_line;
  }

  if (data.ward !== undefined) {
    mapped.ward = data.ward || null;
  }

  if (data.province !== undefined) {
    mapped.province = data.province;
  }

  if (data.is_default !== undefined) {
    mapped.is_default = parseBoolean(data.is_default) ? 1 : 0;
  }

  if(data.district !== undefined) {
    mapped.district = data.district || null;
  }

  return mapped;
}

async function resetDefaultAddresses(trx, userId, excludeAddressId = null) {
  const query = trx(TABLES.ADDRESSES).where({ user_id: userId });

  if (excludeAddressId) {
    query.whereNot({ address_id: excludeAddressId });
  }

  await query.update({ is_default: 0 });
}

async function ensureAddressBelongsToUser(userId, addressId, trx = db) {
  const address = await trx(TABLES.ADDRESSES)
    .where({ address_id: addressId, user_id: userId })
    .first();

  if (!address) {
    throw new AppError('Address not found', 404);
  }

  return address;
}

async function hasActiveOrdersForAddress(addressId, trx = db) {
  const activeOrder = await trx(TABLES.ORDERS)
    .where({ address_id: addressId })
    .whereNotIn('order_status', [
      ORDER_STATUS.DELIVERED,
      ORDER_STATUS.CANCELLED,
    ])
    .first();

  return Boolean(activeOrder);
}

async function promoteNextDefaultAddress(trx, userId, excludeAddressId) {
  const nextDefault = await trx(TABLES.ADDRESSES)
    .where({ user_id: userId })
    .whereNot({ address_id: excludeAddressId })
    .orderBy('address_id', 'asc')
    .first();

  if (nextDefault) {
    await trx(TABLES.ADDRESSES)
      .where({ address_id: nextDefault.address_id })
      .update({ is_default: 1 });
  }
}

async function getAddresses(userId) {
  const addresses = await db(TABLES.ADDRESSES)
    .where({ user_id: userId })
    .orderBy('is_default', 'desc')
    .orderBy('address_id', 'asc');

  return {
    addresses: addresses.map(mapAddress),
  };
}

async function getAddressById(userId, addressIdParam) {
  const addressId = parseAddressId(addressIdParam);
  const address = await ensureAddressBelongsToUser(userId, addressId);

  return mapAddress(address);
}

async function createAddress(userId, data) {
  await db.transaction(async (trx) => {
    const countResult = await trx(TABLES.ADDRESSES)
      .where({ user_id: userId })
      .count({ count: '*' });

    const addressCount = Number(countResult[0]?.count ?? 0);
    const isFirstAddress = addressCount === 0;
    const shouldBeDefault =
      isFirstAddress ||
      (data.is_default !== undefined && parseBoolean(data.is_default));

    const insertData = mapToDbFields(data);
    insertData.user_id = userId;
    insertData.is_default = shouldBeDefault ? 1 : 0;

    if (shouldBeDefault && !isFirstAddress) {
      await resetDefaultAddresses(trx, userId);
    }

    await trx(TABLES.ADDRESSES).insert(insertData);
  });

  const created = await db(TABLES.ADDRESSES)
    .where({ user_id: userId })
    .orderBy('address_id', 'desc')
    .first();

  return mapAddress(created);
}

async function updateAddress(userId, addressIdParam, data) {
  const addressId = parseAddressId(addressIdParam);
  await ensureAddressBelongsToUser(userId, addressId);

  const updateData = mapToDbFields(data);

  if (Object.keys(updateData).length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  await db.transaction(async (trx) => {
    if (data.is_default !== undefined && parseBoolean(data.is_default)) {
      await resetDefaultAddresses(trx, userId, addressId);
      updateData.is_default = 1;
    }

    await trx(TABLES.ADDRESSES)
      .where({ address_id: addressId, user_id: userId })
      .update(updateData);
  });

  const updated = await db(TABLES.ADDRESSES).where({ address_id: addressId }).first();

  return mapAddress(updated);
}

async function deleteAddress(userId, addressIdParam) {
  const addressId = parseAddressId(addressIdParam);
  const address = await ensureAddressBelongsToUser(userId, addressId);

  const hasActiveOrders = await hasActiveOrdersForAddress(addressId);

  if (hasActiveOrders) {
    throw new AppError(
      'Cannot delete address that is used by active orders',
      400
    );
  }

  const wasDefault = Boolean(address.is_default);

  await db.transaction(async (trx) => {
    await trx(TABLES.ADDRESSES)
      .where({ address_id: addressId, user_id: userId })
      .del();

    if (wasDefault) {
      await promoteNextDefaultAddress(trx, userId, addressId);
    }
  });

  return { address_id: addressId };
}

async function setDefaultAddress(userId, addressIdParam) {
  const addressId = parseAddressId(addressIdParam);
  await ensureAddressBelongsToUser(userId, addressId);

  await db.transaction(async (trx) => {
    await resetDefaultAddresses(trx, userId, addressId);

    await trx(TABLES.ADDRESSES)
      .where({ address_id: addressId, user_id: userId })
      .update({ is_default: 1 });
  });

  const updated = await db(TABLES.ADDRESSES).where({ address_id: addressId }).first();

  return mapAddress(updated);
}

module.exports = {
  getAddresses,
  getAddressById,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};
