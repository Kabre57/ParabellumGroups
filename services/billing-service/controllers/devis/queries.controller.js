// Lecture et recherche des devis.
const { applyEnterpriseScope, prisma, getScopedQuoteOrThrow } = require('../../services/devis');

exports.getAllDevis = async (req, res) => {
  try {
    const { clientId, status, dateDebut, dateFin, search, limit, page, enterpriseId } = req.query;
    let where = {};

    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { numeroDevis: { contains: search, mode: 'insensitive' } },
        { objet: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { clientId: { contains: search, mode: 'insensitive' } },
        { enterpriseName: { contains: search, mode: 'insensitive' } },
        { serviceName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (dateDebut || dateFin) {
      where.dateEmission = {};
      if (dateDebut) where.dateEmission.gte = new Date(dateDebut);
      if (dateFin) where.dateEmission.lte = new Date(dateFin);
    }

    const take = Math.min(Math.max(Number(limit) || 200, 1), 500);
    const currentPage = Math.max(Number(page) || 1, 1);
    const skip = (currentPage - 1) * take;
    where = await applyEnterpriseScope({
      req,
      where,
      requestedEnterpriseId: enterpriseId,
    });

    const [items, total] = await Promise.all([
      prisma.devis.findMany({
        where,
        include: { lignes: true },
        orderBy: { dateEmission: 'desc' },
        take,
        skip,
      }),
      prisma.devis.count({ where }),
    ]);

    res.json({
      success: true,
      data: items,
      meta: {
        pagination: {
          total,
          page: currentPage,
          limit: take,
          totalPages: Math.max(1, Math.ceil(total / take)),
        },
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.getDevisById = async (req, res) => {
  try {
    const devis = await getScopedQuoteOrThrow(req, req.params.id);
    res.json({ success: true, data: devis });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};
