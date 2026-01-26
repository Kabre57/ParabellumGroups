#!/usr/bin/env node

/**
 * Quick Start Script for Auth Service
 * This script helps verify the service is properly configured
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Auth Service Configuration...\n');

let hasErrors = false;

// Check .env file
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('✓ .env file exists');
} else {
  console.log('✗ .env file missing - copying from env.example');
  fs.copyFileSync(
    path.join(__dirname, 'env.example'),
    envPath
  );
  console.log('✓ Created .env file from template');
  console.log('⚠️  Please update .env with your actual database credentials\n');
}

// Check required directories
const requiredDirs = [
  'src/config',
  'src/controllers',
  'src/middleware',
  'src/routes',
  'src/utils'
];

console.log('\n📁 Checking directory structure:');
requiredDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`  ✓ ${dir}`);
  } else {
    console.log(`  ✗ ${dir} missing`);
    hasErrors = true;
  }
});

// Check required files
const requiredFiles = [
  'index.js',
  'package.json',
  'prisma/schema.prisma',
  'src/config/database.js',
  'src/utils/jwt.js',
  'src/utils/password.js',
  'src/middleware/auth.js',
  'src/middleware/roleCheck.js',
  'src/controllers/auth.controller.js',
  'src/controllers/user.controller.js',
  'src/controllers/service.controller.js',
  'src/controllers/permission.controller.js',
  'src/routes/index.js',
  'src/routes/auth.routes.js',
  'src/routes/user.routes.js',
  'src/routes/service.routes.js',
  'src/routes/permission.routes.js',
];

console.log('\n📄 Checking required files:');
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✓ ${file}`);
  } else {
    console.log(`  ✗ ${file} missing`);
    hasErrors = true;
  }
});

// Check node_modules
console.log('\n📦 Checking dependencies:');
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (fs.existsSync(nodeModulesPath)) {
  console.log('  ✓ node_modules exists');
} else {
  console.log('  ✗ node_modules missing');
  console.log('  ℹ️  Run: npm install');
  hasErrors = true;
}

// Summary
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ Configuration check failed');
  console.log('\nNext steps:');
  console.log('1. Run: npm install');
  console.log('2. Update .env with your database credentials');
  console.log('3. Run: npm run prisma:generate');
  console.log('4. Run: npm run prisma:migrate');
  console.log('5. Run: npm start');
} else {
  console.log('✅ All checks passed!');
  console.log('\nNext steps:');
  console.log('1. Update .env with your database credentials (if not done)');
  console.log('2. Run: npm run prisma:generate');
  console.log('3. Run: npm run prisma:migrate');
  console.log('4. Run: npm start or npm run dev');
  console.log('\nAPI will be available at: http://localhost:4001');
}
console.log('='.repeat(50) + '\n');

process.exit(hasErrors ? 1 : 0);
