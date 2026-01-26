const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const auth = require('../middleware/auth');

router.post('/', auth, notificationController.create);
router.get('/user/:userId', auth, notificationController.getByUser);
router.put('/:id/read', auth, notificationController.markAsRead);
router.delete('/user/:userId/read', auth, notificationController.deleteRead);
router.delete('/:id', auth, notificationController.delete);

module.exports = router;
