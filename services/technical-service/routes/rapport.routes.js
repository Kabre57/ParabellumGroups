const express = require('express');
const multer = require('multer');
const router = express.Router();
const rapportController = require('../controllers/rapport.controller');

const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Type de fichier non autorisé'));
    }
    cb(null, true);
  },
});

router.get('/', rapportController.getAll);
router.post('/', rapportController.create);
router.patch('/:id/status', rapportController.updateStatus);
router.get('/:id', rapportController.getById);
router.post('/:id/photos', upload.array('photos', 10), rapportController.uploadPhotos);
router.delete('/:id/photos', rapportController.deletePhoto);
router.get('/:id/pdf', rapportController.getPdf);

module.exports = router;
