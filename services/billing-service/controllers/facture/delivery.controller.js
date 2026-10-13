// Prépare et envoie une facture au client.
const { assertEnterpriseInScope, fetchClientMeta, moment, prisma, sendInvoiceEmail } = require('./shared');

exports.sendFacture = async (req, res) => {
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

    const facture = await prisma.facture.update({
      where: { id },
      data: {
        status: 'EMISE',
      },
      include: {
        lignes: true,
        paiements: true,
        avoirs: true,
      },
    });
    const clientMeta = await fetchClientMeta(req, facture.clientId);
    let emailDelivery = {
      sent: false,
      clientEmail: clientMeta.clientEmail,
      clientName: clientMeta.clientName,
      reason: null,
      messageId: null,
    };

    if (!clientMeta.clientEmail) {
      emailDelivery.reason = 'Email client absent dans le CRM';
    } else {
      try {
        const delivery = await sendInvoiceEmail(req, {
          expediteurId: req.user?.email || String(req.user?.id || 'facturation'),
          destinataireId: clientMeta.clientEmail,
          sujet: `Facture ${facture.numeroFacture}`,
          contenu: [
            `Bonjour${clientMeta.clientName ? ` ${clientMeta.clientName}` : ''},`,
            '',
            `Votre facture ${facture.numeroFacture} est maintenant disponible.`,
            `Montant TTC : ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(facture.montantTTC || 0)} F CFA`,
            `Date d'échéance : ${moment(facture.dateEcheance).format('DD/MM/YYYY')}`,
            '',
            req.body?.message ? `Message : ${req.body.message}` : '',
            '',
            'Merci.',
          ]
            .filter(Boolean)
            .join('\n'),
          type: 'EMAIL',
        });

        emailDelivery = {
          sent: true,
          clientEmail: clientMeta.clientEmail,
          clientName: clientMeta.clientName,
          reason: null,
          messageId: delivery.messageId,
        };
      } catch (error) {
        emailDelivery.reason = error?.response?.data?.error || error.message || 'Envoi email impossible';
      }
    }

    res.json({ success: true, data: facture, emailDelivery });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Recupere les statistiques de facturation
 */
