const express = require('express');
const router = express.Router();
const kpiController = require('../controllers/kpi.controller');
const auth = require('../middleware/auth');

router.post('/', auth, kpiController.createKPI);
router.get('/', auth, kpiController.getAllKPIs);
router.get('/:id', auth, kpiController.getKPIById);
router.put('/:id', auth, kpiController.updateKPI);
router.delete('/:id', auth, kpiController.deleteKPI);
router.post('/calculate', auth, kpiController.calculate);
router.get('/:id/compare', auth, kpiController.compare);
router.get('/trend', auth, kpiController.getTrend);

module.exports = router;
