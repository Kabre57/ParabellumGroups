const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

/**
 * NB: Les prêts/emprunts ne sont pas encore implémentés côté HR.
 * Pour éviter les erreurs 404 côté front, on renvoie simplement une
 * liste vide avec une pagination cohérente.
 */
router.get('/', authMiddleware, (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  res.json({
    data: [],
    pagination: {
      total: 0,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: 0,
    },
  });
});

module.exports = router;
