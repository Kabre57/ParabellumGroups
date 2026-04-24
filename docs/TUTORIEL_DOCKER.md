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
docker compose logs -f parabellum_billing

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

docker compose up -d --build billing-service
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


<<<<<<< Updated upstream
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
=======

Parfait, merci pour la précision. Si tu es sur le VPS, alors pour récupérer les derniers changements il faut faire le pull sur le VPS, pas en local.

Voici la commande exacte à exécuter sur le VPS :

cd ~/apps/ParabellumGroups
git pull
Si tu veux je peux aussi lancer la rebuild après, par exemple :

docker compose up -d --build frontend


Bien vu — la variable est correcte, mais le service Postgres n’est pas joignable depuis ta session shell, parce que postgres est un nom DNS valide uniquement dans le réseau Docker.

Tu as deux options :

✅ Option A (recommandée, la plus simple)
Exécuter la migration depuis le conteneur billing-service, où postgres est accessible :

cd /home/theo_pbl/apps/ParabellumGroups
docker compose exec billing-service npx prisma migrate dev -n add_treasury_closures
✅ Option B (si tu veux lancer depuis le VPS directement)
Il faut une URL avec l’IP/localhost au lieu de postgres.
Exemple (si Postgres est exposé en local) :

export DATABASE_URL="postgresql://parabellum:...@127.0.0.1:5432/parabellum_billing?schema=public"
npx prisma migrate dev -n add_treasury_closures
Je te conseille Option A, ça marchera tout de suite.
Tu veux que je continue sur la validation des clôtures par rôle après ça ?
>>>>>>> Stashed changes


C'est un plaisir de voir cet écran de connexion ! Voici un guide de maintenance complet pour gérer sereinement votre nouveau serveur de production.

J'ai préparé ce guide sous forme d'artifact pour que vous puissiez le conserver précieusement.

Guide de Maintenance : Parabellum ERP
Ce guide récapitule les commandes essentielles pour administrer votre infrastructure Docker sur le VPS.

1. Gestion des Services (Docker Compose)
Toutes ces commandes doivent être exécutées depuis le dossier du projet : ~/apps/ParabellumGroups.

Voir l'état de tous les services :
bash
docker compose ps
Redémarrer tous les services :
bash
docker compose restart
Redémarrer un service spécifique (ex: frontend) :
bash
docker compose restart frontend
Arrêter proprement toute l'application :
bash
docker compose down
Démarrer l'application (et reconstruire si changement de code) :
bash
docker compose up -d --build
2. Consultation des Logs (Débogage)
Les logs sont vos meilleurs amis pour comprendre ce qui se passe à l'intérieur des conteneurs.

Logs de tous les services en temps réel :
bash
docker compose logs -f
Logs d'un service spécifique (ex: customer-service) :
bash
docker compose logs -f customer-service
Logs de Nginx (Host) pour les problèmes de connexion/SSL :
bash
sudo tail -f /var/log/nginx/error.log
3. Base de Données & Sauvegarde
Accéder à la console PostgreSQL (si besoin) :
bash
docker exec -it parabellum-db psql -U postgres -d parabellum_customers
Effectuer une sauvegarde rapide (Dump) :
bash
docker exec -t parabellum-db pg_dumpall -c -U postgres > dump_$(date +%Y%m%d).sql
4. Maintenance du Serveur (UFW & Nginx)
Vérifier le pare-feu : sudo ufw status
Recharger la configuration Nginx de l'hôte (après modification de fichier de conf) :
bash
sudo nginx -t && sudo systemctl reload nginx
5. Procédure de mise à jour du code
Lorsque vous faites des modifications sur GitHub et que vous voulez les mettre en production :

git pull
docker compose up -d --build (Docker ne reconstruira que les modules modifiés).
TIP

Nettoyage de l'espace disque : Docker consomme de l'espace au fil des builds. Si votre disque sature, utilisez cette commande pour supprimer les images inutilisées : docker system prune -a (attention, cela supprimera les images non utilisées par des conteneurs actifs).

Félicitations encore pour ce lancement réussi ! Votre ERP est maintenant prêt pour ses premiers utilisateurs. Avez-vous besoin d'aide sur un point spécifique avant de conclure cette session ?
