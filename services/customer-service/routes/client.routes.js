const express = require('express');
const { body, query } = require('express-validator');
const clientController = require('../controllers/client.controller');
const { authMiddleware, requireManager } = require('../middleware/auth');

const router = express.Router();

const isGenericPhone = (value) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return /^[+\d][\d\s().-]{5,}$/.test(trimmed);
};

const isIdu = (value) => /^CI-\d{4}-[A-Z0-9]{6,12}$/i.test(value.trim());
const isAlphanumericId = (value) => /^[A-Z0-9/-]{6,30}$/i.test(value.trim());
const isCodeActivite = (value) => value.trim().length <= 100;

// Validation rules
const createValidation = [
  body('nom').notEmpty().trim().withMessage('Le nom est requis'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('typeClientId').notEmpty().withMessage('Le type de client est requis'),
  body('telephone').optional({ checkFalsy: true }).custom(isGenericPhone).withMessage('Numero de telephone invalide'),
  body('mobile').optional({ checkFalsy: true }).custom(isGenericPhone).withMessage('Numero de mobile invalide'),
  body('fax').optional({ checkFalsy: true }).custom(isGenericPhone).withMessage('Numero de fax invalide'),
  body('idu').optional({ checkFalsy: true }).custom(isIdu).withMessage('IDU invalide (format attendu: CI-YYYY-XXXXXXXK)'),
  body('ncc').optional({ checkFalsy: true }).custom(isAlphanumericId).withMessage('NCC invalide'),
  body('rccm').optional({ checkFalsy: true }).custom(isAlphanumericId).withMessage('RCCM invalide'),
  body('codeActivite').optional({ checkFalsy: true }).custom(isCodeActivite).withMessage("Code d'activite invalide"),
];

const updateValidation = [
  body('nom').optional().notEmpty().trim().withMessage('Le nom ne peut pas etre vide'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Email invalide'),
  body('typeClientId').optional().notEmpty().withMessage('Le type de client est requis'),
  body('telephone').optional({ checkFalsy: true }).custom(isGenericPhone).withMessage('Numero de telephone invalide'),
  body('mobile').optional({ checkFalsy: true }).custom(isGenericPhone).withMessage('Numero de mobile invalide'),
  body('fax').optional({ checkFalsy: true }).custom(isGenericPhone).withMessage('Numero de fax invalide'),
  body('idu').optional({ checkFalsy: true }).custom(isIdu).withMessage('IDU invalide (format attendu: CI-YYYY-XXXXXXXK)'),
  body('ncc').optional({ checkFalsy: true }).custom(isAlphanumericId).withMessage('NCC invalide'),
  body('rccm').optional({ checkFalsy: true }).custom(isAlphanumericId).withMessage('RCCM invalide'),
  body('codeActivite').optional({ checkFalsy: true }).custom(isCodeActivite).withMessage("Code d'activite invalide"),
];

const statusValidation = [
  body('status').isIn(['PROSPECT', 'ACTIF', 'INACTIF', 'SUSPENDU', 'ARCHIVE', 'LEAD_CHAUD', 'LEAD_FROID']).withMessage('Status invalide'),
  body('raison').optional().isString().withMessage('La raison doit etre une chaine de caracteres'),
];

const priorityValidation = [
  body('priorite').isIn(['BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE']).withMessage('Priorite invalide'),
  body('raison').optional().isString().withMessage('La raison doit etre une chaine de caracteres'),
];

// Query validation
const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('La page doit etre un nombre positif'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('La limite doit etre entre 1 et 100'),
  query('status').optional().isIn(['PROSPECT', 'ACTIF', 'INACTIF', 'SUSPENDU', 'ARCHIVE', 'LEAD_CHAUD', 'LEAD_FROID']).withMessage('Status invalide'),
  query('priorite').optional().isIn(['BASSE', 'MOYENNE', 'HAUTE', 'CRITIQUE']).withMessage('Priorite invalide'),
  query('sortBy').optional().isIn(['nom', 'createdAt', 'updatedAt', 'scoreFidelite', 'chiffreAffaireAnnuel']).withMessage('Champ de tri invalide'),
  query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('Ordre de tri invalide'),
];

// Routes
router.get('/', authMiddleware, queryValidation, clientController.getAll);
router.post('/', authMiddleware, requireManager, createValidation, clientController.create);
router.get('/search', authMiddleware, clientController.search);
router.get('/stats', authMiddleware, clientController.getStats);
router.get('/:id', authMiddleware, clientController.getById);
router.put('/:id', authMiddleware, updateValidation, clientController.update);
router.patch('/:id/status', authMiddleware, statusValidation, clientController.updateStatus);
router.patch('/:id/priority', authMiddleware, priorityValidation, clientController.updatePriority);
router.delete('/:id/archive', authMiddleware, requireManager, clientController.archive);

module.exports = router;
