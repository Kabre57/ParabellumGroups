const express = require('express');
const { serveStorageObject } = require('../controllers/storage.controller');
const authenticateStorage = require('../middleware/authenticateStorage');

const router = express.Router();

router.use(authenticateStorage);
router.get('/*', serveStorageObject);

module.exports = router;
