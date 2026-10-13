// Generation du PDF des ordres de mission.
const { prisma, includeOrderRelations, buildMissionOrderHtml } = require('./shared');
const puppeteer = require('puppeteer-core');

exports.getPdf = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.ordreMission.findUnique({
      where: { id },
      include: includeOrderRelations,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Ordre de mission non trouve',
      });
    }

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
    const browser = await puppeteer.launch({
      executablePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setContent(buildMissionOrderHtml(order), { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    if (order.status !== 'IMPRIME') {
      await prisma.ordreMission.update({
        where: { id },
        data: {
          status: 'IMPRIME',
          printedAt: new Date(),
        },
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ordre-mission-${order.numeroOrdre}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error in getPdf ordre mission:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Erreur lors de la generation du PDF de l ordre de mission',
    });
  }
};
