# Tutoriel Docker Compose - ParabellumGroups

Ce guide décrit le déploiement local de ParabellumGroups avec Docker Compose, à partir de la structure réelle du repo.

## 1. Prérequis

- Docker Engine 20.10+
- Docker Compose v2

Vérification:

```bash
docker --version
docker compose version
```

## 2. Structure réelle du projet

```text
ParabellumGroups/
├── .env
├── docker-compose.yml
├── docker-compose.override.yml
├── init-databases.sh
├── frontend/
│   ├── Dockerfile
│   └── ...
└── services/
    ├── api-gateway/
    ├── auth-service/
    ├── analytics-service/
    ├── billing-service/
    ├── commercial-service/
    ├── communication-service/
    ├── customer-service/
    ├── hr-service/
    ├── inventory-service/
    ├── notification-service/
    ├── procurement-service/
    ├── project-service/
    └── technical-service/
```

Notes importantes:
- Le script d'initialisation Postgres utilisé est `./init-databases.sh`.
- Il n'y a pas de dossier `docker/` utilisé par le `docker-compose.yml` courant.

## 3. Variables d'environnement

Le fichier `.env` racine doit au minimum définir:

```env
DB_USER=postgres
DB_PASSWORD=replace-with-a-strong-database-password
JWT_SECRET=replace-with-a-long-random-secret
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=replace-with-a-strong-minio-password
REDIS_PASSWORD=replace-with-a-strong-redis-password
```

## 4. Démarrage

Depuis la racine du projet:

```bash
docker compose up --build -d
```

Cette commande:
- construit le frontend et tous les services backend,
- démarre Postgres, Redis, MinIO,
- exécute `init-databases.sh` via l'init Docker Postgres,
- démarre l'API Gateway et les microservices.

## 5. Vérifier l'état

```bash
docker compose ps
```

## 6. Endpoints locaux

- Frontend: `http://localhost:3000`
- API Gateway: `http://localhost:3001`
- Health Gateway: `http://localhost:3001/health`
- Métriques Gateway: `http://localhost:3001/metrics`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

## 7. Logs

Tous les services:

```bash
docker compose logs -f
```

Un service précis:

```bash
docker compose logs -f hr-service
```

## 8. Commandes utiles

Arrêter les services:

```bash
docker compose stop
```

Redémarrer un service:

```bash
docker compose restart api-gateway
```

Redémarrer tout:

```bash
docker compose restart
```

Supprimer conteneurs + réseau:

```bash
docker compose down
```

Supprimer aussi les volumes (destructif données):

```bash
docker compose down -v
```

## 9. Développement avec override

`docker-compose.override.yml` est chargé automatiquement par `docker compose`.

Dans ce projet, il adapte notamment:
- `frontend` en `NODE_ENV=development` avec `NEXT_PUBLIC_API_URL=http://localhost:3001`,
- certaines options de debug pour Postgres/Redis.

Si tu veux ignorer l'override:

```bash
docker compose -f docker-compose.yml up --build -d
```

## 10. Dépannage rapide

Service qui ne démarre pas:

```bash
docker compose logs <nom_du_service>
```

Reconstruction propre:

```bash
docker compose down -v
docker compose up --build -d
```

Validation de la config Compose:

```bash
docker compose config
```
docker compose up -d nginx
docker compose up -d --build --no-deps frontend nginx
docker compose ps frontend nginx


Pour rappel, la commande de mise à jour conteneur (par service) reste la même :

docker compose up -d --build frontend
(ou technical-service, project-service, etc.).

Je comprends, et c’est normal si le frontend que tu vois tourne encore sur l’image précédente. On a bien poussé le commit, mais il faut rebuild + relancer le container frontend (et aussi appliquer la migration communication-service pour les relances).

Fais ceci sur le VPS :
cd /home/theo_pbl/apps/ParabellumGroups

# 1) Mettre le code à jour
git pull

# 2) Rebuilder et relancer le frontend
docker compose up -d --build frontend nginx

# 3) Appliquer la migration des campagnes (communication-service)
docker compose exec communication-service npx prisma migrate deploy


Voici les commandes pour effectuer un commit et un push propre de vos corrections :
1. Ajout ciblé des fichiers modifiés
Ajoutez uniquement les fichiers que nous avons corrigés ainsi que les changements de dépendances (package.json et package-lock.json) :
Bash
git add package.json package-lock.json \
src/components/commercial/terrain/ProspectionTerrainMap.tsx \
src/components/accounting/CreateCashVoucherDialog.tsx \
src/components/printComponents/printUtils.ts
2. Création du commit
Utilisez un message de commit clair décrivant les corrections :
Bash
git commit -m "fix: resolve build errors (leaflet dependencies, JSX scoping, and TS return types)"
3. Envoi sur le dépôt distant
Envoyez vos modifications sur votre branche actuelle (remplacez main par le nom de votre branche si nécessaire) :
Bash
git push origin main
Pourquoi ce commit est "propre" ?
Atomique : Il regroupe uniquement les modifications liées à la résolution des erreurs de build.
Explicite : Le message de commit suit les conventions standards (fix: ...) pour faciliter le suivi dans l'historique Git.
Sûr : En ciblant les fichiers individuellement avec git add, vous évitez d'ajouter par erreur des fichiers temporaires ou des fichiers de configuration locale.
