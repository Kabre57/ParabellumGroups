// Génération du document PDF de mission.
const { puppeteer, prisma, buildMissionPdfHtml } = require('./shared');

exports.getPdf = async (req, res) => {
  try {
    const { id } = req.params;

    const mission = await prisma.mission.findUnique({
      where: { id },
      include: {
        techniciens: {
          include: {
            technicien: {
              include: {
                specialite: true,
              },
            },
          },
        },
        interventions: {
          include: {
            techniciens: {
              include: {
                technicien: {
                  select: {
                    id: true,
                    nom: true,
                    prenom: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        error: 'Mission non trouvée',
      });
    }

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
    const browser = await puppeteer.launch({
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(buildMissionPdfHtml(mission), { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="fiche-mission-${mission.numeroMission || id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error in getPdf mission:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la génération du PDF de la mission',
    });
  }
};
