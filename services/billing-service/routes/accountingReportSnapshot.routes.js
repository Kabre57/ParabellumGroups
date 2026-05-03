const express = require('express');
const controller = require('../controllers/accountingReportSnapshot.controller');

const router = express.Router();

router.get('/', controller.getSnapshots);
router.post('/', controller.createSnapshot);

module.exports = router;
