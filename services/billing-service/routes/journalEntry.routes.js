const express = require('express');
const journalEntryController = require('../controllers/journalEntry.controller');

const router = express.Router();

router.get('/', journalEntryController.getAllJournalEntries);
router.post('/', journalEntryController.createJournalEntry);

module.exports = router;
