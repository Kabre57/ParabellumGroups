const express = require('express');
const router = express.Router();
const interventionController = require('../controllers/intervention.controller');

router.get('/', interventionController.getAll);
router.post('/', interventionController.create);
router.patch('/:id/complete', interventionController.complete);

module.exports = router;
