const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const email = 'admin@parabellum.com';
    const password = 'Admin@2026!';
    
    let adminRole = await prisma.role.findUnique({
      where: { code: 'ADMIN' }
    });

    if (!adminRole) {
      console.log('Creation du role ADMIN...');
      adminRole = await prisma.role.create({
        data: {
          name: 'Administrateur',
          code: 'ADMIN',
          description: 'Acces complet au systeme',
          isSystem: true,
          isActive: true
        }
      });
      console.log('Role ADMIN cree avec ID:', adminRole.id);
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });

    if (existingUser) {
      console.log('L\'utilisateur admin existe deja');
      console.log({
        id: existingUser.id,
        email: existingUser.email,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName,
        role: existingUser.role?.name,
        isActive: existingUser.isActive
      });
      
      console.log('\nIdentifiants de connexion:');
      console.log('Email: admin@parabellum.com');
      console.log('Password: Admin@2026!');
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: 'Admin',
        lastName: 'Parabellum',
        roleId: adminRole.id,
        isActive: true
      },
      include: {
        role: true
      }
    });
    
    console.log('Utilisateur cree avec succes:');
    console.log({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role?.name,
      isActive: user.isActive
    });

    console.log('\nIdentifiants de connexion:');
    console.log('Email: admin@parabellum.com');
    console.log('Password: Admin@2026!');

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

    console.log('Audit log cree');
    
  } catch (error) {
    console.error('Erreur:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
