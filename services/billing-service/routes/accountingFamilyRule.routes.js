const express = require('express');
const controller = require('../controllers/accountingFamilyRule.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', controller.getFamilyRules);
router.post('/:family', controller.addFamilyRule);
router.patch('/item/:ruleId', controller.updateFamilyRule);
router.delete('/item/:ruleId', controller.deleteFamilyRule);

module.exports = router;
