# Notification Service

Service de notifications Parabellum : persistance PostgreSQL, flux SSE pour l'interface web et livraison push Expo pour les événements des Demandes Opérationnelles.

## Push mobile

L'endpoint interne `POST /internal/notifications` reçoit les événements signés de l'`operational-request-service`. Pour les liens `/dashboard/demandes-operationnelles`, il consulte les tokens de chaque destinataire dans l'`auth-service`, puis envoie à `https://exp.host/--/api/v2/push/send` un message contenant `title`, `body`, `sound: "default"`, `channelId: "operational-requests"`, `priority: "high"` et `data: { link, enterpriseId }`.

La récupération des tokens utilise `AUTH_SERVICE_URL` et un JWT de service signé avec `JWT_SECRET` (issuer `parabellum-notification-service`). Le point de terminaison interne de l'auth-service n'est pas routé par la Gateway. Configurez ces variables sur les deux services. Les erreurs Expo sont renvoyées comme échec interne afin de laisser l'outbox retenter la livraison.

## Vérification

```sh
pnpm test
pnpm build
```

Les tests de `tests/expo-push.test.cjs` simulent l'API Expo et vérifient le payload ainsi que les réponses HTTP/tickets en erreur.
