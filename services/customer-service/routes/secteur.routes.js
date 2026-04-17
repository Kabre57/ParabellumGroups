const express = require('express');
const { body, query } = require('express-validator');
const secteurController = require('../controllers/secteur.controller');
const { authMiddleware, requireManager } = require('../middleware/auth');

const router = express.Router();

const codeActiviteValidator = body('codeActivite')
  .optional()
  .matches(/^[A-Z0-9.\-/ ]{2,20}$/i)
  .withMessage("Format du code d'activite invalide");

const createValidation = [
  body('libelle').notEmpty().trim().withMessage('Le libelle est requis'),
  codeActiviteValidator,
  body('description').optional().isString().withMessage('La description doit etre une chaine de caracteres'),
  body('parentId').optional().isString().withMessage("L'ID parent doit etre une chaine de caracteres"),
];

const updateValidation = [
  body('libelle').optional().notEmpty().trim().withMessage('Le libelle ne peut pas etre vide'),
  codeActiviteValidator,
  body('description').optional().isString().withMessage('La description doit etre une chaine de caracteres'),
  body('parentId').optional().isString().withMessage("L'ID parent doit etre une chaine de caracteres"),
];

const queryValidation = [
  query('parentId').optional().isString().withMessage("L'ID parent doit etre une chaine de caracteres"),
  query('niveau').optional().isInt({ min: 1 }).withMessage('Le niveau doit etre un nombre positif'),
];

router.get('/', authMiddleware, queryValidation, secteurController.getAll);
router.get('/tree', authMiddleware, secteurController.getTree);
router.post('/', authMiddleware, requireManager, createValidation, secteurController.create);
router.get('/:id', authMiddleware, secteurController.getById);
router.put('/:id', authMiddleware, requireManager, updateValidation, secteurController.update);
router.delete('/:id', authMiddleware, requireManager, secteurController.delete);

module.exports = router;
