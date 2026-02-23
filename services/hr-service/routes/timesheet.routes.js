const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

/**
 * Stub pour les feuilles de temps.
 * À remplacer par une vraie implémentation lorsque le module sera prêt.
 */
router.get('/', authMiddleware, (req, res) => {
  const { page = 1, pageSize = 10, query = '' } = req.query;
  res.json({
    data: [],
    pagination: {
      total: 0,
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      totalPages: 0,
      query,
    },
  });
});

module.exports = router;
