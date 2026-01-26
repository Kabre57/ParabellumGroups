const express = require('express');
const router = express.Router();
const widgetController = require('../controllers/widget.controller');
const auth = require('../middleware/auth');

router.post('/', auth, widgetController.createWidget);
router.get('/', auth, widgetController.getAllWidgets);
router.get('/:id', auth, widgetController.getWidgetById);
router.put('/:id', auth, widgetController.updateWidget);
router.delete('/:id', auth, widgetController.deleteWidget);
router.put('/:id/position', auth, widgetController.updatePosition);
router.get('/:id/data', auth, widgetController.getData);
router.post('/:id/refresh', auth, widgetController.refresh);

module.exports = router;
