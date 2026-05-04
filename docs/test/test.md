# Nettoyage des donnees hors auth-service

Le test Node verifie seulement que le script est protege. Il ne vide aucune donnee.

Verifier ce qui sera nettoye :

```bash
npm run clean:non-auth:dry-run
```

Nettoyer les bases applicatives hors `parabellum_auth`, puis redemarrer les services applicatifs :

```bash
npm run clean:non-auth
```

Le script demandera de taper `NETTOYER`.

Commande sans confirmation, a utiliser seulement si tu es sur :

```bash
bash scripts/reset-non-auth-data.sh --yes
```

Avec vidage Redis en plus :

```bash
bash scripts/reset-non-auth-data.sh --yes --flush-redis
```

La base `parabellum_auth` reste protegee dans tous les cas.
