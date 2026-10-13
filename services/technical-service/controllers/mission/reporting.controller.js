// Calcul des statistiques de mission.
const { prisma, buildMissionScopeWhere } = require('./shared');

exports.getStats = async (req, res) => {
  try {
    const scopeWhere = buildMissionScopeWhere(req, req.query.enterpriseId, req.query.serviceId);
    const stats = await Promise.all([
      prisma.mission.count({ where: { ...scopeWhere, status: 'PLANIFIEE' } }),
      prisma.mission.count({ where: { ...scopeWhere, status: 'EN_COURS' } }),
      prisma.mission.count({ where: { ...scopeWhere, status: 'TERMINEE' } }),
      prisma.mission.count({ where: { ...scopeWhere, status: 'ANNULEE' } }),
      prisma.mission.count({ where: scopeWhere })
    ]);

    res.json({
      success: true,
      message: 'Statistiques des missions récupérées avec succès',
      data: {
        planifiees: stats[0],
        enCours: stats[1],
        terminees: stats[2],
        annulees: stats[3],
        total: stats[4]
      }
    });
  } catch (error) {
    console.error('Error in getStats missions:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques'
    });
  }
};
