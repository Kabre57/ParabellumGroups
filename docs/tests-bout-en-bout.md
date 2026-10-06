# Tests de bout en bout

## Lancer les contrôles de la plateforme

Les tests de fumée vérifient que l’interface Web et la passerelle répondent, ouvrent une session avec un compte de test, puis exécutent une requête de lecture à travers la passerelle pour chacun des 12 services métier.

1. Démarrer la plateforme :

   ```sh
   docker compose up -d --build
   ```

2. Définir les identifiants d’un compte de test actif autorisé à consulter les modules concernés. Ne pas utiliser un compte de production :

   PowerShell :

   ```powershell
   $env:E2E_EMAIL = "compte-test@example.com"
   $env:E2E_PASSWORD = "mot-de-passe-du-compte-test"
   pnpm run test:e2e
   ```

   Bash :

   ```sh
   E2E_EMAIL="compte-test@example.com" E2E_PASSWORD="mot-de-passe-du-compte-test" pnpm run test:e2e
   ```

Les URL par défaut sont `http://localhost:3000` pour le frontend et `http://localhost:3001` pour la passerelle. Elles peuvent être remplacées avec `E2E_FRONTEND_URL` et `E2E_GATEWAY_URL`. `E2E_TIMEOUT_MS` règle le délai maximal d’une requête.

## Services contrôlés

Le script vérifie une route représentative en lecture pour l’authentification, la communication, les services techniques, le commerce, les stocks, les projets, les achats, les clients, les ressources humaines, la facturation/comptabilité, l’analytique et les notifications. Il ne crée et ne modifie aucune donnée métier.

Un résultat positif confirme que la route répond depuis l’interface/passerelle jusqu’au service ciblé et que la requête de lecture aboutit pour le compte de test. Un refus d’accès indique généralement qu’il manque une permission au compte ; une erreur serveur ou une route inaccessible indique un problème de service, de dépendance ou de routage.

Ces contrôles sont des tests de fumée de bout en bout. Ils ne remplacent pas les scénarios métier qui créent, valident puis vérifient des données dans chaque module. Ces scénarios doivent utiliser une base de test isolée et des données préparées afin de ne pas toucher aux données réelles.
