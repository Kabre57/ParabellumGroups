const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runAudit() {
  console.log('🚀 Démarrage de l\'audit de consistance des données financières...\n');

  try {
    const results = {
      factures: {
        total: await prisma.facture.count(),
        nullMontantHT: await prisma.facture.count({ where: { montantHT: null } }),
        nullDateEmission: await prisma.facture.count({ where: { dateEmission: null } }),
      },
      paiements: {
        total: await prisma.paiement.count(),
        nullMontant: await prisma.paiement.count({ where: { montant: null } }),
        nullDate: await prisma.paiement.count({ where: { datePaiement: null } }),
        nullTreasuryAccount: await prisma.paiement.count({ where: { treasuryAccountId: null } }),
      },
      decaissements: {
        total: await prisma.decaissement.count(),
        nullAmount: await prisma.decaissement.count({ where: { amountTTC: null } }),
        nullDate: await prisma.decaissement.count({ where: { dateDecaissement: null } }),
        nullTreasury: await prisma.decaissement.count({ where: { treasuryAccountId: null } }),
      },
      placements: {
        total: await prisma.placement.count(),
        nullTotalCost: await prisma.placement.count({ where: { totalCost: null } }),
        orphanedCourses: await prisma.assetCourse.count({ where: { placementId: null } }),
      }
    };

    console.log('📊 RÉSULTATS DE L\'AUDIT :');
    console.table({
      Factures: { 
        'Total': results.factures.total, 
        'Montant NULL': results.factures.nullMontantHT, 
        'Date NULL': results.factures.nullDateEmission 
      },
      Paiements: { 
        'Total': results.paiements.total, 
        'Montant NULL': results.paiements.nullMontant, 
        'Date NULL': results.paiements.nullDate,
        'Treasury NULL': results.paiements.nullTreasuryAccount
      },
      Décaissements: { 
        'Total': results.decaissements.total, 
        'Montant NULL': results.decaissements.nullAmount, 
        'Date NULL': results.decaissements.nullDate,
        'Treasury NULL': results.decaissements.nullTreasury
      },
      Placements: {
        'Total': results.placements.total,
        'Montant NULL': results.placements.nullTotalCost,
        'Cours Orphelins': results.placements.orphanedCourses
      }
    });

    const totalIssues = results.factures.nullMontantHT + 
                        results.paiements.nullDate + 
                        results.decaissements.nullTreasury;

    if (totalIssues > 0) {
      console.log(`\n⚠️  ATTENTION : ${totalIssues} anomalies critiques détectées.`);
    } else {
      console.log('\n✅ Aucune anomalie critique détectée au niveau structurel.');
    }

  } catch (error) {
    console.error('\n❌ ÉCHEC DE L\'AUDIT :', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

runAudit();
