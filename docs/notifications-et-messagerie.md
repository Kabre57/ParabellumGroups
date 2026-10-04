# Notifications et messagerie interne

## Sources affichées dans l’application

La cloche et la page `/dashboard/notifications` réunissent deux sources :

- les alertes système enregistrées dans la base du `notification-service` ;
- les messages internes non lus enregistrés dans le `communication-service`.

La page `/dashboard/messages` utilise uniquement les messages du service Communication. Les deux listes sont actualisées par leurs flux SSE respectifs ; les notifications sont aussi relues périodiquement comme solution de reprise.

## Deux modèles de notification

Le schéma Communication contient encore une ancienne table `Notification` (`titre`, `lue`, `dateCreation`). La cloche actuelle ne la consulte pas : elle lit la table `Notification` du `notification-service` (`title`, `isRead`, `createdAt`). Ces modèles restent séparés pour éviter de déplacer ou convertir des données historiques pendant la correction. Toute nouvelle notification système doit passer par le `notification-service`.

## Pièces jointes des messages

Les fichiers des messages sont conservés dans le compartiment MinIO privé `communication-attachments`. La base Communication conserve leurs clés d’objet. Le service n’autorise le téléchargement qu’à l’expéditeur ou au destinataire du message. Les fichiers acceptés sont PDF, JPEG, PNG, WebP, TXT, CSV, DOCX et XLSX, avec une limite de 10 Mo par fichier et cinq fichiers par message.

Le `minio-init` du Compose principal crée ce compartiment sans activer l’accès anonyme. En déploiement, reconstruire le service Communication et démarrer le Compose afin que l’initialisation MinIO s’exécute avant le service.
