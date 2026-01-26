const express = require('express');
const router = express.Router();
const specialiteController = require('../controllers/specialite.controller');

router.get('/', specialiteController.getAll);
router.post('/', specialiteController.create);
router.get('/:id', specialiteController.getById);
router.put('/:id', specialiteController.update);

module.exports = router;
