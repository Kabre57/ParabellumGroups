const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/formation.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.post('/', ctrl.createFormation);
router.get('/', ctrl.getFormations);
router.post('/inscriptions', ctrl.createInscription);

module.exports = router;
