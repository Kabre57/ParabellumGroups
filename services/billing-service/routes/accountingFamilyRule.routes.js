const express = require('express');
const controller = require('../controllers/accountingFamilyRule.controller');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', controller.getFamilyRules);
router.get('/diagnostic', controller.getFamilyRulesDiagnostic);
router.post('/', controller.createFamily);
router.patch('/item/:ruleId', controller.updateFamilyRule);
router.delete('/item/:ruleId', controller.deleteFamilyRule);
router.post('/:family/accounts', controller.addFamilyRule);
router.post('/:family', controller.addFamilyRule);
router.patch('/:family', controller.updateFamily);
router.delete('/:family', controller.deleteFamily);

module.exports = router;
