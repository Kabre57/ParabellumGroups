const { PrismaClient } = require('@prisma/client');
const { resolveTreasuryAccountId } = require('../utils/treasury');
const { applyEnterpriseScope, assertEnterpriseInScope } = require('../utils/enterpriseScope');

const prisma = new PrismaClient();

const paymentMethodMap = {
  VIREMENT: 'VIREMENT',
  VIREMENT_BANCAIRE: 'VIREMENT',
  CHEQUE: 'CHEQUE',
  ESPECES: 'ESPECES',
  CARTE: 'CARTE',
  PRELEVEMENT: 'PRELEVEMENT',
};

const normalizeMethod = (value) => paymentMethodMap[String(value || '').toUpperCase()] || null;
const buildPaymentEncaissementMarker = (paymentId) => `[PAYMENT:${paymentId}]`;

const serializePaiement = (paiement) => ({
  id: paiement.id,
  factureId: paiement.factureId,
  enterpriseId: paiement.enterpriseId ?? paiement.facture?.enterpriseId ?? null,
  enterpriseName: paiement.enterpriseName || paiement.facture?.enterpriseName || null,
  montant: Number(paiement.montant || 0),
  datePaiement: paiement.datePaiement,
  modePaiement: paiement.methodePaiement,
  methodePaiement: paiement.methodePaiement,
  reference: paiement.reference || null,
  notes: paiement.notes || null,
  treasuryAccountId: paiement.treasuryAccountId || null,
  treasuryAccountName: paiement.treasuryAccount?.name || null,
  facture: paiement.facture || undefined,
  createdAt: paiement.createdAt,
  updatedAt: paiement.updatedAt,
});

exports.createPaiement = async (req, res) => {
  try {
    const {
      factureId,
      montant,
      datePaiement,
      methodePaiement,
      modePaiement,
      reference,
      notes,
      treasuryAccountId,
    } = req.body;
    const normalizedMethod = normalizeMethod(methodePaiement || modePaiement);

    if (!factureId || !normalizedMethod || !Number.isFinite(Number(montant))) {
      return res.status(400).json({ error: 'factureId, montant et methode de paiement sont requis' });
    }

    const facture = await prisma.facture.findUnique({
      where: { id: factureId },
      include: { paiements: true },
    });

    if (!facture) {
      return res.status(404).json({ error: 'Facture non trouvee' });
    }

    await assertEnterpriseInScope(req, facture.enterpriseId, "Vous n'avez pas acces a cette facture.");

    const totalPaye = facture.paiements.reduce((sum, paiement) => sum + Number(paiement.montant || 0), 0);
    const montantNumerique = Number(montant);
    const restant = Math.max(Number(facture.montantTTC || 0) - totalPaye, 0);

    if (montantNumerique > restant) {
      return res.status(400).json({
        error: 'Le montant du paiement depasse le reste a payer de la facture.',
      });
    }

    const enterpriseId = facture.enterpriseId ?? (req.user?.enterpriseId ? Number(req.user.enterpriseId) : null);
    const enterpriseName = facture.enterpriseName || req.user?.enterpriseName || null;
    const resolvedTreasuryAccountId = await resolveTreasuryAccountId(prisma, {
      treasuryAccountId,
      paymentMethod: normalizedMethod,
      user: req.user,
    });

    const resultPaiement = await prisma.$transaction(async (tx) => {
      const paiement = await tx.paiement.create({
        data: {
          factureId,
          enterpriseId,
          enterpriseName,
          montant: montantNumerique,
          datePaiement: datePaiement ? new Date(datePaiement) : new Date(),
          methodePaiement: normalizedMethod,
          treasuryAccountId: resolvedTreasuryAccountId,
          reference,
          notes,
        },
      });

      await tx.encaissement.create({
        data: {
          numeroPiece: `ENC-${Date.now()}`,
          clientId: facture.clientId || null,
          clientName: facture.clientName || facture.numeroFacture || 'Client',
          description: `Encaissement facture ${facture.numeroFacture || facture.id}`,
          enterpriseId,
          enterpriseName,
          amountHT: montantNumerique,
          amountTVA: 0,
          amountTTC: montantNumerique,
          paymentMethod: normalizedMethod,
          treasuryAccountId: resolvedTreasuryAccountId,
          dateEncaissement: datePaiement ? new Date(datePaiement) : new Date(),
          reference: reference || paiement.id,
          notes:
            [notes, buildPaymentEncaissementMarker(paiement.id)].filter(Boolean).join(' | ') ||
            buildPaymentEncaissementMarker(paiement.id),
          factureClientId: factureId,
          createdByUserId: req.user?.userId ? String(req.user.userId) : null,
          createdByEmail: req.user?.email || null,
        },
      });

      const totalPaiements = totalPaye + montantNumerique;
      const newStatus =
        totalPaiements >= facture.montantTTC
          ? 'PAYEE'
          : totalPaiements > 0
          ? 'PARTIELLEMENT_PAYEE'
          : facture.status;

      if (newStatus !== facture.status) {
        await tx.facture.update({
          where: { id: factureId },
          data: { status: newStatus },
        });
      }

      return paiement;
    });

    res.status(201).json({ success: true, data: serializePaiement(resultPaiement) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.getByFacture = async (req, res) => {
  try {
    const { factureId } = req.params;
    const facture = await prisma.facture.findUnique({
      where: { id: factureId },
      select: {
        id: true,
        enterpriseId: true,
      },
    });

    if (!facture) {
      return res.status(404).json({ error: 'Facture non trouvee' });
    }

    await assertEnterpriseInScope(req, facture.enterpriseId, "Vous n'avez pas acces a cette facture.");

    const paiements = await prisma.paiement.findMany({
      where: { factureId },
      include: { treasuryAccount: true },
      orderBy: { datePaiement: 'desc' },
    });

    res.json({ success: true, data: paiements.map(serializePaiement) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.getTotal = async (req, res) => {
  try {
    const { factureId } = req.params;
    const facture = await prisma.facture.findUnique({
      where: { id: factureId },
      select: {
        id: true,
        enterpriseId: true,
      },
    });

    if (!facture) {
      return res.status(404).json({ error: 'Facture non trouvee' });
    }

    await assertEnterpriseInScope(req, facture.enterpriseId, "Vous n'avez pas acces a cette facture.");

    const paiements = await prisma.paiement.findMany({
      where: { factureId },
    });

    const total = paiements.reduce((sum, paiement) => sum + paiement.montant, 0);

    res.json({ success: true, data: { total } });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.deletePaiement = async (req, res) => {
  try {
    const { id } = req.params;

    const paiement = await prisma.paiement.findUnique({
      where: { id },
    });

    if (!paiement) {
      return res.status(404).json({ error: 'Paiement non trouve' });
    }

    await assertEnterpriseInScope(req, paiement.enterpriseId, "Vous n'avez pas acces a ce paiement.");

    await prisma.$transaction(async (tx) => {
      await tx.encaissement.deleteMany({
        where: {
          factureClientId: paiement.factureId,
          notes: {
            contains: buildPaymentEncaissementMarker(id),
          },
        },
      });

      await tx.paiement.delete({ where: { id } });

      const facture = await tx.facture.findUnique({
        where: { id: paiement.factureId },
        include: { paiements: true },
      });
      const totalPaiements = facture.paiements.reduce((sum, item) => sum + item.montant, 0);

      if (totalPaiements < facture.montantTTC && facture.status === 'PAYEE') {
        await tx.facture.update({
          where: { id: paiement.factureId },
          data: { status: totalPaiements > 0 ? 'PARTIELLEMENT_PAYEE' : 'EMISE' },
        });
      }
    });

    res.json({ success: true, message: 'Paiement supprime avec succes' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.getAllPaiements = async (req, res) => {
  try {
    const { dateDebut, dateFin, methodePaiement, modePaiement, factureId, search, query, enterpriseId } = req.query;

    const where = {};
    if (dateDebut || dateFin) {
      where.datePaiement = {};
      if (dateDebut) where.datePaiement.gte = new Date(dateDebut);
      if (dateFin) where.datePaiement.lte = new Date(dateFin);
    }
    if (factureId) where.factureId = factureId;
    if (methodePaiement || modePaiement) {
      const normalizedMethod = normalizeMethod(methodePaiement || modePaiement);
      if (normalizedMethod) where.methodePaiement = normalizedMethod;
    }

    const normalizedSearch = String(search || query || '').trim();
    if (normalizedSearch) {
      where.OR = [
        { reference: { contains: normalizedSearch, mode: 'insensitive' } },
        { notes: { contains: normalizedSearch, mode: 'insensitive' } },
        { enterpriseName: { contains: normalizedSearch, mode: 'insensitive' } },
        {
          facture: {
            is: {
              numeroFacture: { contains: normalizedSearch, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const paiements = await prisma.paiement.findMany({
      where: await applyEnterpriseScope({
        req,
        where,
        requestedEnterpriseId: enterpriseId,
      }),
      include: {
        facture: true,
        treasuryAccount: true,
      },
      orderBy: { datePaiement: 'desc' },
    });

    res.json({ success: true, data: paiements.map(serializePaiement) });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};
