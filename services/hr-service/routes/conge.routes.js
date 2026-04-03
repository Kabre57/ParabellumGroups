const express = require('express');
const router = express.Router();
const congeController = require('../controllers/conge.controller');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, congeController.list);
router.get('/calendrier', authMiddleware, congeController.getCalendrier);
router.get('/solde/:employeId', authMiddleware, congeController.getSolde);
router.get('/:id', authMiddleware, congeController.get);
router.post('/', authMiddleware, congeController.create);
router.put('/:id', authMiddleware, congeController.update);
router.delete('/:id', authMiddleware, congeController.remove);
router.patch('/:id/approve', authMiddleware, congeController.approve);
router.patch('/:id/reject', authMiddleware, congeController.reject);

module.exports = router;
