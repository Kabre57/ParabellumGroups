# Guide de Migration : localStorage → httpOnly Cookies

## ⚠️ Problème Actuel

Les tokens JWT sont actuellement stockés dans `localStorage`, ce qui les rend vulnérables aux attaques XSS (Cross-Site Scripting).

**Fichiers concernés :**
- `frontend/src/shared/api/shared/client.ts` (lignes 83, 93, 95)
- `frontend/src/shared/api/auth/index.ts` (ligne 163)
- `frontend/src/lib/api-client.ts` (ligne 25)

**Risque :** Si un attaquant parvient à injecter du JavaScript malveillant, il peut voler les tokens avec :
```javascript
const token = localStorage.getItem('accessToken');
// Envoi du token à un serveur malveillant
```

---

## ✅ Solution : Cookies httpOnly

Les cookies `httpOnly` ne sont **pas accessibles** via JavaScript, ce qui bloque les attaques XSS.

### Étape 1 : Backend - Envoyer tokens dans cookies

#### Modifier `auth-service/src/controllers/auth.controller.js`

**AVANT :**
```javascript
// login()
res.json({
  success: true,
  message: 'Connexion réussie',
  data: {
    accessToken,
    refreshToken,
    user: { ... }
  }
});
```

**APRÈS :**
```javascript
// login()
// Définir les cookies httpOnly
res.cookie('accessToken', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS uniquement en prod
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: '/'
});

res.cookie('refreshToken', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
  path: '/api/auth/refresh' // Restreindre au endpoint refresh
});

res.json({
  success: true,
  message: 'Connexion réussie',
  data: {
    user: { ... }
    // Ne plus envoyer accessToken et refreshToken dans le body
  }
});
```

#### Modifier logout()
```javascript
// logout()
res.clearCookie('accessToken');
res.clearCookie('refreshToken');
res.json({ success: true, message: 'Déconnexion réussie' });
```

---

### Étape 2 : API Gateway - Accepter tokens depuis cookies

#### Modifier `api-gateway/middleware/auth.js`

**AVANT :**
```javascript
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  // ...
};
```

**APRÈS :**
```javascript
const authenticateToken = (req, res, next) => {
  // Priorité 1: Authorization header (pour API externes)
  let token = null;
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    token = authHeader.split(' ')[1];
  }
  
  // Priorité 2: Cookie httpOnly (pour frontend web)
  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token manquant'
    });
  }
  
  jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
    // ... reste inchangé
  });
};
```

**Installer cookie-parser :**
```bash
cd services/api-gateway
npm install cookie-parser
```

**Modifier `api-gateway/index.js` :**
```javascript
const cookieParser = require('cookie-parser');
// ...
app.use(cookieParser());
```

---

### Étape 3 : Frontend - Supprimer localStorage

#### Modifier `frontend/src/shared/api/shared/client.ts`

**AVANT :**
```typescript
private getToken(): string | null {
  if (typeof window === 'undefined') {
    return this.accessToken;
  }
  return localStorage.getItem('accessToken');
}

public setToken(token: string | null): void {
  this.accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
  }
}
```

**APRÈS :**
```typescript
private getToken(): string | null {
  // En mode SSR, pas de token
  if (typeof window === 'undefined') {
    return null;
  }
  // Les cookies sont envoyés automatiquement par le navigateur
  // Plus besoin de getToken() pour les requêtes
  return null;
}

public setToken(token: string | null): void {
  // Ne rien faire - les cookies sont gérés par le backend
  // Cette méthode peut être supprimée à terme
}
```

#### Simplifier l'intercepteur de requête

**AVANT :**
```typescript
this.instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = this.getToken();
    if (token && config.headers) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  }
);
```

**APRÈS :**
```typescript
this.instance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Axios envoie automatiquement les cookies avec withCredentials: true
    // Plus besoin d'ajouter manuellement l'Authorization header
    return config;
  }
);
```

#### Configurer Axios avec `withCredentials`

**Dans le constructeur :**
```typescript
constructor() {
  this.instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    withCredentials: true, // ✅ CRUCIAL - Envoie automatiquement les cookies
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
```

---

### Étape 4 : Modifier la page de login

#### `frontend/src/app/(auth)/login/page.tsx`

**AVANT :**
```typescript
const handleLogin = async (data: LoginFormData) => {
  const response = await authService.login(data.email, data.password);
  // Tokens stockés dans localStorage
  router.push('/dashboard');
};
```

**APRÈS :**
```typescript
const handleLogin = async (data: LoginFormData) => {
  const response = await authService.login(data.email, data.password);
  // Tokens maintenant dans cookies httpOnly (automatique)
  // Plus besoin de les stocker manuellement
  router.push('/dashboard');
};
```

---

## 📋 Checklist de Migration

- [ ] **Backend - auth-service**
  - [ ] Modifier `login()` pour envoyer cookies
  - [ ] Modifier `logout()` pour clear cookies
  - [ ] Modifier `refresh()` pour gérer cookies
  - [ ] Tester avec Postman

- [ ] **Backend - api-gateway**
  - [ ] Installer `cookie-parser`
  - [ ] Modifier `auth.js` pour lire cookies
  - [ ] Ajouter `app.use(cookieParser())`
  - [ ] Tester authentification

- [ ] **Frontend**
  - [ ] Ajouter `withCredentials: true` à axios
  - [ ] Supprimer `getToken()` / `setToken()`
  - [ ] Supprimer tous `localStorage.getItem/setItem('accessToken')`
  - [ ] Supprimer `Authorization` header de l'intercepteur
  - [ ] Tester login/logout/refresh

- [ ] **CORS**
  - [ ] Vérifier `credentials: true` dans api-gateway/cors.js ✅
  - [ ] Vérifier origin correspond au frontend

- [ ] **Tests**
  - [ ] Login → cookies créés
  - [ ] Requêtes authentifiées → cookies envoyés
  - [ ] Logout → cookies supprimés
  - [ ] Refresh token → nouveau cookie accessToken

---

## 🔒 Avantages de cette migration

| Avant (localStorage) | Après (httpOnly cookies) |
|----------------------|--------------------------|
| ❌ Accessible via JavaScript | ✅ Inaccessible via JavaScript |
| ❌ Vulnérable XSS | ✅ Protégé contre XSS |
| ❌ Envoyé manuellement | ✅ Envoyé automatiquement |
| ❌ Persiste après fermeture | ✅ Peut expirer (maxAge) |

---

## ⚠️ Note sur la Production

En production, les cookies **doivent** être :
- `secure: true` (HTTPS uniquement)
- `sameSite: 'strict'` ou `'lax'`
- Avec un `domain` approprié si sous-domaines multiples

**Exemple production :**
```javascript
res.cookie('accessToken', token, {
  httpOnly: true,
  secure: true, // Force HTTPS
  sameSite: 'strict',
  domain: '.parabellum.com', // Partage entre sous-domaines
  maxAge: 15 * 60 * 1000
});
```

---

## 📚 Ressources

- [OWASP: XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN: Set-Cookie httpOnly](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie)
- [Axios withCredentials](https://axios-http.com/docs/req_config)

---

**Date de création :** 2026-02-10  
**Priorité :** 🔴 CRITIQUE (vulnérabilité XSS)  
**Effort estimé :** 2-3 heures  
**Status :** ⏳ EN ATTENTE
