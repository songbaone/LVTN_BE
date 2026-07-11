const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { env } = require('../config/env');
const { UPLOAD_FOLDERS } = require('../config/constants');
const { sendError } = require('../utils/apiResponse');

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

function ensureUploadDir(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

function createDiskStorage(destination) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureUploadDir(destination);
      cb(null, destination);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, filename);
    },
  });
}

function imageFileFilter(_req, file, cb) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return cb(new Error('Only image files (JPEG, PNG, WEBP, GIF) are allowed'));
  }

  return cb(null, true);
}

function createImageUploader(destination) {
  return multer({
    storage: createDiskStorage(destination),
    limits: { fileSize: env.UPLOAD_MAX_FILE_SIZE },
    fileFilter: imageFileFilter,
  });
}

function handleUpload(uploadMiddleware) {
  return (req, res, next) => {
    uploadMiddleware(req, res, (error) => {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return sendError(res, 'File size exceeds the allowed limit', [], 400);
        }

        return sendError(res, error.message, [], 400);
      }

      if (error) {
        return sendError(res, error.message, [], 400);
      }

      return next();
    });
  };
}

const brandLogoUpload = createImageUploader(UPLOAD_FOLDERS.BRANDS);
const productImageUpload = createImageUploader(UPLOAD_FOLDERS.PRODUCTS);
const categoryImageUpload = createImageUploader(UPLOAD_FOLDERS.CATEGORIES);

const avatarUpload = createImageUploader(UPLOAD_FOLDERS.AVATARS);

const uploadBrandLogo = handleUpload(brandLogoUpload.single('logo'));
const uploadProductImage = handleUpload(productImageUpload.single('image'));
const uploadProductImages = handleUpload(productImageUpload.array('images', 10));
const uploadCategoryImage = handleUpload(categoryImageUpload.single('image'));
const uploadUserAvatar = handleUpload(avatarUpload.single('avatar'));

const chatUpload = createImageUploader(UPLOAD_FOLDERS.CHAT);

// Accept any file type for chat, not just images
const chatFileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    ensureUploadDir(UPLOAD_FOLDERS.CHAT);
    cb(null, UPLOAD_FOLDERS.CHAT);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
  },
});

const chatFileUpload = multer({
  storage: chatFileStorage,
  limits: { fileSize: env.UPLOAD_MAX_FILE_SIZE },
});

const uploadChatAttachment = handleUpload(chatFileUpload.single('file'));

// ── Excel Upload Middleware ────────────────────────────────────────
const ALLOWED_EXCEL_TYPES = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

const excelStorage = multer.memoryStorage();

function excelFileFilter(_req, file, cb) {
  if (!ALLOWED_EXCEL_TYPES.includes(file.mimetype)) {
    return cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
  }
  return cb(null, true);
}

const excelUpload = multer({
  storage: excelStorage,
  limits: { fileSize: env.UPLOAD_MAX_FILE_SIZE },
  fileFilter: excelFileFilter,
});

const uploadExcelFile = handleUpload(excelUpload.single('file'));

module.exports = {
  uploadBrandLogo,
  uploadProductImage,
  uploadProductImages,
  uploadCategoryImage,
  uploadUserAvatar,
  uploadChatAttachment,
  uploadExcelFile,
};
