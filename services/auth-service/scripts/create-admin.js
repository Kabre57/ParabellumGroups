const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@parabellum.com';
    const password = process.env.ADMIN_PASSWORD || 'Admin@2026!';
    
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

    const passwordHash = await bcrypt.hash(password, 10);

    const user = existingUser
      ? await prisma.user.update({
          where: { email },
          data: {
            passwordHash,
            firstName: existingUser.firstName || 'Admin',
            lastName: existingUser.lastName || 'Parabellum',
            roleId: existingUser.roleId || adminRole.id,
            isActive: true
          },
          include: {
            role: true
          }
        })
      : await prisma.user.create({
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

    console.log(existingUser ? 'Utilisateur admin mis a jour:' : 'Utilisateur cree avec succes:');
    console.log({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role?.name,
      isActive: user.isActive
    });

    console.log('\nIdentifiants de connexion:');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: existingUser ? 'USER_UPDATED' : 'USER_CREATED',
        entityType: 'User',
        entityId: user.id.toString(),
        details: existingUser ? 'Admin user updated via script' : 'Admin user created via script',
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
