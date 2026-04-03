const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

const loanController = require('../controllers/loan.controller');

router.get('/', authMiddleware, loanController.list);
router.get('/:id', authMiddleware, loanController.get);
router.post('/', authMiddleware, loanController.create);
router.patch('/:id', authMiddleware, loanController.update);
router.delete('/:id', authMiddleware, loanController.remove);
router.patch('/:id/terminate', authMiddleware, loanController.terminate);

module.exports = router;
