const multer = require('multer');
const path = require('path');

const getStorage = (folder) => {
  if (process.env.NODE_ENV === 'test') {
    return multer.memoryStorage();
  }
  const { createStorage } = require('../config/cloudinary');
  return createStorage(folder);
};

const createUploader = (folder, fieldName = 'image', maxCount = 1) => {
  const storage = getStorage(folder);

  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG, PNG, and WebP images are allowed.'), false);
      }
    },
  });

  if (maxCount === 1) {
    return upload.single(fieldName);
  }
  return upload.array(fieldName, maxCount);
};

const uploadFields = (folder, fields) => {
  const storage = getStorage(folder);

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only JPEG, PNG, and WebP images are allowed.'), false);
      }
    },
  }).fields(fields);
};

module.exports = { createUploader, uploadFields };
