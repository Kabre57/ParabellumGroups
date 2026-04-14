const express = require('express');
const router = express.Router();
const employeController = require('../controllers/employe.controller');
const { body, validationResult } = require('express-validator');

// Middleware de validation basique
const validateEmploye = [
    body('matricule').notEmpty().withMessage('Le matricule est requis'),
    body('nom').notEmpty().withMessage('Le nom est requis'),
    body('prenoms').notEmpty().withMessage('Les prénoms sont requis'),
    (req, res, next) => {
        const errors = validationResult(req);
        if(!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        next();
    }
];

router.get('/', employeController.getAllEmployes);
router.post('/', validateEmploye, employeController.createEmploye);
router.get('/:id', employeController.getEmploye);
router.get('/:id/profile', employeController.getEmployeProfile);
router.put('/:id', employeController.updateEmploye);
router.delete('/:id', employeController.deleteEmploye);

// Route spécifique
router.get('/:matricule/contrats', employeController.getEmployeContrats);

module.exports = router;
