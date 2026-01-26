const express = require('express');
const { body } = require('express-validator');
const {
  createProjet,
  getAllProjets,
  getProjetById,
  updateProjet,
  deleteProjet,
  getProjetStats
} = require('../controllers/projet.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation pour création de projet
const validateCreateProjet = [
  body('nom').notEmpty().trim().withMessage('Le nom est requis'),
  body('clientId').notEmpty().trim().withMessage('Le clientId est requis'),
  body('dateDebut').isISO8601().withMessage('Date de début invalide'),
  body('dateFin').optional().isISO8601().withMessage('Date de fin invalide'),
  body('budget').optional().isDecimal().withMessage('Budget doit être un nombre'),
  body('status').optional().isIn(['PLANIFIE', 'EN_COURS', 'SUSPENDU', 'TERMINE', 'ANNULE']).withMessage('Status invalide'),
  body('priorite').optional().isIn(['BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE']).withMessage('Priorité invalide')
];

// Routes
router.post('/', authenticate, validateCreateProjet, createProjet);
router.get('/', authenticate, getAllProjets);
router.get('/:id', authenticate, getProjetById);
router.put('/:id', authenticate, updateProjet);
router.delete('/:id', authenticate, deleteProjet);
router.get('/:id/stats', authenticate, getProjetStats);

module.exports = router;
