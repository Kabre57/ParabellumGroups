const express = require('express');
const purchaseCommitmentController = require('../controllers/purchaseCommitment.controller');

const router = express.Router();

router.post(
  '/',
  purchaseCommitmentController.ensureInternalEventSecret,
  purchaseCommitmentController.ingestProcurementEvent
);

module.exports = router;
