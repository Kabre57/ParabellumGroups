// Consultation et recherche des ordres de mission.
const { prisma, ORDER_STATUSES, includeOrderRelations } = require('./shared');

exports.getAll = async (req, res) => {
  try {
    const {
      page = 1,
      limit,
      pageSize,
      missionId,
      interventionId,
      technicienId,
      status,
      search,
      dateFrom,
      dateTo,
    } = req.query;

    const effectiveLimit = parseInt(limit || pageSize || 20, 10);
    const where = {};

    if (missionId) where.missionId = missionId;
    if (interventionId) where.interventionId = interventionId;
    if (technicienId) where.technicienId = technicienId;
    if (status && ORDER_STATUSES.includes(status)) where.status = status;
    if (dateFrom || dateTo) {
      where.dateDepart = {};
      if (dateFrom) where.dateDepart.gte = new Date(dateFrom);
      if (dateTo) where.dateDepart.lte = new Date(dateTo);
    }
    if (search) {
      where.OR = [
        { numeroOrdre: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } },
        { objetMission: { contains: search, mode: 'insensitive' } },
        { mission: { is: { titre: { contains: search, mode: 'insensitive' } } } },
        { technicien: { is: { nom: { contains: search, mode: 'insensitive' } } } },
        { technicien: { is: { prenom: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * effectiveLimit;

    const [orders, total] = await Promise.all([
      prisma.ordreMission.findMany({
        where,
        skip,
        take: effectiveLimit,
        include: includeOrderRelations,
        orderBy: [{ dateDepart: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.ordreMission.count({ where }),
    ]);

    res.json({
      success: true,
      message: 'Ordres de mission recuperes avec succes',
      data: orders,
      page: parseInt(page, 10),
      limit: effectiveLimit,
      total,
      pages: Math.ceil(total / effectiveLimit),
    });
  } catch (error) {
    console.error('Error in getAll ordres mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recuperation des ordres de mission',
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.ordreMission.findUnique({
      where: { id },
      include: includeOrderRelations,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Ordre de mission non trouve',
      });
    }

    res.json({
      success: true,
      message: 'Ordre de mission recupere avec succes',
      data: order,
    });
  } catch (error) {
    console.error('Error in getById ordre mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la recuperation de l ordre de mission',
    });
  }
};
