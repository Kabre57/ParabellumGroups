const express = require('express');
const controller = require('../controllers/accountingFamilyRule.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', controller.getFamilyRules);
router.put('/:family', controller.upsertFamilyRule);

module.exports = router;
