const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const treasuryClosureController = require('../controllers/treasuryClosure.controller');

const router = express.Router();

router.use(authenticateToken);

router.get('/', treasuryClosureController.getTreasuryClosures);
router.post('/', treasuryClosureController.createTreasuryClosure);
router.patch('/:id', treasuryClosureController.updateTreasuryClosure);
router.post('/:id/validate', treasuryClosureController.validateTreasuryClosure);

module.exports = router;
