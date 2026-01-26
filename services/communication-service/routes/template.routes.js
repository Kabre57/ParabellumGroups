const express = require('express');
const router = express.Router();
const templateController = require('../controllers/template.controller');
const auth = require('../middleware/auth');

router.post('/', auth, templateController.create);
router.get('/', auth, templateController.getAll);
router.get('/:id', auth, templateController.getById);
router.put('/:id', auth, templateController.update);
router.delete('/:id', auth, templateController.delete);
router.post('/:id/preview', auth, templateController.preview);
router.post('/:id/duplicate', auth, templateController.duplicate);

module.exports = router;
