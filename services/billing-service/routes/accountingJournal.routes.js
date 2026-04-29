const express = require('express');
const controller = require('../controllers/accountingJournal.controller');

const router = express.Router();

router.get('/', controller.getAccountingJournals);
router.post('/', controller.createAccountingJournal);

module.exports = router;
