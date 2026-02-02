const express = require('express');
const router = express.Router();
const prospectController = require('../controllers/prospect.controller');

// Routes principales pour les prospects
router.get('/', prospectController.getAll);
router.get('/stats', prospectController.getStats);
router.get('/:id', prospectController.getById);
router.post('/', prospectController.create);
router.put('/:id', prospectController.update);
router.delete('/:id', prospectController.delete);
router.post('/:id/move', prospectController.moveStage);
router.post('/:id/convert', prospectController.convert);

// Routes pour les activités
router.get('/:id/activities', prospectController.getActivities);
router.post('/:id/activities', prospectController.addActivity);
router.put('/:id/activities/:activityId', prospectController.updateActivity);

// Routes pour les documents
router.get('/:id/documents', prospectController.getDocuments);
router.post('/:id/documents', prospectController.uploadDocument);

// Routes pour les notes
router.get('/:id/notes', prospectController.getNotes);
router.post('/:id/notes', prospectController.addNote);

// Routes pour les concurrents
router.get('/:id/competitors', prospectController.getCompetitors);
router.post('/:id/competitors', prospectController.addCompetitor);

// Routes pour l'historique
router.get('/:id/history', prospectController.getHistory);

// Routes pour les campagnes
router.get('/campaigns/all', prospectController.getCampaigns);
router.post('/campaigns/create', prospectController.createCampaign);

// Routes pour les séquences
router.get('/sequences/all', prospectController.getSequences);
router.post('/:id/sequences/assign', prospectController.assignToSequence);

// Routes pour les objectifs
router.get('/targets/all', prospectController.getTargets);
router.put('/targets/:id', prospectController.updateTarget);

// Routes pour les templates d'email
router.get('/templates/all', prospectController.getTemplates);
router.post('/templates/create', prospectController.createTemplate);

module.exports = router;