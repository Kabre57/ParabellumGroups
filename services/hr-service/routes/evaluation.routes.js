const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluation.controller');
const authMiddleware = require('../middleware/auth');

// Routes
router.get('/', authMiddleware, evaluationController.getAll);
router.get('/employe/:employeId', authMiddleware, evaluationController.getByEmploye);
router.get('/:id', authMiddleware, evaluationController.getById);
router.post('/', authMiddleware, evaluationController.create);
router.put('/:id', authMiddleware, evaluationController.update);
router.delete('/:id', authMiddleware, evaluationController.remove);

module.exports = router;
