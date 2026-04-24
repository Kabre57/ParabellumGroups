const express = require('express');
const router = express.Router();
const congeController = require('../controllers/conge.controller');
const { authenticateUser } = require('../middleware/auth.middleware');
const { body, validationResult } = require('express-validator');

const validateConge = [
    body('matricule').notEmpty().withMessage('Le matricule est requis'),
    body('dateDebut').isISO8601().toDate().withMessage('La date de début est requise'),
    body('dateFin').isISO8601().toDate().withMessage('La date de fin est requise'),
    (req, res, next) => {
        const errors = validationResult(req);
        if(!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        next();
    }
];

router.use(authenticateUser);

router.get('/calendrier', congeController.getCalendrier);
router.get('/solde/:employeId', congeController.getSolde);
router.get('/', congeController.getAllConges);
router.post('/', validateConge, congeController.createConge);
router.put('/:id', congeController.updateConge);
router.patch('/:id', congeController.updateConge);
router.patch('/:id/approve', congeController.approuverConge);
router.patch('/:id/reject', congeController.refuserConge);
router.get('/:id', congeController.getConge);
router.delete('/:id', congeController.deleteConge);

// Route spécifique
router.put('/:id/approuver', congeController.approuverConge);

module.exports = router;
