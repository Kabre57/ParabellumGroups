# Script d'application des migrations Prisma
# Usage: .\apply-migrations.ps1

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Application Migrations Prisma" -ForegroundColor Cyan
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

$errors = @()

foreach ($service in $services) {
    Write-Host "Processing $service..." -ForegroundColor Yellow
    
    # Vérifier status
    $statusOutput = docker compose exec $service npx prisma migrate status 2>&1
    
    if ($statusOutput -match "not yet been applied") {
        Write-Host "  Applying migrations..." -ForegroundColor Cyan
        
        $result = docker compose exec $service npx prisma migrate deploy 2>&1
        
        if ($result -match "successfully applied") {
            Write-Host "  ✅ Migrations appliquées avec succès`n" -ForegroundColor Green
        }
        else {
            Write-Host "  ❌ Erreur lors de l'application`n" -ForegroundColor Red
            $errors += $service
        }
    }
    elseif ($statusOutput -match "Database schema is up to date") {
        Write-Host "  ✅ Déjà à jour`n" -ForegroundColor Green
    }
    else {
        Write-Host "  ℹ️  Aucune migration à appliquer`n" -ForegroundColor Gray
    }
}

Write-Host "`n======================================" -ForegroundColor Cyan
if ($errors.Count -gt 0) {
    Write-Host "❌ ERREURS DÉTECTÉES SUR:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "  - $error" -ForegroundColor Red
    }
    exit 1
} else {
    Write-Host "✅ TOUTES LES MIGRATIONS APPLIQUÉES" -ForegroundColor Green
    Write-Host "`nRedémarrage des services..." -ForegroundColor Cyan
    docker compose restart
    Write-Host "✅ Services redémarrés" -ForegroundColor Green
    exit 0
}
