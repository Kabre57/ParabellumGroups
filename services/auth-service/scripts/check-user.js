const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'admin@parabellum.com' }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:');
    console.log(JSON.stringify(user, null, 2));

    // Test password
    const testPassword = 'admin123';
    const isValid = await bcrypt.compare(testPassword, user.passwordHash);
    
    console.log('\n🔐 Password Test:');
    console.log(`Password: ${testPassword}`);
    console.log(`Hash: ${user.passwordHash}`);
    console.log(`Is Valid: ${isValid}`);

    if (!isValid) {
      console.log('\n⚠️ Password mismatch! Recreating user...');
      
      const passwordHash = await bcrypt.hash(testPassword, 10);
      const updatedUser = await prisma.user.update({
        where: { email: 'admin@parabellum.com' },
        data: { passwordHash }
      });
      
      console.log('✅ User password updated!');
      console.log(`New hash: ${updatedUser.passwordHash}`);
      
      // Verify again
      const isValidNow = await bcrypt.compare(testPassword, updatedUser.passwordHash);
      console.log(`Is Valid Now: ${isValidNow}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
