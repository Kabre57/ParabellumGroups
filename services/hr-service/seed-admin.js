const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seedAdmin() {
  console.log("Démarrage du script d'amorçage...");

  const adminMatricule = 'ADMIN001';
  const adminEmail = 'admin@logipaie.ci';
  const adminPassword = 'Logipaie2026!'; // Mot de passe par défaut

  try {
    // Vérifier si l'admin existe déjà
    const userExists = await prisma.userAccount.findUnique({
      where: { matricule: adminMatricule }
    });

    if (userExists) {
        console.log('✅ Un administrateur existe déjà avec le matricule ' + adminMatricule);
        return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const user = await prisma.userAccount.create({
      data: {
        matricule: adminMatricule,
        email: adminEmail,
        password: hashedPassword,
        role: 'RH_ADMIN',
      }
    });
    
    console.log('✅ Compte Administrateur RH créé avec succès !');
    console.log('--------------------------------------------------');
    console.log('Identifiants de connexion :');
    console.log(`Matricule : ${adminMatricule}`);
    console.log(`Mot de passe : ${adminPassword}`);
    console.log('--------------------------------------------------');
    
  } catch (error) {
    console.error('Erreur lors de la création du compte :', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
