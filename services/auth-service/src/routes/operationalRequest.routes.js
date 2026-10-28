const express = require('express');
const authenticate = require('../middleware/auth');
const { getOperationalRequestRecipients } = require('../controllers/operationalRequest.controller');

const router = express.Router();
router.use(authenticate);
router.get('/recipients', getOperationalRequestRecipients);

module.exports = router;
