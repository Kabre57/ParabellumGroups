const express = require('express');
const controller = require('../controllers/accountingClosing.controller');

const router = express.Router();

router.get('/', controller.getClosings);
router.post('/', controller.createClosing);

module.exports = router;
