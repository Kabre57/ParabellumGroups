const express = require('express');
const router = express.Router();
const payrollController = require('../controllers/payroll.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.get('/overview', payrollController.getPayrollOverview);
router.get('/bulletins', payrollController.getAllBulletins);
router.post('/bulletins', payrollController.createBulletin);
router.post('/bulletins/calculer', payrollController.calculerPaie);
router.post('/traitement-masse', payrollController.traitementMasse);
router.get('/annuel-summary', payrollController.getLivrePaieAnnuel);
router.get('/bulletins/:id/pdf', payrollController.downloadBulletinPdf);
router.get('/bulletins/:id', payrollController.getBulletin);
router.patch('/bulletins/:id', payrollController.updateBulletin);
router.put('/bulletins/:id', payrollController.updateBulletin);
router.delete('/bulletins/:id', payrollController.deleteBulletin);

module.exports = router;
