const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenance.controller');
const auth = require('../middleware/auth');

router.post('/', auth, maintenanceController.createMaintenance);
router.get('/', auth, maintenanceController.getAllMaintenances);
router.get('/planning', auth, maintenanceController.getPlanning);
router.get('/:id', auth, maintenanceController.getMaintenanceById);
router.put('/:id', auth, maintenanceController.updateMaintenance);
router.delete('/:id', auth, maintenanceController.deleteMaintenance);
router.post('/:id/complete', auth, maintenanceController.completeMaintenance);

module.exports = router;
