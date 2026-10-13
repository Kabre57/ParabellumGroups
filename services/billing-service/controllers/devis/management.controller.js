// Création, mise à jour et suppression des devis.
const { calculateTotal, resolveEnterpriseContext, prisma, QUOTE_READ_INCLUDE, normalizeText, buildBillingLine, normalizeLines, buildTotals, getDefaultDate, fetchProspect, createClientFromProspect, createQuoteEvent, getNextDevisNumber, updateQuoteLines, getScopedQuoteOrThrow } = require('../../services/devis');

exports.createDevis = async (req, res) => {
  try {
    const clientId = normalizeText(req.body.clientId);
    const prospectId = normalizeText(req.body.prospectId);
    const lignesData = normalizeLines(req.body.lignes);

    if (!clientId && !prospectId) {
      return res.status(400).json({ error: 'clientId ou prospectId est requis' });
    }

    if (lignesData.length === 0) {
      return res.status(400).json({ error: 'Le devis doit contenir au moins une ligne' });
    }

    const totaux = buildTotals(lignesData);

    const commercialId = normalizeText(req.body.commercialId) || normalizeText(req.user?.id) || null;
    const commercialName =
      normalizeText(req.body.commercialName) ||
      [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ') ||
      null;
    const commercialEmail = normalizeText(req.body.commercialEmail) || normalizeText(req.user?.email) || null;
    const opportuniteId = normalizeText(req.body.opportuniteId);
    const enterprise = await resolveEnterpriseContext(req, req.body.enterpriseId);

    let resolvedClientId = clientId;
    let resolvedProspectId = prospectId;

    if (!resolvedClientId && resolvedProspectId) {
      const prospect = await fetchProspect(req, resolvedProspectId);
      if (!prospect) {
        return res.status(404).json({ error: 'Prospect introuvable' });
      }
      if (!prospect.email) {
        return res.status(400).json({ error: 'Un email est requis pour convertir le prospect en client' });
      }
      const createdClient = await createClientFromProspect(req, prospect, {
        prospectId: resolvedProspectId,
        commercialId,
      });
      if (!createdClient?.id) {
        return res.status(400).json({ error: 'Impossible de créer le client à partir du prospect' });
      }
      resolvedClientId = createdClient.id;
    }

    const devis = await prisma.$transaction(async (tx) => {
      const numeroDevis = await getNextDevisNumber(tx);

      const created = await tx.devis.create({
        data: {
          numeroDevis,
          clientId: resolvedClientId,
          enterpriseId: enterprise.enterpriseId,
          enterpriseName: enterprise.enterpriseName,
          objet: normalizeText(req.body.objet),
          notes: normalizeText(req.body.notes),
          modeLivraison: normalizeText(req.body.modeLivraison),
          modalitePaiement: normalizeText(req.body.modalitePaiement),
          dateValidite: getDefaultDate(req.body.dateValidite),
          montantHT: totaux.totalHT,
          montantTVA: totaux.totalTVA,
          montantTTC: totaux.totalTTC,
          serviceId: null,
          serviceName: null,
          serviceLogoUrl: null,
          commercialId,
          commercialName,
          commercialEmail,
          prospectId: resolvedProspectId,
          opportuniteId,
          lignes: {
            create: lignesData,
          },
        },
        include: QUOTE_READ_INCLUDE,
      });

      await createQuoteEvent(tx, created.id, 'CREATED', req, 'Devis client cree');
      return created;
    });

    res.status(201).json({ success: true, data: devis });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateDevis = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await getScopedQuoteOrThrow(req, id, { include: { lignes: true } });

    if (current.status === 'FACTURE') {
      return res.status(400).json({ error: 'Un devis facture ne peut plus etre modifie' });
    }

    const lignesData = req.body.lignes ? normalizeLines(req.body.lignes) : null;
    if (Array.isArray(req.body.lignes) && lignesData.length === 0) {
      return res.status(400).json({ error: 'Le devis doit contenir au moins une ligne valide' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (lignesData) {
        await updateQuoteLines(tx, id, lignesData);
      }

      const totaux = lignesData ? buildTotals(lignesData) : buildTotals(current.lignes);
      const enterprise =
        req.body.enterpriseId !== undefined
          ? await resolveEnterpriseContext(req, req.body.enterpriseId)
          : {
              enterpriseId: current.enterpriseId || null,
              enterpriseName: current.enterpriseName || null,
            };
      const nextStatus =
        req.body.status && req.body.status !== current.status && current.status === 'ACCEPTE'
          ? current.status
          : req.body.status;

      const devis = await tx.devis.update({
        where: { id },
        data: {
          clientId: normalizeText(req.body.clientId) || current.clientId,
          objet: req.body.objet !== undefined ? normalizeText(req.body.objet) : undefined,
          notes: req.body.notes !== undefined ? normalizeText(req.body.notes) : undefined,
          modeLivraison: req.body.modeLivraison !== undefined ? normalizeText(req.body.modeLivraison) : undefined,
          modalitePaiement: req.body.modalitePaiement !== undefined ? normalizeText(req.body.modalitePaiement) : undefined,
          dateValidite: req.body.dateValidite ? new Date(req.body.dateValidite) : undefined,
          status: nextStatus || undefined,
          montantHT: totaux.totalHT,
          montantTVA: totaux.totalTVA,
          montantTTC: totaux.totalTTC,
          enterpriseId: enterprise.enterpriseId,
          enterpriseName: enterprise.enterpriseName,
          serviceId: null,
          serviceName: null,
          serviceLogoUrl: null,
          commercialId: normalizeText(req.body.commercialId) ?? undefined,
          commercialName: normalizeText(req.body.commercialName) ?? undefined,
          commercialEmail: normalizeText(req.body.commercialEmail) ?? undefined,
          prospectId: normalizeText(req.body.prospectId) ?? undefined,
          opportuniteId: normalizeText(req.body.opportuniteId) ?? undefined,
        },
        include: QUOTE_READ_INCLUDE,
      });

      await createQuoteEvent(tx, id, 'UPDATED', req, 'Devis client modifie', {
        linesUpdated: Boolean(lignesData),
        status: devis.status,
      });

      return devis;
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.deleteDevis = async (req, res) => {
  try {
    const { id } = req.params;
    const devis = await getScopedQuoteOrThrow(req, id, {
      select: { id: true, status: true, enterpriseId: true },
    });

    if (['TRANSMIS_FACTURATION', 'FACTURE'].includes(devis.status)) {
      return res.status(400).json({ error: 'Impossible de supprimer un devis deja transmis ou facture' });
    }

    await prisma.devis.delete({ where: { id } });
    res.json({ success: true, message: 'Devis supprime avec succes' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.addLigne = async (req, res) => {
  try {
    const { id } = req.params;
    await getScopedQuoteOrThrow(req, id, { select: { id: true, enterpriseId: true } });
    const ligneData = buildBillingLine(req.body);

    await prisma.$transaction(async (tx) => {
      await tx.ligneDevis.create({
        data: {
          devisId: id,
          ...ligneData,
        },
      });

      const lignes = await tx.ligneDevis.findMany({ where: { devisId: id } });
      const totaux = calculateTotal(lignes);

      await tx.devis.update({
        where: { id },
        data: {
          montantHT: totaux.totalHT,
          montantTVA: totaux.totalTVA,
          montantTTC: totaux.totalTTC,
        },
      });

      await createQuoteEvent(tx, id, 'LINE_ADDED', req, 'Nouvelle ligne ajoutee au devis');
    });

    const devis = await getScopedQuoteOrThrow(req, id);
    res.status(201).json({ success: true, data: devis });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};
