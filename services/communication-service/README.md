# Communication Service

Service de gestion de la communication pour l'ERP (emails, SMS, notifications).

## Port
4011

## Fonctionnalités

### Messages
- Création et gestion de messages
- Envoi d'emails avec pièces jointes
- Marquer comme lu
- Archivage

### Templates
- Création de templates réutilisables
- Support des variables dynamiques
- Prévisualisation avant envoi
- Duplication de templates

### Notifications
- Notifications temps réel pour les utilisateurs
- Types : INFO, WARNING, ERROR, SUCCESS
- Marquage comme lue
- Suppression des notifications lues

### Campagnes Email
- Création de campagnes d'emailing
- Programmation d'envoi
- Suivi des statistiques (envoyés, lus, erreurs)
- Utilisation de templates

## API Endpoints

### Messages
- `POST /api/messages` - Créer un message
- `GET /api/messages` - Liste des messages
- `GET /api/messages/:id` - Détails d'un message
- `PUT /api/messages/:id` - Modifier un message
- `DELETE /api/messages/:id` - Supprimer un message
- `POST /api/messages/:id/send` - Envoyer un message
- `PUT /api/messages/:id/read` - Marquer comme lu
- `PUT /api/messages/:id/archive` - Archiver un message

### Templates
- `POST /api/templates` - Créer un template
- `GET /api/templates` - Liste des templates
- `GET /api/templates/:id` - Détails d'un template
- `PUT /api/templates/:id` - Modifier un template
- `DELETE /api/templates/:id` - Supprimer un template
- `POST /api/templates/:id/preview` - Prévisualiser avec variables
- `POST /api/templates/:id/duplicate` - Dupliquer un template

### Notifications
- `POST /api/notifications` - Créer une notification
- `GET /api/notifications/user/:userId` - Notifications d'un utilisateur
- `PUT /api/notifications/:id/read` - Marquer comme lue
- `DELETE /api/notifications/user/:userId/read` - Supprimer les lues
- `DELETE /api/notifications/:id` - Supprimer une notification

### Campagnes
- `POST /api/campagnes` - Créer une campagne
- `GET /api/campagnes` - Liste des campagnes
- `GET /api/campagnes/:id` - Détails d'une campagne
- `PUT /api/campagnes/:id` - Modifier une campagne
- `DELETE /api/campagnes/:id` - Supprimer une campagne
- `POST /api/campagnes/:id/schedule` - Programmer l'envoi
- `POST /api/campagnes/:id/start` - Démarrer l'envoi
- `GET /api/campagnes/:id/stats` - Statistiques

## Configuration

Variables d'environnement (.env) :
```
DATABASE_URL=postgresql://user:password@localhost:5432/communication_db
PORT=4011
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-password
SMTP_FROM=noreply@example.com
```

## Installation

```bash
npm install
npx prisma generate
npx prisma db push
npm start
```

## Dépendances

- express: Serveur web
- @prisma/client: ORM base de données
- nodemailer: Envoi d'emails
- cors: Gestion CORS
- dotenv: Variables d'environnement
- axios: Requêtes HTTP

## Modèles de données

### Message
- Types: EMAIL, SMS, NOTIFICATION
- Status: BROUILLON, ENVOYE, LU, ARCHIVE
- Support pièces jointes

### Template
- Variables dynamiques avec format {{variable}}
- Types: EMAIL, SMS, NOTIFICATION
- Activation/désactivation

### Notification
- Types: INFO, WARNING, ERROR, SUCCESS
- Suivi lecture avec timestamp

### CampagneMail
- Status: BROUILLON, PROGRAMMEE, EN_COURS, TERMINEE, ANNULEE
- Statistiques détaillées
- Lien avec templates
