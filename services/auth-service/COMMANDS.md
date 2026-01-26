# Auth Service - Quick Commands Reference

## 🚀 Development Commands

### Initial Setup
```bash
# Install dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# Verify setup
node check-setup.js
```

### Running the Service
```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev

# Check Prisma Studio (Database GUI)
npm run prisma:studio
```

### Database Commands
```bash
# Generate Prisma Client
npm run prisma:generate

# Create and apply migrations
npm run prisma:migrate

# Reset database (WARNING: Deletes all data)
npx prisma migrate reset

# View database in browser
npm run prisma:studio

# Format Prisma schema
npx prisma format

# Validate Prisma schema
npx prisma validate
```

### Testing
```bash
# Run tests (when implemented)
npm test

# Manual testing guide
node tests/manual-tests.js
```

## 🔧 Useful Commands

### Check Service Health
```bash
# Using curl (PowerShell)
curl http://localhost:4001/api/health

# Using PowerShell's Invoke-WebRequest
Invoke-WebRequest -Uri http://localhost:4001/api/health -UseBasicParsing
```

### Test Register Endpoint
```bash
# PowerShell
$body = @{
    email = "admin@parabellum.com"
    password = "Admin123!"
    firstName = "Admin"
    lastName = "User"
    role = "ADMIN"
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:4001/api/auth/register `
  -Method POST `
  -Body $body `
  -ContentType "application/json" `
  -UseBasicParsing
```

### Test Login Endpoint
```bash
# PowerShell
$body = @{
    email = "admin@parabellum.com"
    password = "Admin123!"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri http://localhost:4001/api/auth/login `
  -Method POST `
  -Body $body `
  -ContentType "application/json" `
  -UseBasicParsing

$response.Content | ConvertFrom-Json
```

### Get Current User (Authenticated)
```bash
# PowerShell - Replace YOUR_TOKEN with actual token
$token = "YOUR_TOKEN"
$headers = @{
    Authorization = "Bearer $token"
}

Invoke-WebRequest -Uri http://localhost:4001/api/auth/me `
  -Method GET `
  -Headers $headers `
  -UseBasicParsing
```

## 🐛 Debugging

### Check if service is running
```bash
# PowerShell
Get-Process | Where-Object { $_.ProcessName -like "*node*" }
```

### View logs (if using PM2)
```bash
pm2 logs auth-service
```

### Check port availability
```bash
# PowerShell
Test-NetConnection -ComputerName localhost -Port 4001
```

### Kill process on port 4001 (if needed)
```bash
# PowerShell - Find process
Get-NetTCPConnection -LocalPort 4001 | Select-Object OwningProcess

# Kill process (replace PID with actual process ID)
Stop-Process -Id PID -Force
```

## 📦 Docker Commands

### Build Docker Image
```bash
docker build -t parabellum-auth-service .
```

### Run Docker Container
```bash
docker run -p 4001:4001 --env-file .env parabellum-auth-service
```

### Run with Docker Compose
```bash
# From project root
docker-compose up auth-service
```

## 🔍 Database Inspection

### Connect to PostgreSQL
```bash
# If running in Docker
docker exec -it postgres-container psql -U postgres -d parabellum_auth

# Direct connection
psql -h localhost -U postgres -d parabellum_auth
```

### Useful SQL Queries
```sql
-- List all users
SELECT id, email, "firstName", "lastName", role, "isActive" FROM users;

-- Count users by role
SELECT role, COUNT(*) FROM users GROUP BY role;

-- List all services
SELECT * FROM services;

-- List all permissions
SELECT * FROM permissions ORDER BY category, name;

-- View audit logs
SELECT * FROM audit_logs ORDER BY "createdAt" DESC LIMIT 10;
```

## 🔄 Migration Management

### Create new migration
```bash
npx prisma migrate dev --name migration_name
```

### Apply pending migrations
```bash
npx prisma migrate deploy
```

### View migration status
```bash
npx prisma migrate status
```

### Rollback last migration (manual)
```bash
# 1. Identify migration file in prisma/migrations/
# 2. Run the down migration SQL manually
# 3. Delete migration folder
# 4. Update _prisma_migrations table
```

## 🛠️ Troubleshooting

### Clear node_modules and reinstall
```bash
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Reset Prisma Client
```bash
Remove-Item -Recurse -Force node_modules/.prisma
npm run prisma:generate
```

### Check environment variables
```bash
# PowerShell
Get-Content .env
```

### Verify Prisma connection
```bash
npx prisma db pull
```

## 📊 Performance Monitoring

### Check memory usage
```bash
# PowerShell
Get-Process node | Select-Object ProcessName, @{Name="Memory(MB)";Expression={$_.WorkingSet64 / 1MB}}
```

### Monitor API requests (if using Morgan)
Already configured in index.js - check console output

## 🔐 Security Checks

### Validate environment file
```bash
# Check for required variables
node -e "require('dotenv').config(); console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Missing')"
```

### Generate secure JWT secret
```bash
# PowerShell
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

## 📝 Code Quality

### Check syntax
```bash
node -c index.js
node -c src/routes/index.js
```

### Format code (if using Prettier)
```bash
npx prettier --write "src/**/*.js"
```

### Lint code (if using ESLint)
```bash
npx eslint src/
```

## 🎯 Production Deployment

### Environment setup
```bash
# Set NODE_ENV
$env:NODE_ENV = "production"

# Or in .env file
NODE_ENV=production
```

### Build for production
```bash
npm ci --production
npm run prisma:generate
```

### Start with PM2
```bash
pm2 start index.js --name auth-service
pm2 save
pm2 startup
```

## 📚 Documentation

### Generate API documentation (if using Swagger)
Already configured with swagger-jsdoc and swagger-ui-express

Access at: http://localhost:4001/api-docs (if implemented)

### View this help
```bash
Get-Content COMMANDS.md
```
