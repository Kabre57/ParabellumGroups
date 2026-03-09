const express = require('express');
const router = express.Router();
const {
  createReception,
  listReceptions,
  getReception,
  validateReception,
} = require('../controllers/reception.controller');

// Liste
router.get('/', listReceptions);
// Détail
router.get('/:id', getReception);
// Création
router.post('/', createReception);
// Validation
router.patch('/:id/validate', validateReception);

module.exports = router;
