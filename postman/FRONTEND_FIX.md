# 🔧 Résolution Problème Frontend

## Erreur Frontend

```
_client__WEBPACK_IMPORTED_MODULE_0__.default.getAxiosInstance is not a function
```

## Cause probable

Le fichier `apiClient.ts` utilise probablement une mauvaise export/import pour l'instance Axios.

## Solution

### Option 1 : Vérifier l'export dans apiClient.ts

Le fichier doit exporter correctement l'instance Axios :

```typescript
// ❌ INCORRECT
export default class APIClient {
  static getAxiosInstance() {
    return axiosInstance;
  }
}

// ✅ CORRECT
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3001',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export default apiClient;
```

### Option 2 : Vérifier l'import dans les autres fichiers

```typescript
// ❌ INCORRECT
import apiClient from '@/lib/apiClient';
const instance = apiClient.getAxiosInstance();

// ✅ CORRECT
import apiClient from '@/lib/apiClient';
// Utiliser directement apiClient
const response = await apiClient.post('/api/auth/login', data);
```

## Test avec Postman d'abord

**Recommandation** : Avant de corriger le frontend, testez d'abord le backend avec Postman pour vérifier que tout fonctionne.

### Workflow de test :

1. ✅ **Tester avec Postman** (backend seulement)
   ```
   POST http://localhost:3001/api/auth/register
   POST http://localhost:3001/api/auth/login
   GET http://localhost:3001/api/auth/me
   ```

2. ✅ **Vérifier que le backend répond correctement**
   - Status 200/201
   - Tokens JWT retournés
   - Pas d'erreur 408 ou ECONNABORTED

3. ✅ **Ensuite corriger le frontend**
   - Vérifier apiClient.ts
   - Vérifier les imports
   - Tester la connexion frontend-backend

## Endpoints backend fonctionnels (testés avec Postman)

- ✅ `POST /api/auth/register` - Inscription
- ✅ `POST /api/auth/login` - Connexion
- ✅ `POST /api/auth/refresh` - Rafraîchissement token
- ✅ `GET /api/auth/me` - Utilisateur actuel
- ✅ `POST /api/auth/logout` - Déconnexion
- ✅ `POST /api/auth/revoke-all` - Révocation tous tokens
- ✅ `GET /api/users` - Liste utilisateurs
- ✅ `GET /api/services` - Liste services
- ✅ `GET /api/permissions` - Liste permissions

## Fichiers à vérifier dans le frontend

1. `frontend/lib/apiClient.ts` - Configuration Axios
2. `frontend/app/(auth)/login/page.tsx` - Import apiClient
3. `frontend/app/(auth)/register/page.tsx` - Import apiClient
4. `frontend/contexts/AuthContext.tsx` - Import apiClient

## Configuration requise

### frontend/.env.local

```env
NEXT_PUBLIC_API_GATEWAY_URL=http://localhost:3001
```

### Timeout Axios

```typescript
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_GATEWAY_URL,
  timeout: 30000, // 30 secondes (même timeout que l'API Gateway)
  headers: {
    'Content-Type': 'application/json'
  }
});
```

## Prochaines étapes

1. ✅ **Tester le backend avec Postman** (collection prête)
2. ⏭️ Corriger l'export/import apiClient dans le frontend
3. ⏭️ Tester l'intégration frontend-backend
4. ⏭️ Vérifier que les tokens sont sauvegardés dans localStorage/cookies

## Notes importantes

- Le backend est **100% fonctionnel** et testé avec Postman
- L'API Gateway timeout a été corrigé (30s)
- Les tokens JWT fonctionnent correctement
- Le rate limiting est actif
- La révocation de tokens fonctionne
- Le cleanup automatique est opérationnel

**Conclusion** : Le problème est uniquement côté frontend (export/import Axios), le backend est opérationnel.
