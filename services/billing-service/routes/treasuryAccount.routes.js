const express = require('express');
const treasuryAccountController = require('../controllers/treasuryAccount.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', treasuryAccountController.getTreasuryAccounts);
router.post('/', treasuryAccountController.createTreasuryAccount);
router.patch('/:id', treasuryAccountController.updateTreasuryAccount);

module.exports = router;
