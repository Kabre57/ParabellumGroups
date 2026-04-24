const express = require('express');
const router = express.Router();
const avoirController = require('../controllers/avoir.controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', avoirController.getAllAvoirs);
router.get('/:id', avoirController.getAvoirById);
router.post('/', avoirController.createAvoir);
router.get('/:id/pdf', avoirController.generatePDF);

module.exports = router;
