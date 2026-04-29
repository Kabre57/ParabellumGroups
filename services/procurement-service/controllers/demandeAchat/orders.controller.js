const {
  prisma,
  generateBonCommandeNumber,
  serializeQuote,
  serializeOrder,
  enqueueProcurementEvent,
  withEnterpriseContext,
  canManageProformas,
  getCorrelationId,
  assertQuoteAccess,
  ensureQuoteExists,
  purchaseOrderCreatedPayload,
} = require('./shared');

exports.generateOrder = async (req, res) => {
  try {
    if (!canManageProformas(req.user)) {
      return res.status(403).json({
        success: false,
        message: 'Seul le service achat peut générer un bon de commande',
      });
    }

    const demande = await ensureQuoteExists(req.params.id);
    if (!demande) {
      return res.status(404).json({ success: false, message: 'DPA non trouvée' });
    }

    await assertQuoteAccess(req, demande);

    if (demande.bonsCommande?.length) {
      return res.status(409).json({
        success: false,
        message: 'Cette DPA a déjà généré un bon de commande',
      });
    }

    const requestedProformaId = req.body?.proformaId || null;
    const selectedProforma =
      demande.proformas?.find((proforma) => proforma.id === requestedProformaId) ||
      demande.proformas?.find((proforma) => proforma.selectedForOrder) ||
      demande.proformas?.find((proforma) => proforma.status === 'APPROUVEE') ||
      null;

    if (!selectedProforma) {
      return res.status(422).json({
        success: false,
        message: 'Aucune proforma validée n est disponible pour générer le bon de commande',
      });
    }

    if (selectedProforma.status !== 'APPROUVEE') {
      return res.status(409).json({
        success: false,
        message: 'Seule une proforma validée peut être convertie en bon de commande',
      });
    }

    const numeroBon = await generateBonCommandeNumber(prisma);

    const result = await prisma.$transaction(async (tx) => {
      const purchaseOrder = await tx.bonCommande.create({
        data: {
          numeroBon,
          demandeAchatId: demande.id,
          proformaId: selectedProforma.id,
          fournisseurId: selectedProforma.fournisseurId,
          enterpriseId: demande.enterpriseId || null,
          enterpriseName: demande.enterpriseName || null,
          serviceId: demande.serviceId,
          serviceName: demande.serviceName,
          dateCommande: new Date(),
          dateLivraison: req.body?.dateLivraisonPrevue ? new Date(req.body.dateLivraisonPrevue) : demande.dateBesoin,
          montantHT: selectedProforma.montantHT,
          montantTVA: selectedProforma.montantTVA,
          montantTotal: selectedProforma.montantTTC,
          status: 'BROUILLON',
          createdFromApproval: false,
          lignes: {
            createMany: {
              data: selectedProforma.lignes.map((ligne) => ({
                articleId: ligne.articleId,
                referenceArticle: ligne.referenceArticle,
                designation: ligne.designation,
                categorie: ligne.categorie,
                unite: ligne.unite,
                quantite: ligne.quantite,
                prixUnitaire: ligne.prixUnitaire,
                tva: ligne.tva,
                montantHT: ligne.montantHT,
                montantTTC: ligne.montantTTC,
                montant: ligne.montantTTC,
              })),
            },
          },
        },
        include: {
          fournisseur: true,
          proforma: {
            select: {
              id: true,
              numeroProforma: true,
            },
          },
          lignes: {
            orderBy: { createdAt: 'asc' },
          },
          demandeAchat: {
            select: {
              id: true,
              numeroDemande: true,
              titre: true,
            },
          },
        },
      });

      await tx.demandeAchatApprovalLog.create({
        data: {
          demandeAchatId: demande.id,
          action: 'ORDER_CREATED',
          fromStatus: demande.status,
          toStatus: 'COMMANDEE',
          actorUserId: String(req.user.id),
          actorEmail: req.user?.email || null,
          actorServiceId: req.user?.serviceId ?? null,
          actorServiceName: req.user?.serviceName || null,
          commentaire: req.body?.commentaire || 'Bon de commande généré depuis la proforma validée',
        },
      });

      await tx.proformaApprovalLog.create({
        data: {
          proformaId: selectedProforma.id,
          action: 'ORDER_CREATED',
          fromStatus: 'APPROUVEE',
          toStatus: 'APPROUVEE',
          actorUserId: String(req.user.id),
          actorEmail: req.user?.email || null,
          actorServiceId: req.user?.serviceId ?? null,
          actorServiceName: req.user?.serviceName || null,
          commentaire: req.body?.commentaire || 'Bon de commande généré à partir de cette proforma',
        },
      });

      const purchaseQuote = await tx.demandeAchat.update({
        where: { id: demande.id },
        data: {
          status: 'COMMANDEE',
          fournisseurId: selectedProforma.fournisseurId,
          montantEstime: selectedProforma.montantTTC,
          montantHT: selectedProforma.montantHT,
          montantTVA: selectedProforma.montantTVA,
          montantTTC: selectedProforma.montantTTC,
        },
        include: require('./shared').quoteInclude,
      });

      const serializedOrder = serializeOrder(purchaseOrder);
      await enqueueProcurementEvent(tx, {
        eventType: 'procurement.purchase_order.created',
        aggregateType: 'PURCHASE_ORDER',
        aggregateId: purchaseOrder.id,
        correlationId: getCorrelationId(req),
        payload: withEnterpriseContext(purchaseOrderCreatedPayload(serializedOrder), serializedOrder),
      });

      return { purchaseOrder, purchaseQuote };
    });

    res.json({
      success: true,
      message: 'Bon de commande généré avec succès',
      data: {
        purchaseQuote: serializeQuote(result.purchaseQuote),
        purchaseOrder: {
          id: result.purchaseOrder.id,
          numeroBon: result.purchaseOrder.numeroBon,
          status: result.purchaseOrder.status,
        },
      },
    });
  } catch (error) {
    console.error('Error generating purchase order:', error);
    res.status(error.statusCode || 500).json({
      success: false,
      message: 'Erreur lors de la génération du bon de commande',
    });
  }
};
