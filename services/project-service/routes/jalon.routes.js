const express = require('express');
const { body } = require('express-validator');
const {
  createJalon,
  getAllJalons,
  getJalonById,
  updateJalon,
  deleteJalon,
  updateJalonStatus
} = require('../controllers/jalon.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Validation pour création de jalon
const validateCreateJalon = [
  body('projetId').notEmpty().trim().withMessage('Le projetId est requis'),
  body('nom').notEmpty().trim().withMessage('Le nom est requis'),
  body('dateEcheance').isISO8601().withMessage('Date d\'échéance invalide'),
  body('status').optional().isIn(['PLANIFIE', 'ATTEINT', 'MANQUE']).withMessage('Status invalide')
];

// Routes
router.post('/', authenticate, validateCreateJalon, createJalon);
router.get('/', authenticate, getAllJalons);
router.get('/:id', authenticate, getJalonById);
router.put('/:id', authenticate, updateJalon);
router.delete('/:id', authenticate, deleteJalon);
router.patch('/:id/status', authenticate, updateJalonStatus);

module.exports = router;
