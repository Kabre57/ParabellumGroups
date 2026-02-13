# Script de vérification des migrations Prisma
# Usage: .\check-migrations.ps1

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Vérification Migrations Prisma" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

$services = @(
    "auth-service",
    "technical-service",
    "customer-service",
    "hr-service",
    "billing-service",
    "commercial-service",
    "communication-service",
    "inventory-service",
    "procurement-service",
    "project-service",
    "analytics-service"
)

$hasPendingMigrations = $false

foreach ($service in $services) {
    Write-Host "Checking $service..." -ForegroundColor Yellow
    
    $output = docker compose exec $service npx prisma migrate status 2>&1
    
    if ($output -match "not yet been applied") {
        Write-Host "  ❌ MIGRATIONS EN ATTENTE" -ForegroundColor Red
        $hasPendingMigrations = $true
        
        # Extraire nom migration
        $migrations = $output | Select-String -Pattern "^[0-9]{14}_.*" | ForEach-Object { $_.Matches.Value }
        foreach ($migration in $migrations) {
            Write-Host "     - $migration" -ForegroundColor Red
        }
        
        Write-Host "     Pour appliquer: docker compose exec $service npx prisma migrate deploy`n" -ForegroundColor Cyan
    }
    elseif ($output -match "Database schema is up to date") {
        Write-Host "  ✅ À jour`n" -ForegroundColor Green
    }
    elseif ($output -match "No migration found") {
        Write-Host "  ℹ️  Pas de migrations (normal pour certains services)`n" -ForegroundColor Gray
    }
    else {
        Write-Host "  ⚠️  Impossible de vérifier`n" -ForegroundColor Yellow
    }
}

Write-Host "`n======================================" -ForegroundColor Cyan
if ($hasPendingMigrations) {
    Write-Host "❌ MIGRATIONS EN ATTENTE DÉTECTÉES" -ForegroundColor Red
    Write-Host "Exécutez les commandes ci-dessus pour appliquer" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ TOUTES LES MIGRATIONS SONT À JOUR" -ForegroundColor Green
    exit 0
}
