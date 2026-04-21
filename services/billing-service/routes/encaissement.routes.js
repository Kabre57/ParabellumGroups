const express = require('express');
const router = express.Router();
const controller = require('../controllers/encaissement.controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', controller.getAll);
router.post('/', controller.create);

module.exports = router;
