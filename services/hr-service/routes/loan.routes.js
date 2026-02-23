const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

const loanController = require('../controllers/loan.controller');

router.get('/', authMiddleware, loanController.list.bind(loanController));
router.get('/:id', authMiddleware, loanController.get.bind(loanController));
router.post('/', authMiddleware, loanController.create.bind(loanController));
router.patch('/:id', authMiddleware, loanController.update.bind(loanController));
router.delete('/:id', authMiddleware, loanController.delete.bind(loanController));
router.patch('/:id/terminate', authMiddleware, loanController.terminate.bind(loanController));

module.exports = router;
