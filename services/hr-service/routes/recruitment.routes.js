const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/recruitment.controller');
const { authenticateUser } = require('../middleware/auth.middleware');

router.use(authenticateUser);

router.post('/offres', ctrl.createOffre);
router.get('/offres', ctrl.getOffres);
router.post('/candidatures', ctrl.createCandidature);
router.get('/candidatures', ctrl.getCandidatures);
router.put('/candidatures/:id', ctrl.updateCandidature);

module.exports = router;
