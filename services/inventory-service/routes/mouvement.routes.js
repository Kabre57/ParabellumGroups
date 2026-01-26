const express = require('express');
const router = express.Router();
const mouvementController = require('../controllers/mouvement.controller');
const auth = require('../middleware/auth');

router.post('/', auth, mouvementController.createMouvement);
router.get('/', auth, mouvementController.getAllMouvements);
router.get('/article/:articleId', auth, mouvementController.getByArticle);
router.get('/type/:type', auth, mouvementController.getByType);
router.delete('/:id/cancel', auth, mouvementController.cancelMouvement);

module.exports = router;
