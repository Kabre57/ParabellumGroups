const { PrismaClient, PurchaseCommitmentStatus } = require('@prisma/client');
const prisma = new PrismaClient();
const { amount } = require('../utils/accounting');
const { applyEnterpriseScope, assertEnterpriseInScope } = require('../utils/enterpriseScope');

exports.getAll = async (req, res) => {
  try {
    const factures = await prisma.factureFournisseur.findMany({
      where: await applyEnterpriseScope({
        req,
        where: {},
      }),
      include: {
        commitment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: factures });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      numeroFacture,
      fournisseurId,
      fournisseurNom,
      dateFacture,
      dateEcheance,
      montantHT,
      montantTVA,
      montantTTC,
      commitmentId,
      notes,
      markAsPaid,
      paymentMethod,
      treasuryAccountId,
      datePaiement,
      paymentReference,
    } = req.body;

    const commitment = commitmentId
      ? await prisma.purchaseCommitment.findUnique({
          where: { id: commitmentId },
        })
      : null;
    const resolvedEnterpriseId = commitment?.enterpriseId ?? (req.user?.enterpriseId ? Number(req.user.enterpriseId) : null);
    const resolvedEnterpriseName = commitment?.enterpriseName || req.user?.enterpriseName || null;

    await assertEnterpriseInScope(
      req,
      resolvedEnterpriseId,
      "Vous n'avez pas acces a l'entreprise selectionnee pour cette facture fournisseur."
    );

    const result = await prisma.$transaction(async (tx) => {

      const facture = await tx.factureFournisseur.create({
        data: {
          numeroFacture,
          enterpriseId: resolvedEnterpriseId,
          enterpriseName: resolvedEnterpriseName,
          fournisseurId,
          fournisseurNom,
          dateFacture: dateFacture ? new Date(dateFacture) : new Date(),
          dateEcheance: dateEcheance ? new Date(dateEcheance) : null,
          montantHT,
          montantTVA,
          montantTTC,
          commitmentId,
          notes,
        },
      });

      if (commitmentId && commitment) {
        await tx.purchaseCommitment.update({
          where: { id: commitment.id },
          data: {
            factureFournisseurId: facture.id,
            status: PurchaseCommitmentStatus.LIQUIDE,
          },
        });
      }

      if (markAsPaid && commitment) {
        await tx.decaissement.create({
          data: {
            numeroPiece: `DEC-${Date.now()}`,
            beneficiaryName: fournisseurNom || commitment.supplierName || 'Fournisseur',
            description: `Paiement facture fournisseur ${numeroFacture}`,
            enterpriseId: resolvedEnterpriseId,
            enterpriseName: resolvedEnterpriseName,
            amountHT: amount(montantHT),
            amountTVA: amount(montantTVA),
            amountTTC: amount(montantTTC),
            paymentMethod,
            treasuryAccountId: treasuryAccountId || null,
            dateDecaissement: datePaiement ? new Date(datePaiement) : new Date(),
            reference: paymentReference || numeroFacture,
            notes: notes || null,
            status: 'VALIDE',
            commitmentId,
            factureFournisseurId: facture.id,
            accountingAccountId: null,
            createdByUserId: req.user?.userId ? String(req.user.userId) : null,
            createdByEmail: req.user?.email || null,
          },
        });

        await tx.purchaseCommitment.update({
          where: { id: commitment.id },
          data: { status: PurchaseCommitmentStatus.ORDONNANCE },
        });
      }

      return facture;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Erreur creation facture fournisseur:', error.message);
    res.status(500).json({ error: error.message });
  }
};
