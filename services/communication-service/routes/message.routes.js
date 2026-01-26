const express = require('express');
const router = express.Router();
const messageController = require('../controllers/message.controller');
const auth = require('../middleware/auth');

router.post('/', auth, messageController.create);
router.get('/', auth, messageController.getAll);
router.get('/:id', auth, messageController.getById);
router.put('/:id', auth, messageController.update);
router.delete('/:id', auth, messageController.delete);
router.post('/:id/send', auth, messageController.send);
router.put('/:id/read', auth, messageController.markAsRead);
router.put('/:id/archive', auth, messageController.archive);

module.exports = router;
