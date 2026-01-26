const express = require('express');
const { body } = require('express-validator');
const {
  createTache,
  getAllTaches,
  getTacheById,
  updateTache,
  deleteTache,
  assignTache,
  unassignTache,
  completeTache
} = require('../controllers/tache.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation pour création de tâche
const validateCreateTache = [
  body('projetId').notEmpty().trim().withMessage('Le projetId est requis'),
  body('titre').notEmpty().trim().withMessage('Le titre est requis'),
  body('dateDebut').optional().isISO8601().withMessage('Date de début invalide'),
  body('dateEcheance').optional().isISO8601().withMessage('Date d\'échéance invalide'),
  body('dureeEstimee').optional().isInt({ min: 0 }).withMessage('Durée estimée doit être un entier positif'),
  body('status').optional().isIn(['A_FAIRE', 'EN_COURS', 'TERMINEE', 'BLOQUEE']).withMessage('Status invalide'),
  body('priorite').optional().isIn(['BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE']).withMessage('Priorité invalide')
];

// Routes
router.post('/', authenticate, validateCreateTache, createTache);
router.get('/', authenticate, getAllTaches);
router.get('/:id', authenticate, getTacheById);
router.put('/:id', authenticate, updateTache);
router.delete('/:id', authenticate, deleteTache);
router.post('/:id/assign', authenticate, assignTache);
router.delete('/:id/assign/:userId', authenticate, unassignTache);
router.patch('/:id/complete', authenticate, completeTache);

module.exports = router;
