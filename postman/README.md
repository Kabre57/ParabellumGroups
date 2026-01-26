# 📬 Collection Postman - Parabellum ERP Backend

Collection complète pour tester tous les microservices du backend Parabellum ERP.

## 📁 Fichiers

- `Parabellum-ERP-Backend.postman_collection.json` - Collection principale
- `Parabellum-Development.postman_environment.json` - Environnement de développement
- `Parabellum-Production.postman_environment.json` - Environnement de production

## 🚀 Installation

### 1. Importer dans Postman

1. Ouvrir Postman
2. Cliquer sur **Import**
3. Glisser-déposer les 3 fichiers JSON ou cliquer sur **Upload Files**
4. Sélectionner les fichiers :
   - `Parabellum-ERP-Backend.postman_collection.json`
   - `Parabellum-Development.postman_environment.json`
   - `Parabellum-Production.postman_environment.json`

### 2. Sélectionner l'environnement

1. Dans le coin supérieur droit de Postman
2. Sélectionner **Parabellum ERP - Development**

## 🧪 Utilisation

### Workflow de test complet

#### 1️⃣ Authentification

```
1. Register User
   → Crée un utilisateur et sauvegarde automatiquement les tokens
   
2. Login
   → Connecte l'utilisateur et met à jour les tokens
   
3. Get Current User
   → Vérifie que l'authentification fonctionne
```

#### 2️⃣ Gestion des utilisateurs

```
1. Get All Users
   → Liste tous les utilisateurs
   
2. Get User by ID
   → Récupère un utilisateur spécifique
   
3. Update User
   → Met à jour les informations utilisateur
```

#### 3️⃣ Gestion des services

```
1. Create Service
   → Crée un nouveau service (Direction, Département)
   
2. Get All Services
   → Liste tous les services
   
3. Update Service
   → Modifie un service existant
```

#### 4️⃣ Permissions & Rôles

```
1. Get All Permissions
   → Liste toutes les permissions disponibles
   
2. Create Permission
   → Crée une nouvelle permission
   
3. Assign Permission to Role
   → Assigne des permissions à un rôle (ADMIN, MANAGER, etc.)
```

#### 5️⃣ Health Checks

Vérifier que tous les microservices sont opérationnels :

```
- Auth Service Health
- Technical Service Health
- Customers Service Health
- Projects Service Health
- Procurement Service Health
- Communication Service Health
- HR Service Health
- Billing Service Health
- Analytics Service Health
```

## 🔐 Variables d'environnement

Les variables suivantes sont automatiquement mises à jour lors des requêtes :

| Variable | Description | Auto-rempli |
|----------|-------------|-------------|
| `ACCESS_TOKEN` | Token d'accès JWT | ✅ Oui (Login/Register) |
| `REFRESH_TOKEN` | Token de rafraîchissement | ✅ Oui (Login/Register) |
| `USER_ID` | ID de l'utilisateur connecté | ✅ Oui (Login/Register) |
| `USER_EMAIL` | Email de l'utilisateur | ✅ Oui (Login) |
| `SERVICE_ID` | ID du service créé | ✅ Oui (Create Service) |
| `PERMISSION_ID` | ID de la permission créée | ✅ Oui (Create Permission) |

### URLs des services

| Service | URL de développement | Port |
|---------|---------------------|------|
| API Gateway | `http://localhost:3001` | 3001 |
| Auth Service | `http://localhost:4001` | 4001 |
| Technical Service | `http://localhost:4006` | 4006 |
| Customers Service | `http://localhost:4002` | 4002 |
| Projects Service | `http://localhost:4003` | 4003 |
| Procurement Service | `http://localhost:4004` | 4004 |
| Communication Service | `http://localhost:4005` | 4005 |
| HR Service | `http://localhost:4007` | 4007 |
| Billing Service | `http://localhost:4008` | 4008 |
| Analytics Service | `http://localhost:4009` | 4009 |

## 🐛 Résolution des problèmes

### Erreur 408 Request Timeout

**Symptôme** : L'API Gateway retourne une erreur 408 lors de l'appel aux microservices.

**Cause** : Timeout trop court dans la configuration de l'API Gateway.

**Solution** :

1. Ouvrir `services/api-gateway/config/proxy.config.js`
2. Augmenter le timeout :

```javascript
module.exports = {
  '/api/auth': {
    target: 'http://localhost:4001',
    timeout: 30000, // Augmenter à 30 secondes
    proxyTimeout: 30000
  }
};
```

### Erreur ECONNABORTED (request aborted)

**Symptôme** : Le service backend affiche `BadRequestError: request aborted`.

**Cause** : L'API Gateway abandonne la requête avant que le service backend ne réponde.

**Solutions** :

1. **Augmenter le timeout de l'API Gateway** (voir ci-dessus)
2. **Vérifier que le service backend est bien démarré** :
   ```bash
   # Vérifier l'auth service
   curl http://localhost:4001/api/health
   ```
3. **Redémarrer les services dans l'ordre** :
   ```bash
   # 1. Auth Service
   cd services/auth-service
   npm start
   
   # 2. API Gateway
   cd services/api-gateway
   npm run dev
   ```

### Erreur 401 Unauthorized

**Cause** : Token expiré ou invalide.

**Solution** :

1. Exécuter la requête **Login** pour obtenir un nouveau token
2. Le token sera automatiquement sauvegardé dans `{{ACCESS_TOKEN}}`

### Erreur 429 Too Many Requests

**Cause** : Rate limiting activé (protection anti-brute-force).

**Limites par défaut** :
- Login : 5 tentatives / 15 minutes
- Register : 3 comptes / heure
- Refresh : 10 / 15 minutes

**Solution** : Attendre la fin de la période de rate limiting ou redémarrer le service auth.

## 📊 Tests de Rate Limiting

Pour tester les protections de sécurité :

1. Exécuter **Test Rate Limiting - Login** 6 fois de suite
2. La 6ème requête devrait retourner une erreur 429 :

```json
{
  "success": false,
  "error": "Trop de tentatives de connexion",
  "message": "Votre compte a été temporairement verrouillé...",
  "retryAfter": 900
}
```

## 🧑‍💻 Scripts de test automatisés

Postman inclut des scripts de test automatiques pour :

- ✅ Vérifier les codes de statut HTTP
- ✅ Extraire et sauvegarder automatiquement les tokens
- ✅ Sauvegarder les IDs créés (USER_ID, SERVICE_ID, etc.)

### Exemple de script (Login)

```javascript
if (pm.response.code === 200) {
    const jsonData = pm.response.json();
    pm.environment.set('ACCESS_TOKEN', jsonData.data.accessToken);
    pm.environment.set('REFRESH_TOKEN', jsonData.data.refreshToken);
    pm.environment.set('USER_ID', jsonData.data.user.id);
    pm.environment.set('USER_EMAIL', jsonData.data.user.email);
}
```

## 🔄 Workflow recommandé pour les tests

### Test complet du backend

```
1. Auth Service Health Check
   ↓
2. Register User
   ↓
3. Login
   ↓
4. Get Current User
   ↓
5. Create Service
   ↓
6. Get All Services
   ↓
7. Create Permission
   ↓
8. Assign Permission to Role
   ↓
9. Get Role Permissions
   ↓
10. Refresh Token
   ↓
11. Logout
```

### Test des microservices individuels

Pour chaque service, exécuter :

```
1. Health Check
   → Vérifier que le service répond
```

## 📝 Notes importantes

1. **Tokens JWT** : Les tokens sont automatiquement sauvegardés après Login/Register
2. **Environnements** : Basculer entre Dev et Prod selon le besoin
3. **Rate Limiting** : Les limites de taux sont actives en développement
4. **Base de données** : Assurez-vous que PostgreSQL est démarré avant les tests
5. **Services** : Tous les microservices doivent être démarrés pour un test complet

## 🆘 Support

En cas de problème :

1. Vérifier les logs du service concerné
2. Vérifier que tous les services sont démarrés
3. Vérifier la configuration des variables d'environnement
4. Consulter la documentation du projet

## 📚 Documentation API complète

Pour plus de détails sur chaque endpoint, consulter :
- `API_DOCUMENTATION.md` - Documentation complète de l'API
- Swagger UI (une fois implémenté) : `http://localhost:4001/api-docs`
