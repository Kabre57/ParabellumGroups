const express = require('express');
const router = express.Router();
const equipementController = require('../controllers/equipement.controller');
const auth = require('../middleware/auth');

router.post('/', auth, equipementController.createEquipement);
router.get('/', auth, equipementController.getAllEquipements);
router.get('/stats', auth, equipementController.getStats);
router.get('/:id', auth, equipementController.getEquipementById);
router.put('/:id', auth, equipementController.updateEquipement);
router.delete('/:id', auth, equipementController.deleteEquipement);
router.patch('/:id/status', auth, equipementController.updateStatus);
router.get('/:id/maintenances', auth, equipementController.getMaintenance);

module.exports = router;
