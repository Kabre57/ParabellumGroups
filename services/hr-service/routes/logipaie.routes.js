const express = require('express');
const router = express.Router();
const logipaieController = require('../controllers/logipaie.controller');
const { authenticateUser } = require('../../shared/middleware/auth');

router.use(authenticateUser);

router.get('/disa', logipaieController.generateDisa);
router.get('/its', logipaieController.generateIts);
router.get('/payslip/:bulletinId', logipaieController.printPayslip);

module.exports = router;
