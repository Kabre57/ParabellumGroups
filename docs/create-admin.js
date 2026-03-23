#!/usr/bin/env node

/**
 * Script pour créer un utilisateur admin de test
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET is required to run create-admin.js');
}

async function createTestAdmin() {
  try {
    console.log('🔧 Création d\'un utilisateur admin de test...');

    // Créer ou mettre à jour l'utilisateur admin
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const user = await prisma.user.upsert({
      where: { email: 'admin@parabellum.com' },
      update: {
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'Test',
        isActive: true,
      },
      create: {
        email: 'admin@parabellum.com',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'Test',
        roleId: 1, // ADMIN role
        isActive: true,
      },
    });

    console.log('✅ Utilisateur admin créé:', user.email);

    // Générer un token JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: 'ADMIN'
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    console.log('🔑 Token JWT généré:', token);
    console.log('\n🚀 Vous pouvez maintenant utiliser ce token pour les tests API');
    console.log('📋 Token à copier:', token);

  } catch (error) {
    console.error('❌ Erreur lors de la création de l\'utilisateur:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  createTestAdmin();
}

module.exports = { createTestAdmin };
