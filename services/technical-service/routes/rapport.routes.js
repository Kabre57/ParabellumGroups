const express = require('express');
const router = express.Router();
const rapportController = require('../controllers/rapport.controller');

router.get('/', rapportController.getAll);
router.post('/', rapportController.create);
router.patch('/:id/status', rapportController.updateStatus);

module.exports = router;
