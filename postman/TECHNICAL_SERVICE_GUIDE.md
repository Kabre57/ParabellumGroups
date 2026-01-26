# 🧪 Guide de Test - Service Technique

## Prérequis

1. **Services démarrés** :
   - Auth Service : `http://localhost:4001`
   - API Gateway : `http://localhost:3001`
   - Technical Service : `http://localhost:4006`

2. **Token d'authentification** :
   - Se connecter via Auth Service pour obtenir `ACCESS_TOKEN`
   - Récupérer `USER_ID` depuis le token ou la réponse login

## Workflow de Test Complet

### 1. Initialiser la Base de Données

```powershell
cd "C:\Users\Theo\Documents\Projet 2026\delivery\parabellum-erp"
.\init-technical-service.ps1
```

### 2. Démarrer le Service

```powershell
cd services\technical-service
npm run dev
```

Le service devrait afficher :
```
Technical Service démarré sur le port 4006
```

### 3. Importer la Collection Postman

1. Ouvrir Postman
2. Importer `postman/Parabellum-Technical-Service.postman_collection.json`
3. Sélectionner l'environnement "Parabellum ERP - Development"
4. Vérifier que les variables sont définies :
   - `TECHNICAL_SERVICE_URL` : `http://localhost:4006`
   - `USER_ID` : (récupéré après login)
   - `ACCESS_TOKEN` : (récupéré après login)

### 4. Scénario de Test Complet

#### Étape 1 : Créer une Spécialité
**Endpoint** : `POST /api/specialites`
```json
{
  "nom": "Électricité",
  "description": "Installation et maintenance électrique"
}
```
✅ Sauvegarde automatique de `SPECIALITE_ID`

#### Étape 2 : Créer un Technicien
**Endpoint** : `POST /api/techniciens`
```json
{
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean.dupont@parabellum.fr",
  "telephone": "0612345678",
  "specialiteId": "{{SPECIALITE_ID}}",
  "matricule": "TECH001",
  "dateEmbauche": "2020-01-15",
  "tauxHoraire": 45.50,
  "competences": ["Électricité basse tension", "Domotique"],
  "certifications": ["CERT-ELEC-2023"]
}
```
✅ Sauvegarde automatique de `TECHNICIEN_ID`

#### Étape 3 : Créer une Mission
**Endpoint** : `POST /api/missions`
```json
{
  "clientId": "{{USER_ID}}",
  "titre": "Installation électrique complète",
  "description": "Installation complète du système électrique",
  "typeIntervention": "Installation",
  "priorite": "HAUTE",
  "dateDebut": "2026-01-22T08:00:00.000Z",
  "dateFin": "2026-01-23T18:00:00.000Z",
  "dureeEstimee": 16,
  "adresse": "123 Rue de la République",
  "codePostal": "75001",
  "ville": "Paris",
  "contact": "M. Entreprise",
  "telephoneContact": "0198765432"
}
```
✅ Sauvegarde automatique de `MISSION_NUM` (ex: MIS-202601-0001) et `MISSION_ID`

#### Étape 4 : Assigner un Technicien à la Mission
**Endpoint** : `POST /api/missions/{{MISSION_NUM}}/techniciens`
```json
{
  "technicienIds": ["{{TECHNICIEN_ID}}"],
  "roles": ["Chef d'équipe"]
}
```

#### Étape 5 : Changer le Statut de la Mission
**Endpoint** : `PATCH /api/missions/{{MISSION_NUM}}/statut`
```json
{
  "statut": "EN_COURS"
}
```

#### Étape 6 : Créer une Intervention
**Endpoint** : `POST /api/interventions`
```json
{
  "missionId": "{{MISSION_ID}}",
  "titre": "Pose des câbles électriques",
  "description": "Installation des câbles dans les gaines",
  "type": "Installation",
  "dateHeureDebut": "2026-01-22T08:00:00.000Z",
  "observations": "Prévoir échelle"
}
```
✅ Sauvegarde automatique de `INTERVENTION_ID`

#### Étape 7 : Créer un Rapport
**Endpoint** : `POST /api/rapports`
```json
{
  "interventionId": "{{INTERVENTION_ID}}",
  "technicienId": "{{TECHNICIEN_ID}}",
  "titre": "Rapport d'installation électrique",
  "contenu": "Installation réalisée selon normes NF C 15-100",
  "typeRapport": "Intervention",
  "observations": "Client satisfait"
}
```
✅ Sauvegarde automatique de `RAPPORT_ID`

#### Étape 8 : Valider le Rapport
**Endpoint** : `PATCH /api/rapports/{{RAPPORT_ID}}/statut`
```json
{
  "statut": "VALIDE",
  "valideParId": "{{USER_ID}}"
}
```

#### Étape 9 : Terminer l'Intervention
**Endpoint** : `POST /api/interventions/{{INTERVENTION_ID}}/complete`
```json
{
  "dateHeureFin": "2026-01-22T17:00:00.000Z"
}
```

### 5. Tests de Consultation

#### Statistiques Techniciens
```
GET /api/techniciens/stats
```
Résultat attendu :
- Total de techniciens
- Répartition par statut
- Répartition par spécialité

#### Statistiques Missions
```
GET /api/missions/stats
```
Résultat attendu :
- Total de missions
- Répartition par statut
- Répartition par priorité
- Répartition par mois

#### Techniciens Disponibles
```
GET /api/techniciens/available
```
Résultat attendu : Liste des techniciens avec `status: "AVAILABLE"`

#### Alertes Matériel (vide au début)
```
GET /api/materiels/alertes
```

### 6. Tests via API Gateway

Remplacer `http://localhost:4006` par `http://localhost:3001` et préfixer les routes avec `/api/technical` :

**Avant** : `http://localhost:4006/api/techniciens`
**Après** : `http://localhost:3001/api/technical/techniciens`

### 7. Vérification des Headers

Toutes les requêtes doivent inclure :
```
X-User-Id: {{USER_ID}}
X-User-Role: ADMIN  (optionnel)
X-Correlation-ID:  (auto-généré par Gateway)
```

## Tests Avancés

### Test de Pagination
```
GET /api/techniciens?page=1&limit=5
GET /api/techniciens?page=2&limit=5
```

### Test de Filtres
```
GET /api/techniciens?status=AVAILABLE
GET /api/techniciens?specialiteId={{SPECIALITE_ID}}
GET /api/techniciens?search=dupont
```

### Test de Recherche
```
GET /api/materiels?search=cable
GET /api/missions?statut=EN_COURS&priorite=HAUTE
```

## Codes de Réponse Attendus

| Code | Description | Exemple |
|------|-------------|---------|
| 200 | OK | Récupération réussie |
| 201 | Created | Création réussie |
| 400 | Bad Request | Données invalides |
| 401 | Unauthorized | X-User-Id manquant |
| 404 | Not Found | Ressource non trouvée |
| 409 | Conflict | Email déjà utilisé |
| 500 | Server Error | Erreur serveur |

## Dépannage

### Erreur "X-User-Id manquant"
```json
{
  "success": false,
  "message": "Non authentifié - User ID manquant"
}
```
**Solution** : Ajouter le header `X-User-Id` avec votre USER_ID

### Erreur "Spécialité non trouvée"
```json
{
  "success": false,
  "message": "Specialite non trouvée"
}
```
**Solution** : Créer d'abord une spécialité avec POST /api/specialites

### Erreur Prisma "Table not found"
**Solution** : Exécuter `npm run prisma:migrate` dans le service

### Port 4006 déjà utilisé
**Solution** :
```powershell
Stop-Process -Name node -Force
npm run dev
```

## Résultat Attendu

À la fin du workflow complet, vous devriez avoir :
- ✅ 1 spécialité créée
- ✅ 1 technicien créé
- ✅ 1 mission créée avec numéro MIS-202601-0001
- ✅ 1 technicien assigné à la mission
- ✅ Mission en statut "EN_COURS"
- ✅ 1 intervention créée
- ✅ 1 rapport créé et validé
- ✅ Intervention terminée avec durée calculée

Toutes les données sont liées et traçables via les relations Prisma !
