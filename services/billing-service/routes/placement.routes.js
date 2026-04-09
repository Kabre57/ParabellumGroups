const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const placementController = require('../controllers/placement.controller');

const router = express.Router();

router.use(authenticateToken);

router.get('/stats/performance', placementController.getPlacementsPerformance);
router.get('/', placementController.getPlacements);
router.get('/:id', placementController.getPlacementById);
router.post('/', placementController.createPlacement);
router.post('/:id/courses', placementController.addAssetCourse);
router.patch('/:id/status', placementController.updatePlacementStatus);

module.exports = router;
