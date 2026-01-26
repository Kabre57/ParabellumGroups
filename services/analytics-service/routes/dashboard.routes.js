const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const auth = require('../middleware/auth');

router.post('/', auth, dashboardController.createDashboard);
router.get('/', auth, dashboardController.getAllDashboards);
router.get('/:id', auth, dashboardController.getDashboardById);
router.put('/:id', auth, dashboardController.updateDashboard);
router.delete('/:id', auth, dashboardController.deleteDashboard);
router.get('/:id/data', auth, dashboardController.getDashboardData);
router.post('/:id/duplicate', auth, dashboardController.duplicateDashboard);
router.put('/:id/set-default', auth, dashboardController.setDefault);

module.exports = router;
