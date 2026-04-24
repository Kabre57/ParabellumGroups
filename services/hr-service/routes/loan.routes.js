const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loan.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.get('/', loanController.getAllLoans);
router.post('/', loanController.createLoan);
router.patch('/:id/terminate', loanController.terminateLoan);
router.get('/:id', loanController.getLoan);
router.put('/:id', loanController.updateLoan);
router.patch('/:id', loanController.updateLoan);
router.delete('/:id', loanController.deleteLoan);

module.exports = router;
