# 🔧 Guide de Maintenance - Migrations Prisma
**Projet**: ParabellumGroups ERP  
**Date**: 13 Février 2026  
**Version**: 1.0

---

## 📋 Problèmes Rencontrés & Solutions

### Problème 1: Colonnes Manquantes après Déploiement

**Symptômes**
```
PrismaClientKnownRequestError: 
The column 'interventions_techniciens.role' does not exist
The column 'audit_logs.level' does not exist
```

**Cause**
Migrations Prisma non appliquées après modification du schéma.

**Solution**
```powershell
# Vérifier status migrations
docker compose exec <service> npx prisma migrate status

# Appliquer migrations en attente
docker compose exec <service> npx prisma migrate deploy
```

---

## 🛠️ Scripts de Maintenance

### 1. Vérification Migrations

**Fichier**: `check-migrations.ps1`

**Usage**
```powershell
.\check-migrations.ps1
```

**Sortie**
```
======================================
Vérification Migrations Prisma
======================================

Checking auth-service...
  ✅ À jour

Checking technical-service...
  ✅ À jour

...

======================================
✅ TOUTES LES MIGRATIONS SONT À JOUR
```

---

### 2. Application Automatique Migrations

**Fichier**: `apply-migrations.ps1`

**Usage**
```powershell
.\apply-migrations.ps1
```

**Actions**
1. Vérifie chaque service
2. Applique migrations en attente
3. Redémarre services automatiquement
4. Rapport final avec statuts

---

## 📊 Services avec Prisma

| Service | Base de Données | Status |
|---------|----------------|--------|
| auth-service | parabellum_auth | ✅ |
| technical-service | parabellum_technical | ✅ |
| customer-service | parabellum_customers | ✅ |
| hr-service | parabellum_hr | ✅ |
| billing-service | parabellum_billing | ✅ |
| commercial-service | parabellum_commercial | ✅ |
| communication-service | parabellum_communication | ✅ |
| inventory-service | parabellum_inventory | ✅ |
| procurement-service | parabellum_procurement | ✅ |
| project-service | parabellum_projects | ✅ |
| analytics-service | parabellum_analytics | ✅ |
| notification-service | delices_db | ⚠️ N/A |

**Note**: notification-service utilise TypeScript sans Prisma Migrate.

---

## 🔄 Workflow Modifications Schéma

### Développement

```powershell
# 1. Modifier schema.prisma
code services/<service>/prisma/schema.prisma

# 2. Créer migration
docker compose exec <service> npx prisma migrate dev --name <description>

# 3. Vérifier génération client
docker compose exec <service> npx prisma generate

# 4. Redémarrer service
docker compose restart <service>

# 5. Tester
# (tester API endpoints affectés)
```

### Production

```powershell
# 1. Backup base de données
docker compose exec postgres pg_dump -U parabellum_user -d <database> > backup_$(Get-Date -Format "yyyyMMdd_HHmmss").sql

# 2. Appliquer migrations
docker compose exec <service> npx prisma migrate deploy

# 3. Vérifier
docker compose logs <service> --tail=50

# 4. Rollback si erreur (voir section ci-dessous)
```

---

## ⚠️ Rollback Migrations

### Méthode 1: Rollback Prisma (Développement uniquement)

```powershell
# Identifier dernière migration
docker compose exec <service> npx prisma migrate status

# Marquer comme rolled-back
docker compose exec <service> npx prisma migrate resolve --rolled-back <migration_name>

# Restaurer backup
docker compose exec -T postgres psql -U parabellum_user -d <database> < backup.sql
```

### Méthode 2: Git Revert (Production)

```powershell
# Revert commit
git revert HEAD

# Rebuild services
docker compose build <service>

# Redémarrer
docker compose up -d <service>

# Restaurer DB si nécessaire
docker compose exec -T postgres psql -U parabellum_user -d <database> < backup.sql
```

---

## 🧪 Tests Post-Migration

### Checklist

```markdown
- [ ] Vérifier logs service (pas d'erreurs Prisma)
- [ ] Tester endpoints principaux
- [ ] Vérifier intégrité données (count, samples)
- [ ] Tester interface utilisateur
- [ ] Vérifier performances (temps réponse)
```

### Commandes Vérification

```powershell
# Logs
docker compose logs <service> --tail=100 | Select-String "error|Error|ERROR"

# Santé service
Invoke-WebRequest -Uri "http://localhost:3001/api/<service>/health"

# Queries DB
docker compose exec postgres psql -U parabellum_user -d <database> -c "SELECT COUNT(*) FROM <table>;"
```

---

## 📝 Migrations Appliquées Récemment

### 2026-02-12

**technical-service**
- Migration: `20260212182206_add_role_to_intervention_technicien`
- Description: Ajout colonne `role` à table `interventions_techniciens`
- Impact: Permet assigner rôle (Principal/Assistant) aux techniciens
- Status: ✅ Appliquée

**auth-service**
- Migration: `20260212000000_auditlog_level_oldvalue_service_image`
- Description: Ajout colonnes `level`, `old_value`, `new_value` à table `audit_logs`
- Impact: Amélioration traçabilité logs audit
- Status: ✅ Appliquée

---

## 🚨 Troubleshooting

### Erreur: "Migration already applied"

**Cause**: Schéma modifié sans créer migration

**Solution**
```powershell
# Créer migration manquante
docker compose exec <service> npx prisma migrate dev --name fix_schema_drift

# Ou forcer reset (DANGER: perte données)
docker compose exec <service> npx prisma migrate reset
```

---

### Erreur: "Database does not exist"

**Cause**: Base de données pas créée

**Solution**
```powershell
# Créer DB
docker compose exec postgres createdb -U parabellum_user <database>

# Appliquer migrations
docker compose exec <service> npx prisma migrate deploy
```

---

### Erreur: "Cannot connect to database"

**Cause**: Service postgres non démarré ou mauvaise config

**Solution**
```powershell
# Vérifier postgres
docker compose ps postgres

# Redémarrer postgres
docker compose restart postgres

# Attendre 10 secondes
Start-Sleep -Seconds 10

# Réessayer migration
docker compose exec <service> npx prisma migrate deploy
```

---

## 📚 Ressources

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Production Troubleshooting](https://www.prisma.io/docs/guides/migrate/production-troubleshooting)
- [Baseline Existing Database](https://www.prisma.io/docs/guides/migrate/production-troubleshooting#baseline-your-production-environment)

---

## 🔐 Bonnes Pratiques

1. **Toujours backup** avant migration production
2. **Tester migrations** en staging d'abord
3. **Documenter changements** dans migration
4. **Vérifier impact** sur queries existantes
5. **Monitorer performances** post-migration
6. **Rollback plan** prêt avant déploiement
7. **Communication équipe** migrations critiques
8. **Validation données** après migration

---

## 📞 Support

Pour toute question ou problème:
- 📧 Email: support@parabellum.com
- 📚 Documentation: Ce fichier
- 🐛 Bug reports: Créer issue dans repository

---

**Dernière mise à jour**: 13 Février 2026  
**Maintenu par**: Équipe DevOps ParabellumGroups
