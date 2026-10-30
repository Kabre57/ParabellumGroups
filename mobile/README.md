# Parabellum Mobile

Application React Native / Expo qui se connecte à l’API Parabellum Groups.

## Fonctions disponibles

- Connexion, mot de passe oublié et changement du mot de passe provisoire.
- Sélection d’entreprise et profil du compte.
- Consultation des demandes opérationnelles appartenant à l’utilisateur, avec leur détail et leur historique.
- Notifications de demandes et ouverture d’une demande depuis une notification.

La liste et le détail des demandes sont en lecture seule dans l’application mobile. La création, la modification, les décisions d’approbation et le traitement financier restent disponibles dans la version web, pas encore dans cette application.

## Développement

Utiliser Node.js 22.13 ou plus récent et pnpm 9.15.4. Depuis la racine du dépôt :

```bash
cd mobile
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm exec expo install --check --pnpm
```

La passerelle expose l’API sous `/api`. L’application utilise par défaut l’API de production `https://parabellum-erp.online/api`. Pour le développement local, copier `.env.example` vers `.env` dans `mobile/` et adapter `EXPO_PUBLIC_API_URL` :

- Simulateur iOS sur le Mac hébergeant l’API : `http://localhost:4000/api`.
- Émulateur Android standard : `http://10.0.2.2:4000/api`.
- Téléphone physique : IP locale du PC, par exemple `http://192.168.1.29:4000/api`.

Conserver le suffixe `/api`. Redémarrer Metro après une modification de l’URL.

## Parcours des demandes

Après connexion, l’application ouvre directement « Mes demandes opérationnelles ». La liste charge les demandes de l’utilisateur dans l’entreprise active depuis `GET /api/operational-requests?mine=true`. Le serveur vérifie les droits d’accès ; si la réponse est `403`, un administrateur doit attribuer une permission de lecture des demandes au compte.

Toucher une demande ouvre son détail, avec le bénéficiaire, le motif, le montant, le statut, les commentaires, l’historique et les noms des pièces jointes. Le geste de rafraîchissement recharge la liste.

## Build Android avec EAS

Lancer toutes les commandes EAS depuis `mobile/`, jamais depuis la racine du dépôt :

```bash
cd mobile
pnpm dlx eas-cli login
pnpm dlx eas-cli init --account kabre57
pnpm dlx eas-cli build --platform android --profile preview
```

`eas init` associe l’application mobile au projet Expo et écrit son identifiant dans `mobile/app.json`. Le projet Expo doit garder le slug `parabellum-mobile` et le package Android `com.parabellumgroups.mobile`. Le fichier `.easignore` est à la racine du dépôt ; ses exclusions `/services/`, `/docs/` et autres chemins ancrés ne doivent pas exclure `mobile/src/services/`.

Le profil `preview` produit un APK de test installable directement. Si Android affiche un avertissement Play Protect, vérifier que l’APK vient bien de la page du build EAS attendu. Pour une diffusion à des utilisateurs, utiliser un canal de test Google Play avant la publication publique.

## Arborescence mobile actuelle

```text
mobile/
├── app/
│   ├── (app)/
│   │   ├── demandes/
│   │   │   ├── _layout.tsx
│   │   │   ├── [id].tsx
│   │   │   └── index.tsx
│   │   ├── (tabs)/profil.tsx
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   ├── notifications.tsx
│   │   └── selection-entreprise.tsx
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── change-password.tsx
│   │   ├── forgot-password.tsx
│   │   ├── login.tsx
│   │   └── reset-password.tsx
│   └── _layout.tsx
├── src/
│   ├── api/                 # Authentification, HTTP, notifications et demandes
│   ├── components/          # Notifications, toast, header et menu
│   ├── services/            # Notifications push et liens vers une demande
│   └── stores/              # Session, entreprise, notifications et toast
├── .env.example
├── app.json
├── eas.json
├── package.json
└── pnpm-lock.yaml
```

## Notifications

Les notifications locales peuvent être essayées dans un build de développement. Pour les notifications push sur un build natif, le projet EAS doit être lié à `mobile/app.json` et les identifiants Android/iOS doivent être configurés. Dans Expo Go, les notifications push Android ne sont pas disponibles ; le test local reste possible.
