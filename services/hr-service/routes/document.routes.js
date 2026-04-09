const express = require('express');
const router = express.Router();
const documentController = require('../controllers/document.controller');
const { authenticateUser } = require('../../shared/middleware/auth');

router.use(authenticateUser);

router.get('/contract/:id', documentController.generateContractPdf);
router.get('/attestation/:id', documentController.generateAttestationPdf);
// Pour le certificat de travail (similaire à l'attestation mais après rupture)
router.get('/certificat/:id', documentController.generateAttestationPdf); 

module.exports = router;
