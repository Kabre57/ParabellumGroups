const express = require('express');
const router = express.Router();
const inventaireController = require('../controllers/inventaire.controller');
const auth = require('../middleware/auth');

router.post('/', auth, inventaireController.createInventaire);
router.get('/', auth, inventaireController.getAllInventaires);
router.get('/:id', auth, inventaireController.getInventaireById);
router.put('/:id', auth, inventaireController.updateInventaire);
router.delete('/:id', auth, inventaireController.deleteInventaire);
router.post('/:inventaireId/lignes', auth, inventaireController.addLigne);
router.post('/:id/start', auth, inventaireController.startInventaire);
router.post('/:id/close', auth, inventaireController.closeInventaire);
router.post('/:id/validate', auth, inventaireController.validateInventaire);
router.get('/:id/ecarts', auth, inventaireController.getEcarts);

module.exports = router;
