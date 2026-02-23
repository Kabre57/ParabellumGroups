const express = require('express');
const router = express.Router();
const contractController = require('../controllers/contract.controller');

router.get('/', contractController.getAllContracts.bind(contractController));
router.get('/:id', contractController.getContract.bind(contractController));
router.get('/:id/pdf', contractController.getContractPdf.bind(contractController));
router.post('/', contractController.createContract.bind(contractController));
router.patch('/:id', contractController.updateContract.bind(contractController));
router.delete('/:id', contractController.deleteContract.bind(contractController));

module.exports = router;
