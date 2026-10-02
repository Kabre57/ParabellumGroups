const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const controller = require('../controllers/treasuryTransfer.controller');

const router = express.Router();
router.use(authenticateToken);
router.get('/', controller.list);
router.post('/', controller.create);

module.exports = router;
