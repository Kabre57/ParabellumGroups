# Service Technique - Parabellum ERP

## Installation

### 1. Prérequis

- Node.js 22.x
- PostgreSQL 15
- npm

### 2. Configuration

Copier le fichier d'environnement :
```powershell
Copy-Item env.example .env
```

Modifier `.env` avec vos paramètres de base de données :
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/parabellum_technical?schema=public
PORT=4003
```

### 3. Installation des dépendances

```powershell
npm install
```

### 4. Initialisation de la base de données

**Option A - Automatique** (via le script d'initialisation) :
```powershell
cd ..\..
.\init-technical-service.ps1
```

**Option B - Manuelle** :
```powershell
# Générer le client Prisma
npm run prisma:generate

# Créer la base de données et exécuter les migrations
npx prisma migrate dev --name init
```

### 5. Démarrer le service

**Mode développement** (avec hot reload) :
```powershell
npm run dev
```

**Mode production** :
```powershell
npm start
```

Le service sera accessible sur `http://localhost:4003`

## Endpoints Principaux

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /api/specialites` | Liste des spécialités |
| `GET /api/techniciens` | Liste des techniciens |
| `GET /api/missions` | Liste des missions |
| `GET /api/interventions` | Liste des interventions |
| `GET /api/rapports` | Liste des rapports |
| `GET /api/materiel` | Liste du matériel |

## Authentification

Toutes les routes `/api/*` nécessitent le header :
```
X-User-Id: <uuid-utilisateur>
```

## Documentation

- **Collection Postman** : `postman/Parabellum-Technical-Service.postman_collection.json`
- **Guide de test** : `postman/TECHNICAL_SERVICE_GUIDE.md`
- **Schema Prisma** : `prisma/schema.prisma`

## Base de Données

**Créer manuellement la base de données** (si elle n'existe pas) :
```sql
CREATE DATABASE parabellum_technical;
```

**Interface graphique Prisma Studio** :
```powershell
npm run prisma:studio
```

Ouvre l'interface sur `http://localhost:5555`

## Modèles de Données

- **Specialite** : Spécialités techniques (Électricité, Plomberie, etc.)
- **Technicien** : Techniciens avec compétences et certifications
- **Mission** : Missions client avec numéro auto-généré (MIS-YYYYMM-NNNN)
- **Intervention** : Interventions techniques sur une mission
- **Rapport** : Rapports d'intervention
- **Materiel** : Gestion du matériel avec alertes stock

## Statuts

### Technicien
- `AVAILABLE` : Disponible
- `ON_MISSION` : En mission
- `ON_LEAVE` : En congé
- `SICK` : Malade
- `TRAINING` : En formation

### Mission
- `PLANIFIEE` : Planifiée
- `EN_COURS` : En cours
- `SUSPENDUE` : Suspendue
- `TERMINEE` : Terminée
- `ANNULEE` : Annulée

### Intervention
- `PLANIFIEE` : Planifiée
- `EN_COURS` : En cours
- `TERMINEE` : Terminée
- `ANNULEE` : Annulée

### Rapport
- `BROUILLON` : Brouillon
- `SOUMIS` : Soumis
- `VALIDE` : Validé
- `REJETE` : Rejeté

## Tests

### Test du Health Check
```powershell
curl http://localhost:4003/health
```

### Test avec Postman
1. Importer la collection : `postman/Parabellum-Technical-Service.postman_collection.json`
2. Configurer les variables d'environnement :
   - `TECHNICAL_SERVICE_URL` = `http://localhost:4003`
   - `USER_ID` = (ID utilisateur valide)
3. Suivre le guide de test : `postman/TECHNICAL_SERVICE_GUIDE.md`

## Dépannage

### Erreur "address already in use"
```powershell
# Arrêter tous les processus Node.js
Stop-Process -Name node -Force
```

### Erreur de connexion à la base de données
- Vérifier que PostgreSQL est démarré
- Vérifier les paramètres dans `.env`
- Créer la base de données si elle n'existe pas

### Client Prisma non généré
```powershell
npm run prisma:generate
```

## Développement

### Scripts disponibles
- `npm start` : Démarrage production
- `npm run dev` : Démarrage développement avec hot reload
- `npm run prisma:generate` : Générer le client Prisma
- `npm run prisma:migrate` : Créer une migration
- `npm run prisma:studio` : Ouvrir Prisma Studio
