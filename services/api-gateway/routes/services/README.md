# API Gateway - Routes Modulaires

## Structure

```
routes/
├── proxy.js              # Point d'entrée (charge automatiquement tous les services)
├── services/             # Configuration par service
│   ├── auth.routes.js
│   ├── analytics.routes.js
│   ├── technical.routes.js
│   ├── customers.routes.js
│   ├── projects.routes.js
│   ├── procurement.routes.js
│   ├── communication.routes.js
│   ├── hr.routes.js
│   ├── billing.routes.js
│   ├── commercial.routes.js
│   ├── inventory.routes.js
│   └── notifications.routes.js
```

## Format de configuration d'un service

```javascript
const config = require('../../utils/config');
const { serviceNameLimiter } = require('../../middleware/serviceLimiters');

/**
 * Path rewrite pour service-name
 */
const rewritePath = (path) => {
  // Logique de transformation des chemins
  return transformedPath;
};

module.exports = {
  serviceName: 'SERVICE_NAME',           // Nom du service (optionnel)
  basePath: config.SERVICES.SERVICE_NAME, // URL du microservice
  pathRewrite: rewritePath,               // Fonction de rewrite par défaut
  limiter: serviceNameLimiter,            // Rate limiter spécifique
  
  routes: [
    {
      path: '/service-path',              // Chemin exposé par l'API Gateway
      auth: true,                          // Authentification requise (true/false)
      method: 'post',                      // Méthode HTTP (optionnel, défaut: all)
      validation: schemas.service.route,   // Schema de validation (optionnel)
      pathRewrite: customRewrite,          // Rewrite custom (optionnel, override le défaut)
    },
  ],
};
```

## Exemple complet

```javascript
// routes/services/example.routes.js
const config = require('../../utils/config');
const { exampleServiceLimiter } = require('../../middleware/serviceLimiters');
const { schemas } = require('../../middleware/validation');

const rewriteExamplePath = (path) => {
  return path.replace(/^\/example/, '/api');
};

module.exports = {
  serviceName: 'EXAMPLE',
  basePath: config.SERVICES.EXAMPLE,
  pathRewrite: rewriteExamplePath,
  limiter: exampleServiceLimiter,
  
  routes: [
    // Route publique avec validation
    {
      path: '/example/login',
      method: 'post',
      auth: false,
      validation: schemas.example.login,
    },
    
    // Route protégée
    {
      path: '/example/data',
      auth: true,
    },
    
    // Route avec rewrite custom
    {
      path: '/data',
      auth: true,
      pathRewrite: { '^/data': '/api/data' },
    },
  ],
};
```

## Avantages

✅ **Modularité** : Chaque service dans son propre fichier  
✅ **Maintenabilité** : Facile d'ajouter/modifier/supprimer des routes  
✅ **Clarté** : Configuration déclarative lisible  
✅ **Auto-chargement** : Ajout automatique des nouveaux services  
✅ **Réutilisabilité** : Logique de proxy centralisée  

## Ajout d'un nouveau service

1. Créer `routes/services/mon-service.routes.js`
2. Définir la configuration (voir format ci-dessus)
3. **C'est tout !** Le service sera automatiquement chargé au démarrage
