# Tutoriel : Déployer le Projet ParabellumGroups avec Docker Compose

Ce tutoriel détaillé vous guidera à travers les étapes nécessaires pour déployer et exécuter l'application ParabellumGroups en utilisant Docker Compose. ParabellumGroups est une application microservices comprenant un frontend Next.js, une API Gateway, et plusieurs services backend développés avec Node.js et Prisma.

L'utilisation de Docker Compose simplifie considérablement le processus de déploiement en encapsulant chaque service dans son propre conteneur isolé, gérant leurs dépendances et leur communication.

## 1. Introduction à Docker et Docker Compose

**Docker** est une plateforme qui permet de développer, déployer et exécuter des applications dans des conteneurs. Un conteneur est une unité logicielle standardisée qui regroupe le code de l'application et toutes ses dépendances, garantissant que l'application fonctionne de manière fiable dans n'importe quel environnement.

**Docker Compose** est un outil pour définir et exécuter des applications Docker multi-conteneurs. Avec Compose, vous utilisez un fichier YAML pour configurer les services de votre application. Ensuite, une seule commande crée et démarre tous les services à partir de votre configuration.

## 2. Prérequis

Pour suivre ce tutoriel, vous devez avoir les logiciels suivants installés sur votre machine :

*   **Docker Engine** : Version 20.10.0 ou supérieure. C'est le moteur qui exécute les conteneurs Docker.
    *   [Guide d'installation de Docker](https://docs.docker.com/engine/install/)
*   **Docker Compose** : Version 1.29.0 ou supérieure, ou Docker Compose V2 (qui est souvent inclus avec les installations récentes de Docker Desktop).
    *   [Guide d'installation de Docker Compose](https://docs.docker.com/compose/install/)

Pour vérifier vos installations, ouvrez un terminal et exécutez les commandes suivantes :

```bash
docker --version
docker compose version
```

## 3. Structure du Projet ParabellumGroups

Le projet est organisé de manière modulaire pour faciliter le développement et le déploiement. Voici un aperçu de sa structure :

```
ParabellumGroups/
├── frontend/                  # Application frontend Next.js
│   ├── Dockerfile             # Dockerfile pour le frontend
│   ├── package.json           # Dépendances du frontend
│   └── ...
├── services/                  # Répertoire contenant tous les microservices backend
│   ├── api-gateway/           # Point d'entrée pour toutes les requêtes API
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── ...
│   ├── auth-service/          # Gestion de l'authentification et des utilisateurs
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── prisma/            # Schéma Prisma et migrations
│   │   └── ...
│   ├── billing-service/       # Gestion de la facturation
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   ├── prisma/
│   │   └── ...
│   ├── ... (autres microservices similaires)
├── docker/                    # Fichiers de configuration Docker personnalisés
│   ├── entrypoint.sh          # Script d'entrée commun pour les services Node.js
│   └── postgres/              # Configuration spécifique à PostgreSQL
│       └── init-db.sh         # Script d'initialisation des bases de données PostgreSQL
├── .env                       # Variables d'environnement pour Docker Compose
├── docker-compose.yml         # Fichier de configuration principal de Docker Compose
└── README.md                  # Documentation générale du projet
```

Chaque microservice dans le dossier `services/` possède son propre `Dockerfile` pour construire son image, et la plupart d'entre eux utilisent Prisma avec une base de données PostgreSQL. L'API Gateway sert de proxy pour router les requêtes vers les services appropriés. Le frontend est une application Next.js qui interagit avec l'API Gateway.

## 4. Configuration des Variables d'Environnement

Le fichier `.env` à la racine du projet contient les variables d'environnement utilisées par Docker Compose et les services. Il est crucial de le configurer correctement avant le déploiement.

```env
# Database Configuration
DB_USER=parabellum
DB_PASSWORD=parabellum2025

# Environment
NODE_ENV=development

# API Gateway Port
PORT=3001

# JWT Secret (IMPORTANT: Change this in production)
JWT_SECRET=your-super-secret-jwt-key-change-me-in-production
```

**Points importants :**

*   **`DB_USER` et `DB_PASSWORD`** : Ces identifiants sont utilisés pour la connexion à la base de données PostgreSQL. Vous pouvez les modifier, mais assurez-vous qu'ils correspondent aux configurations internes de vos services si vous les avez personnalisés.
*   **`NODE_ENV`** : Définit l'environnement d'exécution (par exemple, `development`, `production`). Cela peut influencer le comportement des services (par exemple, le niveau de journalisation).
*   **`PORT`** : Le port sur lequel l'API Gateway sera exposée sur votre machine hôte.
*   **`JWT_SECRET`** : **Très important !** Pour les environnements de production, vous devez absolument remplacer `your-super-secret-jwt-key-change-me-in-production` par une chaîne de caractères longue, complexe et aléatoire. C'est la clé utilisée pour signer et vérifier les JSON Web Tokens (JWT) pour l'authentification.

Vous pouvez éditer ce fichier avec n'importe quel éditeur de texte. Assurez-vous de sauvegarder les modifications après édition.

## 5. Déploiement de l'Application avec Docker Compose

Une fois les prérequis installés et le fichier `.env` configuré, vous êtes prêt à déployer l'application.

### 5.1. Navigation vers le Répertoire du Projet

Ouvrez votre terminal ou invite de commande et naviguez jusqu'au répertoire racine du projet `ParabellumGroups` :

```bash
cd /path/to/ParabellumGroups
```

Remplacez `/path/to/ParabellumGroups` par le chemin réel où vous avez extrait le projet.

### 5.2. Construction et Démarrage des Services

Exécutez la commande suivante pour construire les images Docker et démarrer tous les services définis dans `docker-compose.yml` :

```bash
docker compose up --build -d
```

*   **`docker compose up`** : Cette commande lit le fichier `docker-compose.yml` et crée les conteneurs pour chaque service.
*   **`--build`** : Force la reconstruction des images Docker. C'est essentiel lors du premier déploiement ou après avoir modifié le code source des services ou leurs `Dockerfile`s. Si vous n'avez pas modifié le code ou les configurations Docker, vous pouvez omettre cette option pour un démarrage plus rapide (`docker compose up -d`).
*   **`-d` (détaché)** : Démarre les conteneurs en arrière-plan, libérant ainsi votre terminal. Si vous souhaitez voir les logs de tous les services en temps réel, omettez cette option (mais vous ne pourrez pas utiliser le terminal pour d'autres commandes tant que les services ne sont pas arrêtés).

**Que se passe-t-il lors de l'exécution de cette commande ?**

1.  **Construction des Images** : Docker Compose va d'abord construire les images pour le frontend et chaque microservice en utilisant leurs `Dockerfile`s respectifs.
2.  **Démarrage de PostgreSQL et Redis** : Les conteneurs de base de données (`db`) et de cache (`redis`) sont démarrés.
3.  **Initialisation de la Base de Données** : Le script `./docker/postgres/init-db.sh` est exécuté dans le conteneur PostgreSQL. Ce script crée automatiquement toutes les bases de données nécessaires pour les microservices (par exemple, `parabellum_auth`, `parabellum_technical`, etc.).
4.  **Démarrage des Microservices** : Chaque microservice Node.js est démarré. Grâce au script `./docker/entrypoint.sh`, chaque service vérifie s'il contient un dossier `prisma` et, si c'est le cas, exécute `npx prisma migrate deploy` pour appliquer les migrations de base de données. Cela garantit que le schéma de chaque base de données est à jour.
5.  **Démarrage de l'API Gateway** : L'API Gateway est démarrée et configurée pour router les requêtes vers les microservices appropriés.
6.  **Démarrage du Frontend** : L'application Next.js est démarrée et est prête à servir l'interface utilisateur.

### 5.3. Vérification de l'État des Services

Après quelques instants (le temps que tous les services démarrent et que les bases de données s'initialisent), vous pouvez vérifier l'état de vos conteneurs :

```bash
docker compose ps
```

Vous devriez voir une liste de tous les services avec leur état. Idéalement, tous devraient être en état `running` ou `healthy`.

```
NAME                          COMMAND                  SERVICE             STATUS              PORTS
api-gateway                   "docker-entrypoint.s…"   api-gateway         running             0.0.0.0:3001->3001/tcp
auth-service                  "docker-entrypoint.s…"   auth-service        running             4001/tcp
parabellum-db                 "docker-entrypoint.s…"   db                  running (healthy)   5432/tcp
parabellum-frontend           "docker-entrypoint.s…"   frontend            running             0.0.0.0:3000->3000/tcp
parabellum-redis              "docker-entrypoint.s…"   redis               running (healthy)   6379/tcp
...
```

### 5.4. Accès à l'Application

Une fois tous les services démarrés et en cours d'exécution :

*   **Application Frontend** : Ouvrez votre navigateur web et accédez à `http://localhost:3000`.
*   **API Gateway** : L'API Gateway est accessible à `http://localhost:3001`. C'est le point d'entrée pour toutes les requêtes API de votre frontend.

Félicitations ! Votre application ParabellumGroups est maintenant déployée et fonctionne via Docker Compose.

## 6. Gestion des Services Docker Compose

### 6.1. Afficher les Logs des Services

Pour diagnostiquer des problèmes ou simplement observer le comportement de vos services, vous pouvez afficher leurs logs :

*   **Logs de tous les services** :

    ```bash
docker compose logs -f
    ```

    L'option `-f` (follow) permet de voir les logs en temps réel.

*   **Logs d'un service spécifique** (par exemple, `auth-service`) :

    ```bash
docker compose logs -f auth-service
    ```

### 6.2. Arrêter les Services

Pour arrêter tous les services sans supprimer les conteneurs ou les volumes de données :

```bash
docker compose stop
```

Les conteneurs existeront toujours et pourront être redémarrés rapidement avec `docker compose start`.

### 6.3. Redémarrer les Services

Si vous avez apporté des modifications au code de vos services (et que vous avez reconstruit les images), ou si un service est tombé en panne, vous pouvez le redémarrer :

```bash
docker compose restart [nom_du_service]
```

Par exemple, pour redémarrer l'API Gateway :

```bash
docker compose restart api-gateway
```

Pour redémarrer tous les services :

```bash
docker compose restart
```

### 6.4. Supprimer les Services et les Volumes

Lorsque vous avez terminé de travailler sur le projet ou que vous souhaitez un redémarrage propre, vous pouvez supprimer les conteneurs, les réseaux et, optionnellement, les volumes de données.

*   **Arrêter et supprimer les conteneurs et réseaux (conserve les volumes de données)** :

    ```bash
docker compose down
    ```

*   **Arrêter et supprimer les conteneurs, réseaux ET volumes de données** :

    ```bash
docker compose down -v
    ```

    **Attention** : L'option `-v` supprimera toutes les données stockées dans la base de données PostgreSQL et Redis. Utilisez-la avec prudence.

## 7. Dépannage Courant

### 7.1. Problèmes de Démarrage des Services

Si un service ne démarre pas ou s'arrête immédiatement, vérifiez les logs du service concerné :

```bash
docker compose logs [nom_du_service]
```

Recherchez les messages d'erreur qui peuvent indiquer :

*   **Erreurs de configuration** : Vérifiez votre fichier `.env` et les variables d'environnement dans `docker-compose.yml`.
*   **Dépendances manquantes** : Assurez-vous que `npm install` s'est exécuté correctement lors de la construction de l'image.
*   **Problèmes de connexion à la base de données** : Vérifiez que le service `db` est `healthy` et que les `DATABASE_URL` sont correctes.

### 7.2. Erreurs de Connexion entre Services

Si les services ne peuvent pas communiquer entre eux (par exemple, l'API Gateway ne peut pas atteindre `auth-service`) :

*   **Vérifiez les noms des services** : Dans `docker-compose.yml`, les services communiquent en utilisant leurs noms de service comme noms d'hôte (par exemple, `http://auth-service:4001`). Assurez-vous que les URLs dans les variables d'environnement de l'API Gateway correspondent aux noms des services Docker Compose.
*   **Réseaux Docker** : Assurez-vous que tous les services sont sur le même réseau Docker (ici, `parabellum-network`).

### 7.3. Problèmes de Migration Prisma

Si les services backend ne parviennent pas à se connecter à la base de données ou si des erreurs de schéma surviennent :

*   **Vérifiez le script `entrypoint.sh`** : Assurez-vous qu'il est correctement monté et exécuté pour chaque service.
*   **Logs de la base de données** : Vérifiez les logs du service `db` pour toute erreur liée à l'initialisation ou aux connexions.
*   **Réinitialisation de la base de données** : En cas de problèmes persistants avec les migrations, vous pouvez essayer de supprimer complètement les volumes de données et de redémarrer :

    ```bash
docker compose down -v
docker compose up --build -d
    ```

## 8. Conclusion

Vous avez maintenant un environnement de développement et de déploiement robuste pour votre projet ParabellumGroups, entièrement géré par Docker Compose. Cette approche garantit la cohérence de l'environnement, simplifie l'intégration continue et facilite la collaboration au sein de votre équipe.

N'hésitez pas à explorer davantage la documentation de Docker et Docker Compose pour des configurations plus avancées ou des optimisations spécifiques à vos besoins.

---

**Auteur :** Manus AI
**Date :** 5 Février 2026

## Références

[1] Docker Documentation: [https://docs.docker.com/](https://docs.docker.com/)
[2] Docker Compose Documentation: [https://docs.docker.com/compose/](https://docs.docker.com/compose/)
[3] Prisma Documentation: [https://www.prisma.io/docs/](https://www.prisma.io/docs/)
