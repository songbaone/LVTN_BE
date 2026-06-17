const blacklist = new Map();

function add(token) {
  if (!token) {
    return;
  }
  blacklist.set(token, Date.now());
}

function has(token) {
  if (!token) {
    return false;
  }
  return blacklist.has(token);
}

function remove(token) {
  if (!token) {
    return;
  }
  blacklist.delete(token);
}

function clear() {
  blacklist.clear();
}

function size() {
  return blacklist.size;
}

module.exports = {
  add,
  has,
  remove,
  clear,
  size,
};
