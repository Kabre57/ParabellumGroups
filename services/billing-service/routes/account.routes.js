const express = require('express');
const accountController = require('../controllers/account.controller');

const router = express.Router();

router.get('/', accountController.getAllAccounts);
router.post('/', accountController.createAccount);
router.patch('/:id', accountController.updateAccount);
router.delete('/:id', accountController.deleteAccount);

module.exports = router;
