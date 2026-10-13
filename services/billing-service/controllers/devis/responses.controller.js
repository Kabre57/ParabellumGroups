// Envoi du devis et traitement de la réponse du client.
const { crypto, moment, prisma, QUOTE_READ_INCLUDE, normalizeText, runQuoteSignedWorkflow, createQuoteEvent, fetchClientMeta, buildApprovalUrl, sendQuoteEmail, getQuoteByClientTokenOrThrow, getScopedQuoteOrThrow } = require('../../services/devis');

exports.sendDevis = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await getScopedQuoteOrThrow(req, id, { include: { lignes: true } });

    if (!current.lignes.length) {
      return res.status(400).json({ error: 'Le devis doit contenir au moins une ligne avant envoi' });
    }

    const needsRevisionIncrement = ['ENVOYE', 'MODIFICATION_DEMANDEE', 'REFUSE'].includes(current.status);
    const clientAccessToken = current.clientAccessToken || crypto.randomBytes(24).toString('hex');

    const devis = await prisma.$transaction(async (tx) => {
      const updated = await tx.devis.update({
        where: { id },
        data: {
          status: 'ENVOYE',
          sentAt: new Date(),
          clientAccessToken,
          clientAccessTokenExpiresAt: moment().add(90, 'days').toDate(),
          revisionNumber: needsRevisionIncrement ? current.revisionNumber + 1 : current.revisionNumber,
        },
        include: QUOTE_READ_INCLUDE,
      });

      await createQuoteEvent(
        tx,
        id,
        needsRevisionIncrement ? 'RESENT_TO_CLIENT' : 'SENT_TO_CLIENT',
        req,
        req.body?.message || 'Devis envoye au client',
        { revisionNumber: updated.revisionNumber }
      );

      return updated;
    });

    const approvalUrl = buildApprovalUrl(req, clientAccessToken);
    const clientMeta = await fetchClientMeta(req, devis.clientId);
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
        const emailPayload = {
          expediteurId: req.user?.email || String(req.user?.id || 'commercial'),
          destinataireId: clientMeta.clientEmail,
          sujet: `Devis ${devis.numeroDevis} - ${devis.objet || 'Proposition commerciale'}`,
          contenu: [
            `Bonjour${clientMeta.clientName ? ` ${clientMeta.clientName}` : ''},`,
            '',
            'Votre devis est disponible pour consultation et validation.',
            `Numero du devis : ${devis.numeroDevis}`,
            `Objet : ${devis.objet || '-'}`,
            `Montant TTC : ${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(devis.montantTTC || 0)} F CFA`,
            `Date de validite : ${moment(devis.dateValidite).format('DD/MM/YYYY')}`,
            '',
            `Lien de consultation : ${approvalUrl}`,
            '',
            req.body?.message ? `Message commercial : ${req.body.message}` : '',
            '',
            'Merci.',
          ]
            .filter(Boolean)
            .join('\n'),
          type: 'EMAIL',
        };

        const delivery = await sendQuoteEmail(req, emailPayload);
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

    res.json({
      success: true,
      message: 'Devis envoye au client',
      data: {
        ...devis,
        approvalUrl,
        emailDelivery,
      },
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.acceptDevis = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await getScopedQuoteOrThrow(req, id, { include: { lignes: true } });

    if (!current.lignes.length) {
      return res.status(400).json({ error: 'Un devis doit contenir au moins une ligne avant validation' });
    }

    const devis = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const updated = await tx.devis.update({
        where: { id },
        data: {
          status: 'TRANSMIS_FACTURATION',
          acceptedAt: now,
          clientRespondedAt: now,
          clientComment: normalizeText(req.body?.comment),
          forwardedToBillingAt: now,
          forwardedToBillingBy: req.user?.email || req.user?.id || 'Validation client',
        },
        include: QUOTE_READ_INCLUDE,
      });

      await createQuoteEvent(
        tx,
        id,
        'CLIENT_APPROVED',
        req,
        req.body?.comment || 'Devis valide par le client'
      );

      await createQuoteEvent(
        tx,
        id,
        'AUTO_FORWARDED_TO_BILLING',
        req,
        'Transmission automatique a la facturation apres validation client'
      );

      return updated;
    });

    await runQuoteSignedWorkflow(req, devis);

    res.json({
      success: true,
      message: 'Devis valide par le client et transmis automatiquement a la facturation.',
      data: devis,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.requestModificationDevis = async (req, res) => {
  try {
    const { id } = req.params;
    await getScopedQuoteOrThrow(req, id, {
      select: { id: true, status: true, enterpriseId: true },
    });

    const devis = await prisma.$transaction(async (tx) => {
      const updated = await tx.devis.update({
        where: { id },
        data: {
          status: 'MODIFICATION_DEMANDEE',
          clientRespondedAt: new Date(),
          clientComment: normalizeText(req.body?.comment),
        },
        include: QUOTE_READ_INCLUDE,
      });

      await createQuoteEvent(
        tx,
        id,
        'CLIENT_REQUESTED_CHANGES',
        req,
        req.body?.comment || 'Le client demande des modifications'
      );

      return updated;
    });

    res.json({
      success: true,
      message: 'Le devis est revenu en modification demandee.',
      data: devis,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.refuseDevis = async (req, res) => {
  try {
    const { id } = req.params;
    await getScopedQuoteOrThrow(req, id, {
      select: { id: true, status: true, enterpriseId: true },
    });

    const devis = await prisma.$transaction(async (tx) => {
      const updated = await tx.devis.update({
        where: { id },
        data: {
          status: 'REFUSE',
          refusedAt: new Date(),
          clientRespondedAt: new Date(),
          clientComment: normalizeText(req.body?.raison || req.body?.comment),
        },
        include: QUOTE_READ_INCLUDE,
      });

      await createQuoteEvent(
        tx,
        id,
        'CLIENT_REJECTED',
        req,
        req.body?.raison || req.body?.comment || 'Le client a refuse le devis'
      );

      return updated;
    });

    res.json({ success: true, data: devis });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.getDevisForClientResponse = async (req, res) => {
  try {
    const devis = await getQuoteByClientTokenOrThrow(req.params.token, {
      include: {
        lignes: true,
      },
    });

    res.json({
      success: true,
      data: devis,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.submitClientResponse = async (req, res) => {
  try {
    const current = await getQuoteByClientTokenOrThrow(req.params.token, {
      include: {
        lignes: true,
      },
    });

    const action = String(req.body?.action || '').toUpperCase();
    const comment = normalizeText(req.body?.comment);

    if (!['ACCEPT', 'REQUEST_MODIFICATION', 'REFUSE'].includes(action)) {
      return res.status(400).json({ error: 'Action client invalide' });
    }

    const devis = await prisma.$transaction(async (tx) => {
      const now = new Date();

      if (action === 'ACCEPT') {
        const updated = await tx.devis.update({
          where: { id: current.id },
          data: {
            status: 'TRANSMIS_FACTURATION',
            acceptedAt: now,
            clientRespondedAt: now,
            clientComment: comment,
            forwardedToBillingAt: now,
            forwardedToBillingBy: 'Validation client via lien public',
          },
          include: QUOTE_READ_INCLUDE,
        });

        await createQuoteEvent(tx, current.id, 'CLIENT_APPROVED', req, comment || 'Validation client via lien public');
        await createQuoteEvent(
          tx,
          current.id,
          'AUTO_FORWARDED_TO_BILLING',
          req,
          'Transmission automatique a la facturation apres validation client via lien public'
        );

        return updated;
      }

      if (action === 'REQUEST_MODIFICATION') {
        const updated = await tx.devis.update({
          where: { id: current.id },
          data: {
            status: 'MODIFICATION_DEMANDEE',
            clientRespondedAt: now,
            clientComment: comment,
          },
          include: QUOTE_READ_INCLUDE,
        });

        await createQuoteEvent(
          tx,
          current.id,
          'CLIENT_REQUESTED_CHANGES',
          req,
          comment || 'Modification demandee via lien public'
        );

        return updated;
      }

      const updated = await tx.devis.update({
        where: { id: current.id },
        data: {
          status: 'REFUSE',
          refusedAt: now,
          clientRespondedAt: now,
          clientComment: comment,
        },
        include: QUOTE_READ_INCLUDE,
      });

      await createQuoteEvent(tx, current.id, 'CLIENT_REJECTED', req, comment || 'Refus via lien public');

      return updated;
    });

    if (action === 'ACCEPT') {
      await runQuoteSignedWorkflow(req, devis);
    }

    res.json({
      success: true,
      message:
        action === 'ACCEPT'
          ? 'Le devis a ete valide et transmis a la facturation.'
          : action === 'REQUEST_MODIFICATION'
            ? 'La demande de modification a ete enregistree.'
            : 'Le refus du devis a ete enregistre.',
      data: devis,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};
