const express = require('express');
const controller = require('../controllers/accountingDiagnostic.controller');

const router = express.Router();

router.get('/', controller.getDiagnosticRuns);
router.post('/run', controller.runDiagnostic);

module.exports = router;
