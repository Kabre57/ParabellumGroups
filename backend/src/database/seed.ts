import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Début du seeding admin...');

  // Vérifier si l'admin existe déjà
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'theogeoffroy5@gmail.com' }
  });

  if (existingAdmin) {
    console.log('✅ L\'administrateur existe déjà');
    return;
  }

  // Hasher le mot de passe
  const hashedPassword = await bcrypt.hash('password123', 12);

  // Créer l'utilisateur admin avec toutes les informations d'employé
  console.log('👑 Création du super administrateur...');
  
  const defaultDateOfBirth = new Date();
  defaultDateOfBirth.setFullYear(defaultDateOfBirth.getFullYear() - 30);

  const admin = await prisma.user.create({
    data: {
      email: 'theogeoffroy5@gmail.com',
      passwordHash: hashedPassword,
      firstName: 'Kabre',
      lastName: 'W.Theodore',
      role: UserRole.ADMIN,
      isActive: true,
      avatarUrl: null,
      preferences: null,
      // Informations d'employé
      employeeNumber: `EMP-${Date.now()}`,
      position: 'Administrateur Système',
      dateOfBirth: defaultDateOfBirth,
      hireDate: new Date(),
      phone: '+225 07 00 00 00 00',
      address: 'Abidjan, Côte d\'Ivoire',
      nationality: 'Ivoirienne'
    }
  });

  console.log('✅ Super administrateur créé avec succès !');
  console.log('\n📋 Informations de connexion :');
  console.log('📧 Email: theogeoffroy5@gmail.com');
  console.log('🔐 Mot de passe: password123');
  console.log('🎯 Rôle: ADMIN (tous les droits)');
  console.log(`👤 Numéro employé: ${admin.employeeNumber}`);
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors de la création de l\'admin:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });