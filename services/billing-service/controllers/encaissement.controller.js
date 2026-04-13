const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.create = async (req, res) => {
  try {
      const {
        clientName,
        description,
        amountTTC,
        paymentMethod,
        treasuryAccountId,
        serviceId,
        serviceName,
        dateEncaissement,
        reference,
        notes,
        factureClientId,
      } = req.body;
  
      const result = await prisma.$transaction(async (tx) => {
        const encaissement = await tx.encaissement.create({
          data: {
            numeroPiece: `ENC-${Date.now()}`,
            clientName,
            description,
            amountTTC,
            paymentMethod,
            treasuryAccountId,
            serviceId: serviceId ? Number(serviceId) : null,
            serviceName,
            dateEncaissement: dateEncaissement ? new Date(dateEncaissement) : new Date(),
            reference,
            notes,
            factureClientId,
            createdByUserId: req.user?.userId ? String(req.user.userId) : null,
          },
        });

      // Si lié à une facture client, on pourrait enregistrer un paiement ici aussi
      // Mais le flux client est déjà géré par Paiement. 
      // Encaissement est pour les recettes hors facturation ou via saisie de caisse directe.

      return encaissement;
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error('Erreur creation encaissement:', error.message);
    res.status(500).json({ error: error.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const encaissements = await prisma.encaissement.findMany({
      include: { treasuryAccount: true },
      orderBy: { dateEncaissement: 'desc' },
    });
    res.json({ success: true, data: encaissements });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
