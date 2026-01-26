# Script de Redémarrage et Initialisation du Technical-Service

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Redémarrage Technical-Service" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

$technicalPath = "services\technical-service"

Write-Host "📍 Répertoire: $technicalPath" -ForegroundColor Green

# Étape 1: Générer le client Prisma
Write-Host "`n📦 Génération du client Prisma..." -ForegroundColor Yellow
Set-Location $technicalPath
npm run prisma:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la génération du client Prisma" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}

# Étape 2: Seed de la base de données
Write-Host "`n🌱 Seeding de la base de données..." -ForegroundColor Yellow
node prisma\seed.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors du seeding" -ForegroundColor Red
    Set-Location ..\..
    exit 1
}

Set-Location ..\..

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "✅ Initialisation terminée !" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan

Write-Host "`nPROCHAINES ÉTAPES:" -ForegroundColor Yellow
Write-Host "1. Arrêter le technical-service (Ctrl+C dans son terminal)" -ForegroundColor White
Write-Host "2. Redémarrer avec: cd services\technical-service && npm start" -ForegroundColor White
Write-Host "3. Actualiser le navigateur (F5)" -ForegroundColor White
Write-Host ""
