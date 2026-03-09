const { PrismaClient } = require('@prisma/client');

async function main() {
  const p = new PrismaClient();
  await p.article.createMany({
    data: [
      {
        id: '00000000-0000-0000-0000-000000000001',
        reference: 'ART-001',
        nom: 'Clavier',
        categorie: 'Informatique',
        unite: 'PIECE',
        prixAchat: 15000,
        prixVente: 20000,
        quantiteStock: 50,
        seuilAlerte: 10,
        seuilRupture: 5,
        emplacement: 'A1',
        status: 'ACTIF',
      },
      {
        id: '00000000-0000-0000-0000-000000000002',
        reference: 'ART-002',
        nom: 'Souris',
        categorie: 'Informatique',
        unite: 'PIECE',
        prixAchat: 8000,
        prixVente: 12000,
        quantiteStock: 80,
        seuilAlerte: 15,
        seuilRupture: 10,
        emplacement: 'A1',
        status: 'ACTIF',
      },
      {
        id: '00000000-0000-0000-0000-000000000003',
        reference: 'ART-003',
        nom: 'Ecran 24"',
        categorie: 'Informatique',
        unite: 'PIECE',
        prixAchat: 60000,
        prixVente: 85000,
        quantiteStock: 20,
        seuilAlerte: 5,
        seuilRupture: 2,
        emplacement: 'A2',
        status: 'ACTIF',
      },
    ],
    skipDuplicates: true,
  });
  const r = await p.article.findMany();
  console.log('Articles now', r.length);
  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
