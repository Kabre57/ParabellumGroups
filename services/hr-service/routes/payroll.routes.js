const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');

router.get('/', payrollController.getAllPayroll.bind(payrollController));
router.get('/:id', payrollController.getPayroll.bind(payrollController));
router.post('/', payrollController.createPayroll.bind(payrollController));
router.post('/generate', payrollController.generatePayslip.bind(payrollController));
router.patch('/:id', payrollController.updatePayroll.bind(payrollController));
router.delete('/:id', payrollController.deletePayroll.bind(payrollController));

module.exports = router;
