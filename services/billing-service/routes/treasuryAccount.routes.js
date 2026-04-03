const express = require('express');
const treasuryAccountController = require('../controllers/treasuryAccount.controller');

const router = express.Router();

router.get('/', treasuryAccountController.getTreasuryAccounts);
router.post('/', treasuryAccountController.createTreasuryAccount);
router.patch('/:id', treasuryAccountController.updateTreasuryAccount);

module.exports = router;
