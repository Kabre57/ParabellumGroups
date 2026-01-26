const express = require('express');
const router = express.Router();
const articleController = require('../controllers/article.controller');
const auth = require('../middleware/auth');

router.post('/', auth, articleController.createArticle);
router.get('/', auth, articleController.getAllArticles);
router.get('/alertes', auth, articleController.getAlertes);
router.get('/valeur-stock', auth, articleController.getValeurStock);
router.get('/:id', auth, articleController.getArticleById);
router.put('/:id', auth, articleController.updateArticle);
router.delete('/:id', auth, articleController.deleteArticle);
router.get('/:id/mouvements', auth, articleController.getMouvements);

module.exports = router;
