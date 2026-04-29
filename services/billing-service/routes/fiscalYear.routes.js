const express = require('express');
const controller = require('../controllers/fiscalYear.controller');

const router = express.Router();

router.get('/', controller.getFiscalYears);
router.post('/', controller.createFiscalYear);

module.exports = router;
