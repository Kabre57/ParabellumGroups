const express = require('express');
const { body } = require('express-validator');
const demandeAchatController = require('../controllers/demandeAchat.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const validateQuote = [
  body('titre')
    .optional()
    .isString()
    .withMessage('Le titre doit etre une chaine de caracteres'),
  body('objet')
    .optional()
    .isString()
    .withMessage('L objet doit etre une chaine de caracteres'),
  body('fournisseurId')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('Le fournisseur est invalide'),
  body('devise')
    .optional()
    .isString()
    .isLength({ min: 3, max: 3 })
    .withMessage('La devise doit etre un code ISO sur 3 caracteres'),
  body('lignes')
    .optional()
    .isArray()
    .withMessage('Les lignes doivent etre un tableau'),
  body('lignes.*.designation')
    .optional()
    .isString()
    .withMessage('La designation de ligne est invalide'),
  body('lignes.*.quantite')
    .optional()
    .isFloat({ gt: 0 })
    .withMessage('La quantite doit etre strictement positive'),
  body('lignes.*.prixUnitaire')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Le prix unitaire doit etre positif ou nul'),
  body('lignes.*.tva')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('La TVA doit etre comprise entre 0 et 100'),
];

router.use(authMiddleware);

router.get('/', demandeAchatController.getAll);
router.post('/', validateQuote, demandeAchatController.create);
router.get('/stats', demandeAchatController.getStats);
router.get('/:id', demandeAchatController.getById);
router.get('/:id/approval-history', demandeAchatController.getApprovalHistory);
router.put('/:id', validateQuote, demandeAchatController.update);
router.post('/:id/submit', demandeAchatController.submit);
router.post('/:id/approve', demandeAchatController.approve);
router.post('/:id/reject', demandeAchatController.reject);

// Legacy compatibility
router.patch('/:id/approve', demandeAchatController.approve);
router.patch('/:id/reject', demandeAchatController.reject);

router.delete('/:id', demandeAchatController.delete);

module.exports = router;
