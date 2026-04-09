const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluation.controller');
const { authenticateUser } = require('../../shared/middleware/auth');

router.use(authenticateUser);

router.get('/', evaluationController.getAllEvaluations);
router.post('/', evaluationController.createEvaluation);
router.get('/:id', evaluationController.getEvaluation);
router.put('/:id', evaluationController.updateEvaluation);
router.delete('/:id', evaluationController.deleteEvaluation);

module.exports = router;
