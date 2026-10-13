// Génère le PDF téléchargeable de la facture.
const { assertEnterpriseInScope, ensureTempDir, fetchClientMeta, generateFacturePDF, path, prisma } = require('./shared');

exports.generatePDF = async (req, res) => {
  try {
    const { id } = req.params;

    const facture = await prisma.facture.findUnique({
      where: { id },
      include: {
        lignes: true,
        paiements: true,
        avoirs: true,
      },
    });

    if (!facture) {
      return res.status(404).json({ error: 'Facture non trouvee' });
    }

    await assertEnterpriseInScope(req, facture.enterpriseId, "Vous n'avez pas acces a cette facture.");

    const tempDir = ensureTempDir();
    const clientMeta = await fetchClientMeta(req, facture.clientId);
    const outputPath = path.join(tempDir, `${facture.numeroFacture}.pdf`);
    const payload = {
      ...facture,
      client: {
        nom: clientMeta.clientName,
        email: clientMeta.clientEmail,
      },
    };
    await generateFacturePDF(payload, outputPath);

    res.download(outputPath);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
