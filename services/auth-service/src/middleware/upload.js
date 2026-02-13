const multer = require('multer');

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Type de fichier non autorisé. Autorisés: ${ALLOWED_MIMES.join(', ')}`), false);
  }
};

const uploadServiceImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
}).single('image');

module.exports = {
  uploadServiceImage,
};
