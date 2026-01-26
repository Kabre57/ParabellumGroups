const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const email = 'admin@parabellum.com';
    const password = 'admin123';
    
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      console.log('✅ L\'utilisateur admin existe déjà');
      console.log({
        id: existingUser.id,
        email: existingUser.email,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        role: existingUser.role,
        isActive: existingUser.isActive
      });
      
      console.log('\n🔑 Identifiants de connexion:');
      console.log('Email: admin@parabellum.com');
      console.log('Password: admin123');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: 'Admin',
        lastName: 'Parabellum',
        role: 'ADMIN',
        isActive: true
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });
    
    console.log('✅ Utilisateur créé avec succès:');
    console.log(user);

    console.log('\n🔑 Identifiants de connexion:');
    console.log('Email: admin@parabellum.com');
    console.log('Password: admin123');

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: user.id.toString(),
        details: 'Admin user created via script',
        ipAddress: '127.0.0.1',
        userAgent: 'Node.js Script'
      }
    });

    console.log('✅ Audit log créé');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
