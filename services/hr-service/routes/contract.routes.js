const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contract.controller');
const { authenticateUser } = require('../../shared/middleware/auth');
const { body, validationResult } = require('express-validator');

const validateContrat = [
    body('matricule').notEmpty().withMessage('Le matricule de l\'employé est requis'),
    body('typeContrat').notEmpty().withMessage('Le type de contrat est requis'),
    body('salaireBaseMensuel').isNumeric().withMessage('Le salaire de base doit être un nombre'),
    (req, res, next) => {
        const errors = validationResult(req);
        if(!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        next();
    }
];

router.use(authenticateUser);

router.get('/', contractController.getAllContrats);
router.post('/', validateContrat, contractController.createContrat);
router.get('/:id', contractController.getContrat);
router.put('/:id', contractController.updateContrat);
router.delete('/:id', contractController.deleteContrat);

// Route spécifique
router.post('/:id/rupture', contractController.rompreContrat);

module.exports = router;
