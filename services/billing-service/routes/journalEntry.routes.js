const express = require('express');
const journalEntryController = require('../controllers/journalEntry.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', journalEntryController.getAllJournalEntries);
router.post('/', journalEntryController.createJournalEntry);

module.exports = router;
