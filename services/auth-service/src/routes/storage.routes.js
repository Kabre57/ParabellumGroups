const express = require('express');
const { serveStorageObject } = require('../controllers/storage.controller');

const router = express.Router();

router.get('/*', serveStorageObject);

module.exports = router;
