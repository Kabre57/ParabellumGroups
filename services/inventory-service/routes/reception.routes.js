const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  createReception,
  listReceptions,
  getReception,
  validateReception,
  uploadSupplierInvoice,
} = require('../controllers/reception.controller');

const upload = multer({ storage: multer.memoryStorage() });

// Liste
router.get('/', listReceptions);
// Détail
router.get('/:id', getReception);
// Création
router.post('/', createReception);
router.post('/:id/invoice', upload.single('invoice'), uploadSupplierInvoice);
// Validation
router.patch('/:id/validate', validateReception);

module.exports = router;
