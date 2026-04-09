const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budget.controller');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/performance', budgetController.getBudgetPerformance);
router.get('/', budgetController.getBudgets);

module.exports = router;
