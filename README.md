# Déploiement de ParabellumGroups avec Docker Compose

Ce document explique comment déployer l'application ParabellumGroups, composée d'un frontend Next.js et de plusieurs microservices Node.js, à l'aide de Docker Compose.

## 1. Prérequis

Avant de commencer, assurez-vous que les éléments suivants sont installés sur votre système :

*   **Docker** : Version 20.10.0 ou supérieure.
*   **Docker Compose** : Version 1.29.0 ou supérieure (ou Docker Compose V2).

## 2. Structure du Projet

Le projet est organisé comme suit :

*   `frontend/` : L'application frontend développée avec Next.js.
*   `services/` : Contient les différents microservices Node.js (authentification, technique, projet, etc.).
*   `docker-compose.yml` : Le fichier principal de configuration Docker Compose pour l'ensemble de l'application.
*   `.env` : Fichier de configuration des variables d'environnement.
*   `docker/` : Contient les scripts Docker personnalisés (par exemple, `init-db.sh` pour PostgreSQL, `entrypoint.sh` pour les services Node.js).

## 3. Configuration

Un fichier `.env` est fourni à la racine du projet pour configurer les variables d'environnement essentielles. Vous pouvez le modifier selon vos besoins. Voici un exemple des variables importantes :

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

Assurez-vous de définir un `JWT_SECRET` fort et unique pour les environnements de production.

## 4. Déploiement

Pour déployer l'application, suivez les étapes ci-dessous :

1.  **Naviguez vers le répertoire racine du projet** :

    ```bash
    cd /path/to/ParabellumGroups
    ```

2.  **Construisez et démarrez les services Docker** :

    ```bash
    docker-compose up --build -d
    ```

    *   `--build` : Reconstruit les images Docker (utile lors des premières exécutions ou après des modifications de code).
    *   `-d` : Démarre les conteneurs en mode détaché (en arrière-plan).

    Cette commande va :
    *   Construire les images Docker pour le frontend et chaque microservice.
    *   Démarrer les conteneurs pour la base de données PostgreSQL, Redis, l'API Gateway, le frontend et tous les microservices.
    *   Exécuter le script `init-db.sh` pour créer les bases de données nécessaires dans PostgreSQL.
    *   Exécuter les migrations Prisma pour chaque microservice qui en a besoin via le script `entrypoint.sh`.

3.  **Vérifiez l'état des services** :

    ```bash
    docker-compose ps
    ```

    Tous les services devraient être en état `Up`.

## 5. Accès à l'Application

Une fois les services démarrés :

*   **Frontend** : Accessible via votre navigateur à l'adresse `http://localhost:3000`.
*   **API Gateway** : Accessible à l'adresse `http://localhost:3001`.

## 6. Migrations de Base de Données (Prisma)

Chaque microservice utilisant Prisma est configuré pour exécuter automatiquement ses migrations lors du démarrage du conteneur, grâce au script `docker/entrypoint.sh`. Ce script vérifie la présence d'un dossier `prisma` et exécute `npx prisma migrate deploy` si nécessaire. Cela garantit que votre base de données est toujours à jour avec le schéma de votre application.

## 7. Arrêter et Supprimer les Services

Pour arrêter les services et supprimer les conteneurs, réseaux et volumes (attention, cela supprimera les données de la base de données) :

```bash
docker-compose down -v
```

*   `-v` : Supprime également les volumes de données, ce qui est utile pour un redémarrage propre ou pour libérer de l'espace disque.

Pour arrêter les services sans supprimer les volumes :

```bash
docker-compose down
```

---

**Auteur :** Manus AI
**Date :** 5 Février 2026
