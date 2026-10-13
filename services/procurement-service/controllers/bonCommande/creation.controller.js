// Creation des commandes depuis les demandes et proformas.
const { prisma, validationResult, generateBonCommandeNumber, serializeOrder, fetchServiceMeta, enqueueProcurementEvent, getCorrelationId, withEnterpriseContext, purchaseOrderCreatedPayload, purchaseOrderStatusChangedPayload, buildLignePayload } = require('./shared');

exports.create = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      demandeAchatId,
      fournisseurId,
      dateCommande,
      dateLivraison,
      montantTotal,
      status,
      lignes = [],
    } = req.body;

    let sourceDemande = null;
    if (demandeAchatId) {
      sourceDemande = await prisma.demandeAchat.findUnique({
        where: { id: demandeAchatId },
        select: {
          id: true,
          serviceId: true,
          serviceName: true,
        },
      });
    }

    const serviceMeta =
      req.user?.serviceId && !sourceDemande?.serviceName
        ? await fetchServiceMeta(req, req.user.serviceId, req.user?.serviceName || null)
        : { serviceName: sourceDemande?.serviceName || req.user?.serviceName || null };

    // Generate unique numero bon
    const numeroBon = await generateBonCommandeNumber(prisma);

    const lignesData = Array.isArray(lignes)
      ? lignes.filter((l) => l.designation && l.quantite && l.prixUnitaire).map(buildLignePayload)
      : [];

    const totalTTC =
      lignesData.length > 0
        ? lignesData.reduce((sum, l) => sum + l.montantTTC, 0)
        : montantTotal || 0;

    const bon = await prisma.$transaction(async (tx) => {
      const created = await tx.bonCommande.create({
        data: {
          numeroBon,
          demandeAchatId,
          fournisseurId,
          serviceId: sourceDemande?.serviceId ?? req.user?.serviceId ?? null,
          serviceName: sourceDemande?.serviceName || serviceMeta.serviceName,
          dateCommande: dateCommande ? new Date(dateCommande) : new Date(),
          dateLivraison: dateLivraison ? new Date(dateLivraison) : null,
          montantHT: lignesData.reduce((sum, ligne) => sum + ligne.montantHT, 0),
          montantTVA: lignesData.reduce((sum, ligne) => sum + (ligne.montantTTC - ligne.montantHT), 0),
          montantTotal: totalTTC,
          status: status || 'BROUILLON',
          ...(lignesData.length
            ? {
                lignes: {
                  createMany: {
                    data: lignesData,
                  },
                },
              }
            : {}),
        },
        include: {
          fournisseur: true,
          proforma: {
            select: {
              id: true,
              numeroProforma: true,
            },
          },
          demandeAchat: true,
          lignes: true,
        },
      });

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_order.created',
        aggregateType: 'PURCHASE_ORDER',
        aggregateId: created.id,
        correlationId: getCorrelationId(req),
        payload: withEnterpriseContext(req, purchaseOrderCreatedPayload(serializeOrder(created))),
      });

      return created;
    });

    res.status(201).json({
      success: true,
      data: serializeOrder(bon),
    });
  } catch (error) {
    console.error('Error creating bon commande:', error);
    res.status(500).json({ error: 'Erreur lors de la création du bon de commande' });
  }
};

// Create bon commande from retained proforma

exports.createFromProforma = async (req, res) => {
  try {
    const { proformaId, status } = req.body;
    if (!proformaId) {
      return res.status(400).json({ error: 'proformaId est requis' });
    }

    const proforma = await prisma.proforma.findUnique({
      where: { id: String(proformaId) },
      include: {
        lignes: true,
        demandeAchat: true,
        fournisseur: true,
        bonCommande: true,
      },
    });

    if (!proforma) {
      return res.status(404).json({ error: 'Proforma introuvable' });
    }

    if (proforma.bonCommande) {
      return res.status(409).json({
        error: 'Un bon de commande existe déjà pour cette proforma',
        data: serializeOrder(proforma.bonCommande),
      });
    }

    if (!proforma.selectedForOrder && proforma.status !== 'APPROUVEE') {
      return res.status(400).json({
        error: 'La proforma doit être retenue et validée pour générer un bon de commande',
      });
    }

    const numeroBon = await generateBonCommandeNumber(prisma);

    const lignesData = Array.isArray(proforma.lignes)
      ? proforma.lignes.map((ligne) =>
          buildLignePayload({
            articleId: ligne.articleId,
            referenceArticle: ligne.referenceArticle,
            designation: ligne.designation,
            categorie: ligne.categorie,
            unite: ligne.unite,
            quantite: ligne.quantite,
            prixUnitaire: ligne.prixUnitaire,
            tva: ligne.tva,
          })
        )
      : [];

    const montantHT = lignesData.reduce((sum, ligne) => sum + ligne.montantHT, 0);
    const montantTVA = lignesData.reduce((sum, ligne) => sum + (ligne.montantTTC - ligne.montantHT), 0);
    const montantTotal = lignesData.reduce((sum, ligne) => sum + ligne.montantTTC, 0);

    const serviceMeta =
      proforma.demandeAchat?.serviceId && !proforma.demandeAchat?.serviceName
        ? await fetchServiceMeta(req, proforma.demandeAchat.serviceId, proforma.demandeAchat?.serviceName || null)
        : { serviceName: proforma.demandeAchat?.serviceName || req.user?.serviceName || null };

    const bon = await prisma.$transaction(async (tx) => {
      const created = await tx.bonCommande.create({
        data: {
          numeroBon,
          demandeAchatId: proforma.demandeAchatId,
          proformaId: proforma.id,
          fournisseurId: proforma.fournisseurId,
          serviceId: proforma.demandeAchat?.serviceId ?? req.user?.serviceId ?? null,
          serviceName: proforma.demandeAchat?.serviceName || serviceMeta.serviceName,
          dateCommande: new Date(),
          montantHT,
          montantTVA,
          montantTotal,
          status: status || 'BROUILLON',
          createdFromApproval: true,
          ...(lignesData.length
            ? {
                lignes: {
                  createMany: {
                    data: lignesData,
                  },
                },
              }
            : {}),
        },
        include: {
          fournisseur: true,
          proforma: {
            select: {
              id: true,
              numeroProforma: true,
            },
          },
          demandeAchat: true,
          lignes: true,
        },
      });

      await tx.proforma.update({
        where: { id: proforma.id },
        data: {
          selectedForOrder: true,
        },
      });

      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_order.created',
        aggregateType: 'PURCHASE_ORDER',
        aggregateId: created.id,
        correlationId: getCorrelationId(req),
        payload: withEnterpriseContext(req, purchaseOrderCreatedPayload(serializeOrder(created))),
      });

      return created;
    });

    res.status(201).json({
      success: true,
      data: serializeOrder(bon),
    });
  } catch (error) {
    console.error('Error creating bon commande from proforma:', error);
    res.status(500).json({ error: 'Erreur lors de la création du bon de commande' });
  }
};

// Get bon commande by ID

exports.addLigne = async (req, res) => {
  try {
    const { id } = req.params;
    const { designation, quantite, prixUnitaire, tva = 0, unite } = req.body;

    if (!designation || !quantite || !prixUnitaire) {
      return res.status(400).json({ error: 'designation, quantite et prixUnitaire sont requis' });
    }

    const payload = buildLignePayload({ designation, quantite, prixUnitaire, tva, unite });

    const ligne = await prisma.ligneCommande.create({
      data: {
        bonCommandeId: id,
        ...payload,
      },
    });

    // Update bon commande montant total
    const bonLignes = await prisma.ligneCommande.findMany({
      where: { bonCommandeId: id }
    });

    const montantTotal = bonLignes.reduce((sum, l) => sum + parseFloat(l.montantTTC), 0);

    await prisma.bonCommande.update({
      where: { id },
      data: { montantTotal }
    });

    res.status(201).json(ligne);
  } catch (error) {
    console.error('Error adding ligne to bon commande:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de la ligne' });
  }
};

// Update bon commande status
