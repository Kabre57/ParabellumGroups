const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/portal.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.get('/me', ctrl.getMesInfos);
router.post('/conges', ctrl.soumettreConge);
router.get('/conges', ctrl.mesConges);
router.post('/prets', ctrl.soumettrePret);
router.get('/prets', ctrl.mesPrets);

module.exports = router;
