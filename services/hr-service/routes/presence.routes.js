const express = require('express');
const router = express.Router();
const presenceController = require('../controllers/presence.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.get('/employe/:employeId', presenceController.getPresencesByEmploye);
router.get('/stats', presenceController.getPresenceStats);
router.get('/export', presenceController.exportPresences);
router.post('/pointage', presenceController.pointage);
router.post('/', presenceController.createPresence);
router.put('/:id', presenceController.updatePresence);
router.patch('/:id', presenceController.updatePresence);

router.get('/absences', presenceController.getAllAbsences);
router.post('/absences', presenceController.createAbsence);
router.get('/absences/:id', presenceController.getAbsence);
router.put('/absences/:id', presenceController.updateAbsence);
router.delete('/absences/:id', presenceController.deleteAbsence);

router.get('/variables', presenceController.getAllVariables);
router.post('/variables/saisir', presenceController.saisirVariables);

module.exports = router;
