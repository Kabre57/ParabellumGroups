// Regroupe les lectures et les indicateurs de facturation.
const { applyEnterpriseScope, assertEnterpriseInScope, fetchClientMeta, prisma } = require('./shared');

exports.getAllFactures = async (req, res) => {
  try {
    const { clientId, status, dateDebut, dateFin, search, query, enterpriseId } = req.query;

    const where = {};
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;
    const normalizedSearch = String(search || query || '').trim();
    if (normalizedSearch) {
      where.OR = [
        { numeroFacture: { contains: normalizedSearch, mode: 'insensitive' } },
        { notes: { contains: normalizedSearch, mode: 'insensitive' } },
        { clientId: { contains: normalizedSearch, mode: 'insensitive' } },
        { enterpriseName: { contains: normalizedSearch, mode: 'insensitive' } },
        { serviceName: { contains: normalizedSearch, mode: 'insensitive' } },
      ];
    }
    if (dateDebut || dateFin) {
      where.dateEmission = {};
      if (dateDebut) where.dateEmission.gte = new Date(dateDebut);
      if (dateFin) where.dateEmission.lte = new Date(dateFin);
    }

    const scopedWhere = await applyEnterpriseScope({
      req,
      where,
      requestedEnterpriseId: enterpriseId,
    });

    const factures = await prisma.facture.findMany({
      where: scopedWhere,
      include: {
        lignes: true,
        paiements: true,
        avoirs: true,
      },
      orderBy: { dateEmission: 'desc' },
    });

    const facturesWithClientMeta = await Promise.all(
      factures.map(async (facture) => {
        const clientMeta = await fetchClientMeta(req, facture.clientId);
        return {
          ...facture,
          client: {
            nom: clientMeta.clientName,
            email: clientMeta.clientEmail,
            telephone: clientMeta.clientPhone,
          },
        };
      })
    );

    res.json(facturesWithClientMeta);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Recupere une facture par ID
 */
exports.getFactureById = async (req, res) => {
  try {
    const { id } = req.params;

    const facture = await prisma.facture.findUnique({
      where: { id },
      include: {
        lignes: true,
        paiements: true,
        avoirs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!facture) {
      return res.status(404).json({ error: 'Facture non trouvee' });
    }

    await assertEnterpriseInScope(req, facture.enterpriseId, "Vous n'avez pas acces a cette facture.");

    const clientMeta = await fetchClientMeta(req, facture.clientId);

    res.json({
      ...facture,
      client: {
        nom: clientMeta.clientName,
        email: clientMeta.clientEmail,
        telephone: clientMeta.clientPhone,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Cree une nouvelle facture
 */

exports.getStats = async (req, res) => {
  try {
    const { dateDebut, dateFin, enterpriseId } = req.query;

    const where = {};
    if (dateDebut || dateFin) {
      where.dateEmission = {};
      if (dateDebut) where.dateEmission.gte = new Date(dateDebut);
      if (dateFin) where.dateEmission.lte = new Date(dateFin);
    }

    const factures = await prisma.facture.findMany({
      where: await applyEnterpriseScope({
        req,
        where,
        requestedEnterpriseId: enterpriseId,
      }),
    });

    const chiffreAffaires = factures
      .filter((f) => !['ANNULEE'].includes(f.status))
      .reduce((sum, f) => sum + f.montantTTC, 0);
    const montantEnAttente = factures
      .filter((f) => ['BROUILLON', 'EMISE', 'EN_RETARD', 'PARTIELLEMENT_PAYEE'].includes(f.status))
      .reduce((sum, f) => sum + f.montantTTC, 0);
    const montantEnRetard = factures
      .filter((f) => f.status === 'EN_RETARD')
      .reduce((sum, f) => sum + f.montantTTC, 0);

    res.json({
      success: true,
      data: {
        totalFactures: factures.length,
        chiffreAffaires,
        montantEnAttente,
        montantEnRetard,
        facturesPayees: factures.filter((f) => f.status === 'PAYEE').length,
        facturesEnRetard: factures.filter((f) => f.status === 'EN_RETARD').length,
        brouillon: factures.filter((f) => f.status === 'BROUILLON').length,
        emises: factures.filter((f) => f.status === 'EMISE').length,
        annulees: factures.filter((f) => f.status === 'ANNULEE').length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Recupere les factures en retard
 */
exports.getRetards = async (req, res) => {
  try {
    const today = new Date();
    const scopedWhere = await applyEnterpriseScope({
      req,
      where: {
        status: { in: ['EMISE', 'EN_RETARD'] },
        dateEcheance: {
          lt: today,
        },
      },
    });

    const factures = await prisma.facture.findMany({
      where: scopedWhere,
      include: {
        lignes: true,
        paiements: true,
      },
      orderBy: { dateEcheance: 'asc' },
    });

    for (const facture of factures) {
      if (facture.status === 'EMISE') {
        await prisma.facture.update({
          where: { id: facture.id },
          data: { status: 'EN_RETARD' },
        });
      }
    }

    res.json(factures);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Genere le PDF d'une facture
 */
