const express = require('express');
const router = express.Router();
const employeController = require('../controllers/employe.controller');
const authMiddleware = require('../middleware/auth');

// Routes
router.get('/', authMiddleware, employeController.getAll);
router.get('/stats', authMiddleware, employeController.getStats);
router.get('/:id', authMiddleware, employeController.getById);
router.get('/:id/contracts', authMiddleware, employeController.getContracts);
router.post('/', authMiddleware, employeController.create);
router.put('/:id', authMiddleware, employeController.update);
router.delete('/:id', authMiddleware, employeController.delete);

module.exports = router;
