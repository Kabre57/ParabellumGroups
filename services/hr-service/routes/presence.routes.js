const express = require('express');
const router = express.Router();
const presenceController = require('../controllers/presence.controller');
const authMiddleware = require('../middleware/auth');

// Routes
router.post('/', authMiddleware, presenceController.create);
router.put('/:id', authMiddleware, presenceController.update);
router.get('/employe/:employeId', authMiddleware, presenceController.listByEmployee);
router.get('/stats', authMiddleware, presenceController.stats);
router.get('/export', authMiddleware, presenceController.exportCsv);
router.post('/pointage', authMiddleware, presenceController.pointage);

module.exports = router;
