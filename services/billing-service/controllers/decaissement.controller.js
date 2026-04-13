const { PrismaClient, AccountingEntrySide } = require('@prisma/client');
const prisma = new PrismaClient();
const { recordPayment } = require('../utils/accountingWorkflow');

exports.create = async (req, res) => {
  try {
    const {
      beneficiaryName,
      description,
      amountTTC,
      paymentMethod,
      treasuryAccountId,
      serviceId,
      serviceName,
      dateDecaissement,
      reference,
      notes,
      commitmentId,
      factureFournisseurId,
    } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const decaissement = await tx.decaissement.create({
        data: {
          numeroPiece: `DEC-${Date.now()}`, 
          beneficiaryName,
          description,
          amountTTC,
          paymentMethod,
          treasuryAccountId,
          serviceId: serviceId ? Number(serviceId) : null,
          serviceName,
          dateDecaissement: dateDecaissement ? new Date(dateDecaissement) : new Date(),
          reference,
          notes,
          status: 'VALIDE',
          commitmentId,
          factureFournisseurId,
          createdByUserId: req.user?.userId ? String(req.user.userId) : null,
        },
      });

      // Si lié à un engagement, on enregistre le paiement comptable
      if (commitmentId) {
        const commitment = await tx.purchaseCommitment.findUnique({
          where: { id: commitmentId },
        });

        if (commitment) {
          await recordPayment(tx, { commitment, decaissement, user: req.user });
        }
      }

      return decaissement;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Erreur creation decaissement:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const decaissements = await prisma.decaissement.findMany({
      include: { treasuryAccount: true },
      orderBy: { dateDecaissement: 'desc' },
    });
    res.json({ success: true, data: decaissements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
