// Transmission, conversion en facture et génération des documents.
const { generateDevisPDF, uploadToS3, isS3Configured, path, moment, prisma, QUOTE_READ_INCLUDE, BILLING_READY_STATUS, fetchProspect, createQuoteEvent, fetchClientMeta, createInvoiceFromQuote, getScopedQuoteOrThrow, resolveEnterpriseContext } = require('../../services/devis');

exports.forwardToBilling = async (req, res) => {
  try {
    const { id } = req.params;
    const current = await getScopedQuoteOrThrow(req, id, {
      select: { id: true, status: true, enterpriseId: true },
    });

    if (!BILLING_READY_STATUS.includes(current.status)) {
      return res.status(400).json({ error: 'Seul un devis valide client peut etre transmis a la facturation' });
    }

    const devis = await prisma.$transaction(async (tx) => {
      const updated = await tx.devis.update({
        where: { id },
        data: {
          status: 'TRANSMIS_FACTURATION',
          forwardedToBillingAt: new Date(),
          forwardedToBillingBy: req.user?.email || req.user?.id || null,
        },
        include: QUOTE_READ_INCLUDE,
      });

      await createQuoteEvent(tx, id, 'FORWARDED_TO_BILLING', req, 'Devis transmis a la facturation');
      return updated;
    });

    res.json({
      success: true,
      message: 'Devis transmis a la facturation.',
      data: devis,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.convertToFacture = async (req, res) => {
  try {
    const { id } = req.params;
    const devis = await getScopedQuoteOrThrow(req, id, { include: { lignes: true } });

    if (!BILLING_READY_STATUS.includes(devis.status)) {
      return res.status(400).json({ error: 'Le devis doit etre valide client puis transmis a la facturation' });
    }

    if (devis.convertedInvoiceId) {
      const existingInvoice = await prisma.facture.findUnique({
        where: { id: devis.convertedInvoiceId },
        include: { lignes: true, paiements: true },
      });

      return res.json({
        success: true,
        message: 'Ce devis a deja ete converti en facture.',
        data: existingInvoice,
      });
    }

    const invoice = await prisma.$transaction(async (tx) => {
      const createdInvoice = await createInvoiceFromQuote(tx, devis, {
        dateEcheance: req.body?.dateEcheance,
        notes: req.body?.notes,
      });

      await tx.devis.update({
        where: { id },
        data: {
          status: 'FACTURE',
          convertedInvoiceId: createdInvoice.id,
          convertedInvoiceNumber: createdInvoice.numeroFacture,
        },
      });

      await createQuoteEvent(tx, id, 'CONVERTED_TO_INVOICE', req, `Facture ${createdInvoice.numeroFacture} creee`, {
        invoiceId: createdInvoice.id,
        invoiceNumber: createdInvoice.numeroFacture,
      });

      return createdInvoice;
    });

    res.status(201).json({
      success: true,
      message: 'Devis transforme en facture.',
      data: invoice,
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.uploadQuoteLineImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    if (!isS3Configured()) {
      return res.status(400).json({ error: 'Stockage S3 non configure' });
    }
    const { enterpriseId } = await resolveEnterpriseContext(req);
    if (!enterpriseId) {
      return res.status(400).json({ error: 'Sélectionnez une entreprise active avant l’upload' });
    }
    const url = await uploadToS3(req.file.buffer, req.file.mimetype, 'quote-lines', enterpriseId);
    if (!url) {
      return res.status(500).json({ error: 'Upload impossible pour le moment' });
    }
    res.status(201).json({ success: true, data: { url } });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};

exports.generatePDF = async (req, res) => {
  try {
    const { id } = req.params;
    const devis = await getScopedQuoteOrThrow(req, id, { include: { lignes: true } });

    if (devis.clientId) {
      const clientMeta = await fetchClientMeta(req, devis.clientId);
      devis.client = {
        nom: clientMeta.clientName || devis.client?.nom || devis.clientId,
        email: clientMeta.clientEmail || devis.client?.email || null,
      };
    } else if (devis.prospectId) {
      const prospect = await fetchProspect(req, devis.prospectId);
      if (prospect) {
        devis.client = {
          nom: prospect.companyName || prospect.contactName || devis.prospectId,
          email: prospect.email || null,
        };
      }
    }

    const outputPath = path.join(__dirname, '..', 'temp', `${devis.numeroDevis}.pdf`);
    await generateDevisPDF(devis, outputPath);
    res.download(outputPath);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
};
