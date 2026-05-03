Le script n'était pas accessible dans le conteneur car le dossier scripts n'est pas synchronisé par défaut. Je vais donc copier manuellement le script dans le conteneur puis l'exécuter.

Voici les commandes que je vais lancer :
docker cp services/billing-service/scripts/test-investment-flow.js billing-service:/app/scripts/test-investment-flow.js
docker compose exec billing-service node scripts/test-investment-flow.js