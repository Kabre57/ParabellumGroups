const express = require('express');
const purchaseCommitmentController = require('../controllers/purchaseCommitment.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', purchaseCommitmentController.getAllPurchaseCommitments);
router.get('/stats', purchaseCommitmentController.getPurchaseCommitmentsStats);
router.patch('/:id/validate', purchaseCommitmentController.validatePurchaseCommitment);

module.exports = router;
