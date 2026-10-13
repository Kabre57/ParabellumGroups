// Gère la création, la modification et les lignes de facture.
const { assertEnterpriseInScope, buildBillingLine, buildTotals, calculateTotal, getDefaultDate, getNextFactureNumber, normalizeLines, prisma, resolveEnterpriseContext } = require('./shared');

exports.createFacture = async (req, res) => {
  try {
    const { clientId, notes } = req.body;
    const lignesData = normalizeLines(req.body.lignes);
    const totaux = buildTotals(lignesData);
    const enterprise = await resolveEnterpriseContext(req, req.body.enterpriseId);
    const numeroFacture = await getNextFactureNumber(prisma);

    const facture = await prisma.facture.create({
      data: {
        numeroFacture,
        clientId,
        enterpriseId: enterprise.enterpriseId,
        enterpriseName: enterprise.enterpriseName,
        dateEcheance: getDefaultDate(req.body.dateEcheance, 30),
        montantHT: totaux.totalHT,
        montantTVA: totaux.totalTVA,
        montantTTC: totaux.totalTTC,
        notes,
        serviceId: null,
        serviceName: null,
        serviceLogoUrl: null,
        lignes: lignesData.length
          ? {
              create: lignesData,
            }
          : undefined,
      },
      include: {
        lignes: true,
        paiements: true,
      },
    });

    res.status(201).json(facture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Met a jour une facture
 */
exports.updateFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const { clientId, dateEcheance, status, notes } = req.body;
    const existingFacture = await prisma.facture.findUnique({
      where: { id },
      select: {
        id: true,
        enterpriseId: true,
      },
    });

    if (!existingFacture) {
      return res.status(404).json({ error: 'Facture non trouvee' });
    }

    await assertEnterpriseInScope(req, existingFacture.enterpriseId, "Vous n'avez pas acces a cette facture.");

    const enterprise =
      req.body.enterpriseId !== undefined
        ? await resolveEnterpriseContext(req, req.body.enterpriseId)
        : {
            enterpriseId: existingFacture.enterpriseId || null,
            enterpriseName: undefined,
          };

    const facture = await prisma.facture.update({
      where: { id },
      data: {
        clientId,
        enterpriseId: enterprise.enterpriseId,
        ...(enterprise.enterpriseName !== undefined ? { enterpriseName: enterprise.enterpriseName } : {}),
        dateEcheance: dateEcheance ? new Date(dateEcheance) : undefined,
        status,
        notes,
      },
      include: {
        lignes: true,
        paiements: true,
      },
    });

    res.json(facture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Supprime une facture
 */
exports.deleteFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const existingFacture = await prisma.facture.findUnique({
      where: { id },
      select: {
        id: true,
        enterpriseId: true,
      },
    });

    if (!existingFacture) {
      return res.status(404).json({ error: 'Facture non trouvee' });
    }

    await assertEnterpriseInScope(req, existingFacture.enterpriseId, "Vous n'avez pas acces a cette facture.");

    await prisma.facture.delete({
      where: { id },
    });

    res.json({ message: 'Facture supprimee avec succes' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Ajoute une ligne a une facture
 */
exports.addLigne = async (req, res) => {
  try {
    const { id } = req.params;
    const ligneData = buildBillingLine(req.body);
    const factureBeforeUpdate = await prisma.facture.findUnique({
      where: { id },
      select: {
        id: true,
        enterpriseId: true,
      },
    });

    if (!factureBeforeUpdate) {
      return res.status(404).json({ error: 'Facture non trouvee' });
    }

    await assertEnterpriseInScope(req, factureBeforeUpdate.enterpriseId, "Vous n'avez pas acces a cette facture.");

    await prisma.ligneFacture.create({
      data: {
        factureId: id,
        ...ligneData,
      },
    });

    const lignes = await prisma.ligneFacture.findMany({
      where: { factureId: id },
    });

    const totaux = calculateTotal(lignes);

    const facture = await prisma.facture.update({
      where: { id },
      data: {
        montantHT: totaux.totalHT,
        montantTVA: totaux.totalTVA,
        montantTTC: totaux.totalTTC,
      },
      include: {
        lignes: true,
        paiements: true,
      },
    });

    res.status(201).json(facture);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Envoie une facture (change le statut a EMISE)
 */
