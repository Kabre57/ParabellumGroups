const express = require('express');
const { body, query } = require('express-validator');
const adresseController = require('../controllers/adresse.controller');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

const ADDRESS_TYPES = ['FACTURATION', 'LIVRAISON', 'SIEGE_SOCIAL', 'ETABLISSEMENT', 'CORRESPONDANCE'];

const createValidation = [
  body('clientId').notEmpty().withMessage('Le clientId est requis'),
  body('typeAdresse').isIn(ADDRESS_TYPES).withMessage("Type d'adresse invalide"),
  body('nomAdresse').optional({ checkFalsy: true }).isString().trim().withMessage("Le nom de l'adresse est invalide"),
  body('ligne1').notEmpty().trim().withMessage('Le quartier est requis'),
  body('ligne2').optional({ checkFalsy: true }).isString().trim().withMessage('La rue ou residence est invalide'),
  body('ligne3').optional({ checkFalsy: true }).isString().trim().withMessage('Le repere visuel est invalide'),
  body('codePostal').optional({ checkFalsy: true }).isLength({ max: 20 }).withMessage('Boite postale invalide'),
  body('ville').notEmpty().trim().withMessage('La commune ou ville est requise'),
  body('region').optional({ checkFalsy: true }).isString().trim().withMessage('Le district est invalide'),
  body('pays').optional({ checkFalsy: true }).isString().trim().withMessage('Le pays doit etre une chaine de caracteres'),
  body('coordonneesGps').optional({ checkFalsy: true }).isString().trim().withMessage('Les coordonnees GPS sont invalides'),
  body('informationsAcces').optional({ checkFalsy: true }).isString().trim().withMessage("Les informations d'acces sont invalides"),
];

const updateValidation = [
  body('typeAdresse').optional().isIn(ADDRESS_TYPES).withMessage("Type d'adresse invalide"),
  body('nomAdresse').optional({ checkFalsy: true }).isString().trim().withMessage("Le nom de l'adresse est invalide"),
  body('ligne1').optional().notEmpty().trim().withMessage('Le quartier ne peut pas etre vide'),
  body('ligne2').optional({ checkFalsy: true }).isString().trim().withMessage('La rue ou residence est invalide'),
  body('ligne3').optional({ checkFalsy: true }).isString().trim().withMessage('Le repere visuel est invalide'),
  body('codePostal').optional({ checkFalsy: true }).isLength({ max: 20 }).withMessage('Boite postale invalide'),
  body('ville').optional().notEmpty().trim().withMessage('La commune ou ville ne peut pas etre vide'),
  body('region').optional({ checkFalsy: true }).isString().trim().withMessage('Le district est invalide'),
  body('pays').optional({ checkFalsy: true }).isString().trim().withMessage('Le pays est invalide'),
  body('coordonneesGps').optional({ checkFalsy: true }).isString().trim().withMessage('Les coordonnees GPS sont invalides'),
  body('informationsAcces').optional({ checkFalsy: true }).isString().trim().withMessage("Les informations d'acces sont invalides"),
];

const queryValidation = [
  query('clientId').notEmpty().withMessage('Le clientId est requis'),
  query('typeAdresse').optional().isIn(ADDRESS_TYPES).withMessage("Type d'adresse invalide"),
];

router.get('/', authMiddleware, queryValidation, adresseController.getAll);
router.post('/', authMiddleware, createValidation, adresseController.create);
router.get('/:id', authMiddleware, adresseController.getById);
router.put('/:id', authMiddleware, updateValidation, adresseController.update);
router.delete('/:id', authMiddleware, adresseController.delete);
router.patch('/:id/principal', authMiddleware, adresseController.setPrincipal);

module.exports = router;
