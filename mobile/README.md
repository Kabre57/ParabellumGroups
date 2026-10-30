# Parabellum Mobile

Application React Native / Expo qui se connecte à l’API Parabellum Groups.

## Fonctions disponibles

- Connexion, mot de passe oublié et changement du mot de passe provisoire.
- Sélection d’entreprise mémorisée par compte, et profil utilisateur.
- Demandes opérationnelles : création, modification d’un brouillon, soumission, consultation et historique.
- Files adaptées aux permissions : « Mes demandes », « À valider », « Traitement financier » et « Toutes du périmètre ».
- Approbation, rejet ou retour pour complément, ajout de justificatifs, création et synchronisation du bon de caisse, clôture.
- Notifications de demandes et ouverture d’une demande depuis une notification.

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

Après la première sélection, l’entreprise est enregistrée dans le stockage sécurisé de l’appareil pour le compte connecté. Elle est revalidée avec les entreprises auxquelles le compte a encore accès à la prochaine connexion. Le bouton « Changer d’entreprise » permet d’en choisir une autre.

La file initiale suit les permissions comme sur le web : approbation → « À valider », finance → « Traitement financier », lecture globale → « Toutes du périmètre », sinon → « Mes demandes ». Les onglets ne s’affichent que si le compte a les droits correspondants. Toutes les listes restent limitées à l’entreprise active côté API.

Le détail permet au demandeur de modifier un brouillon ou une demande retournée et de la soumettre. Un approbateur peut approuver, rejeter ou retourner une demande à compléter. La finance peut créer un bon de caisse, vérifier son statut et clôturer le dossier après décaissement. Les justificatifs PDF/JPG/PNG sont limités à 8 Mo. Les actions et changements d’état apparaissent dans l’historique.

Les permissions d’approbation donnent maintenant accès uniquement à la file `SUBMITTED` lorsque le compte n’a pas `read_all`. Elles ne donnent pas accès aux autres demandes de l’entreprise. Un refus `403` indique que le compte n’a pas le droit requis ; l’administrateur doit vérifier ses permissions.

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
