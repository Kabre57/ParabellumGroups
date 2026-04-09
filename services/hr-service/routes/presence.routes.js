const express = require('express');
const router = express.Router();
const presenceController = require('../controllers/presence.controller');
const { authenticateUser } = require('../../shared/middleware/auth');

router.use(authenticateUser);

router.get('/absences', presenceController.getAllAbsences);
router.post('/absences', presenceController.createAbsence);
router.get('/absences/:id', presenceController.getAbsence);
router.put('/absences/:id', presenceController.updateAbsence);
router.delete('/absences/:id', presenceController.deleteAbsence);

router.get('/variables', presenceController.getAllVariables);
router.post('/variables/saisir', presenceController.saisirVariables);

module.exports = router;
