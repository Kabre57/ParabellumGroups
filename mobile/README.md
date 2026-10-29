# Parabellum Mobile

Application React Native / Expo du module **Demandes opérationnelles**.

## État actuel

Phases 1, 2a, 2b-1 et 2b-2 : configuration Expo SDK 58, TypeScript strict, thème
React Native Paper Material 3, providers racine, types et constantes métier,
client HTTP, stores Zustand, permissions et services API. La Phase 3 ajoute le
login, les layouts d'authentification, la sélection d'entreprise, le profil et les
redirections d'accueil selon les permissions. La Phase 4 ajoute la liste des
demandes, ses onglets autorisés, la pagination, le rafraîchissement et les cartes
avec badges de statut. Les redirections `/demandes?view=...` aboutissent à cette
liste. La Phase 5a ajoute le formulaire partagé, la création de brouillons et
l'édition des demandes du propriétaire en `DRAFT` ou `NEEDS_INFO`. La Phase 5b
ajoute le détail, la timeline, les actions contextuelles et le bouton de création
près du contexte d'entreprise de la liste. Les cartes et liens `/demandes?request=...` ouvrent
désormais le détail `/demandes/[id]` ; le bouton « Nouvelle demande » ouvre
`/demandes/nouvelle` pour les utilisateurs autorisés. La Phase 6a ajoute les
composants d'upload et de création de bon de caisse, ainsi que le Snackbar global
monté dans le layout racine. La Phase 6b finalise le raccordement complet :
upload de pièces jointes depuis le détail (avec contrôle de permission et de statut),
création du bon de caisse depuis le détail (avec gestion du 409 Billing), liaison et
reprise après échec partiel.

Application mobile fonctionnellement complète pour le module Demandes opérationnelles.
La navigation globale comprend un header Material 3, un menu latéral avec le
compte connecté et les onglets inférieurs « Demandes » et « Profil ».
Les notifications disposent d'un canal Android avec son/vibration, d'un test
local depuis le profil et d'une ouverture des demandes dans leur entreprise.
La cloche du header affiche le nombre de notifications non lues et ouvre la
liste ; toucher une notification vérifie la demande et son entreprise avant
d'ouvrir son détail. Dans Expo Go, l'activation distante est désactivée avec
une explication, tandis que le test de notification locale reste accessible.
Le mobile enregistre et révoque les tokens push auprès de l'API ; le backend
envoie les notifications des demandes via Expo. Les prérequis de build EAS
sont décrits dans la section « Notifications ».

## Commandes pnpm

Utiliser **Node.js 22.13 ou plus récent** et **pnpm 9.15.4**, déclaré dans
`package.json`, pour toutes les commandes. Expo SDK 58 ne fonctionne pas avec
Node 20.
Depuis la racine du dépôt :

```bash
cd mobile
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm exec expo install --check --pnpm
```

La passerelle API expose les services sous `/api`. Copier `.env.example` vers
`.env`, puis adapter `EXPO_PUBLIC_API_URL` à l'appareil utilisé :

```bash
cp -n .env.example .env
# Adapter l'URL dans .env avant de lancer Metro.
pnpm start
```

Le suffixe `/api` doit être conservé. Le simulateur iOS sur le Mac hébergeant
l'API utilise `http://localhost:4000/api`. L'émulateur Android standard utilise
`http://10.0.2.2:4000/api`. Sur un téléphone physique, remplacer `localhost` par
l'adresse IP locale du PC, par exemple `http://192.168.1.29:4000/api` ; l'IP
dépend du réseau et les deux appareils doivent pouvoir communiquer.

Dans le `docker-compose.yml` de ce dépôt, Nginx publie par défaut le port `8080`.
Pour utiliser les URL mobiles ci-dessus avec cette stack, définir `NGINX_HOST_PORT=4000`
dans le `.env` de la racine avant de démarrer Docker ; sinon, mettre dans le `.env`
mobile le port réellement publié par la stack.

Pour vérifier que la passerelle est atteinte, `/api/auth/me` répond `401` sans
jeton : cette réponse confirme que l'API est joignable.

Le `.env` local est déjà ignoré par le `.gitignore` du dépôt. Redémarrer Metro
après un changement d'URL.

Lancement sur un appareil ou un simulateur :

```bash
pnpm android
pnpm ios
```

Le simulateur iOS nécessite macOS.

Pour ajouter une dépendance native, laisser Expo choisir une version compatible :

```bash
pnpm exec expo install <dependance> --pnpm
```

Pour une dépendance JavaScript, utiliser `pnpm add <dependance>` ; pour un outil de
développement, utiliser `pnpm add -D <dependance>`. Toute modification des
dépendances doit inclure la mise à jour de `pnpm-lock.yaml`.

## Architecture actuelle

Cette arborescence décrit uniquement les fichiers présents. Les dépendances
installées et les fichiers générés par les outils sont omis.

```text
mobile/
├── app/
│   ├── (auth)/
│   │   ├── _layout.tsx     # Vérification locale et accueil des écrans publics
│   │   └── login.tsx       # Validation RHF/Zod et connexion TanStack Query
│   ├── (app)/
│   │   ├── _layout.tsx     # Garde de session et Drawer Expo Router
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx # Tabs Expo Router et barre Paper Demandes/Profil
│   │   │   ├── demandes/
│   │   │   │   ├── _layout.tsx # Stack des demandes et titres du header global
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── edit.tsx # Édition propriétaire en DRAFT/NEEDS_INFO
│   │   │   │   │   └── index.tsx # Détail, décisions, soumission, clôture et synchronisation
│   │   │   │   ├── index.tsx # Filtres autorisés, création, liste et pagination
│   │   │   │   └── nouvelle.tsx # Création d'un brouillon et retours d'enregistrement
│   │   │   └── profil.tsx  # Informations du compte, entreprise et déconnexion
│   │   ├── index.tsx       # Redirection vers la vue autorisée des demandes
│   │   └── selection-entreprise.tsx # Entreprises du store ou de l'API
│   └── _layout.tsx         # GestureHandlerRootView, QueryClient, Paper, SafeArea et Snackbar
├── src/
│   ├── api/
│   │   ├── auth.ts         # Connexion, profil et entreprises ; adaptation backend
│   │   ├── billing.ts      # Trésorerie et bons de caisse créés en brouillon
│   │   ├── client.ts       # Axios, JWT SecureStore, entreprise active et erreurs 401
│   │   └── operationalRequests.ts # Appels du cycle de vie et envoi des pièces jointes
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppHeader.tsx # Appbar Paper : menu, titre courant et accès au profil
│   │   │   ├── AppDrawerContent.tsx # Compte, liens principaux et déconnexion en bas
│   │   │   └── AppTabBar.tsx # BottomNavigation.Bar Paper reliée aux Tabs Expo Router
│   │   ├── AttachmentPicker.tsx # Choix PDF/JPG/PNG, contrôle de taille et upload
│   │   ├── CashVoucherModal.tsx # Création Billing en brouillon, puis liaison au dossier
│   │   ├── NotificationSettings.tsx # Autorisation et test local de notification en développement
│   │   ├── RequestCard.tsx # Carte cliquable : bénéficiaire, motif, montant et date
│   │   ├── RequestDetail.tsx # Informations, justificatifs et actions avec confirmation
│   │   ├── RequestForm.tsx # Formulaire RHF/Zod, détails par type et sélecteur de date
│   │   ├── StatusBadge.tsx # Libellé et couleurs du statut, accessibles
│   │   ├── Timeline.tsx    # Historique traduit, acteurs, dates et commentaires
│   │   └── Toast.tsx       # Snackbar global, couleurs par type et durée de 3 secondes
│   ├── constants/
│   │   ├── format.ts       # Montants XOF, dates et heures en français
│   │   ├── status.ts       # Libellés et couleurs des statuts
│   │   └── types.ts        # Types de demande et champs spécifiques des formulaires
│   ├── hooks/
│   │   ├── useLogout.ts    # Déconnexion commune au menu et au profil, erreurs et cache
│   │   ├── useOperationalRequests.ts # Queries liste/détail et mutations create/update
│   │   └── usePermissions.ts # Droits mémorisés ; décisions interdites aux admins
│   ├── services/
│   │   ├── notificationService.ts # Permissions, canal Android, token Expo et notifications locales
│   │   └── notificationLinking.ts # Conversion des liens et recherche de l'entreprise autorisée
│   ├── stores/
│   │   ├── authStore.ts    # Utilisateur, rôle, token/statut push en mémoire et déconnexion
│   │   ├── enterpriseStore.ts # Liste et sélection de l'entreprise active
│   │   └── toastStore.ts   # État des notifications rendues par le Snackbar global
│   ├── theme/
│   │   └── index.ts        # Thème Material 3, couleurs et police système
│   └── types/
│       └── operationalRequest.ts # Demandes, statuts, historique et pièces jointes
├── .env.example            # URL publique de l'API selon le type d'appareil
├── app.json                # Identité Expo, plateformes, permissions et plugins
├── patches/
│   └── react-native-drawer-layout@4.2.12.patch # Compatibilité des animations natives Reanimated
├── package.json            # Dépendances, scripts et version de pnpm
├── pnpm-lock.yaml          # Versions résolues pour les installations reproductibles
├── pnpm-workspace.yaml     # Configuration pnpm propre à l'application mobile
├── README.md               # Démarrage, architecture et suivi du projet mobile
└── tsconfig.json           # TypeScript strict et alias @/* vers src/*
```

Le layout protégé conserve la restauration de session avant de monter le
`Drawer` de `expo-router/drawer`. Le menu affiche le prénom, le nom et l'email,
puis les liens « Demandes opérationnelles », « Mon profil » et la déconnexion.
Le groupe `(tabs)` imbrique les onglets « Demandes » et « Profil » dans ce drawer ;
les groupes entre parenthèses ne changent pas les URL publiques `/demandes` et
`/profil`. Les liens existants, dont `/demandes?view=...`, `/demandes?request=...`
et `/demandes/[id]/edit`, conservent ainsi leur destination.

Avec Expo SDK 58, les onglets JavaScript s'importent depuis `expo-router/js-tabs`
(`expo-router/tabs` n'est pas exposé par cette version). `AppTabBar` relie leur
navigation à `BottomNavigation.Bar` de React Native Paper. Le stack des demandes
gère la liste, la création, le détail et l'édition ; les options des layouts
fournissent les titres à `AppHeader`. Ce header utilise `Appbar.Header`, ouvre
le drawer avec le bouton hamburger et propose l'accès à `/profil`. Les écrans
conservent leur contexte d'entreprise, leurs filtres et actions métier ainsi
que les boutons de retour des parcours de demande, sans répéter le titre global.
Le thème reste Material 3, avec le bleu `#2563eb` et le fond `#f8fafc`.
Les redirections d'accueil et de la liste ne s'exécutent que lorsque l'écran
est visible (`useFocusEffect`) : un écran conservé en arrière-plan par les
navigateurs ne doit pas interrompre un changement d'entreprise ou de section.

`GestureHandlerRootView` entoure les providers racine. Le drawer natif utilise
`react-native-reanimated` et `react-native-worklets`, installés via Expo avec
les versions compatibles SDK 58 (`4.7.1` et `0.13.0`) ;
`react-native-gesture-handler` est aligné sur `~3.3.0`. Le hook partagé `useLogout`
supprime d'abord le JWT de SecureStore, puis réinitialise les stores et le cache
Query avant de revenir à `/login`. Une erreur de suppression est affichée et
permet de réessayer depuis le menu ou le profil.

Un correctif pnpm pour `react-native-drawer-layout@4.2.12` supprime les tableaux
de dépendances de six appels `useAnimatedStyle` / `useAnimatedProps` dans les
fichiers natifs du drawer et de son overlay (sources et modules compilés).
Reanimated 4.7 ignore déjà ces arguments sur Android/iOS et déduit les dépendances
des worklets ; les fournir produit les avertissements « Dependencies should only
be used on the web ». Le correctif conserve les animations et les fichiers web.
Il est déclaré dans `patchedDependencies` de `pnpm-workspace.yaml`, enregistré
dans le lockfile et réappliqué automatiquement par `pnpm install --frozen-lockfile`.
Après son installation, arrêter Metro puis lancer `pnpm start --clear` pour
éviter de réutiliser les modules mis en cache.

Après une modification de navigation, vérifier sur appareil ou simulateur :

- Le hamburger ouvre le menu depuis la liste, le profil et les écrans de demande ;
  le compte apparaît et chaque lien ferme le menu en ouvrant sa destination.
- Les onglets et l'icône de profil du header donnent accès aux mêmes vues, avec
  un seul header et le titre de l'écran courant.
- Les filtres autorisés et les liens `view`/`request` fonctionnent encore ; les
  parcours création, détail et édition conservent leurs retours et permissions.
- Le changement d'entreprise et la restauration de session continuent de
  rediriger correctement ; la déconnexion depuis chacun des deux accès ferme
  la session et vide le cache, sans rouvrir un écran protégé au retour.
- Le header, le menu et les onglets restent accessibles avec les zones de
  sécurité de l'appareil et le clavier ouvert.

Le workspace pnpm local limite l'installation à l'application mobile. Son
paramétrage de compilation autorise `unrs-resolver`, déjà autorisé dans le
workspace du dépôt. Les exceptions `minimumReleaseAgeExclude` concernent des
versions précises résolues pendant l'installation.

## Notifications

`expo-notifications`, `expo-device` et `expo-haptics` sont installés avec les
versions choisies par Expo SDK 58. L'enregistrement demande l'autorisation
système, prépare le canal Android puis obtient un token Expo lorsque
l'environnement le permet. Il est déclenché après le login et la restauration
d'une session. Le token et son statut restent dans `authStore`, en
mémoire pour le compte connecté, et sont effacés lors d'une déconnexion ou d'un
changement de compte. Un refus ou une erreur d'enregistrement ne bloque pas la
connexion ni le module Demandes.

Le canal Android `operational-requests` utilise l'importance `MAX`, le son
`default` et un motif de vibration. Le plugin `expo-notifications` configure
les ressources natives ; le canal est créé à l'exécution avant la demande
d'autorisation Android. Sur iOS, la permission réelle est demandée par
`requestPermissionsAsync` (alertes, son et badge) ; la description
`NSUserNotificationUsageDescription` inscrite dans la configuration ne remplace
pas cette demande. Le gestionnaire foreground autorise bannière, présence dans
la liste, son et badge. Le son est joué par le système de notifications ;
`Haptics.notificationAsync` ajoute le retour haptique et ne joue pas de son.
Les réglages de l'appareil, du canal, le mode silencieux et « Ne pas déranger »
restent prioritaires : l'application ne force pas une sonnerie ni une vibration.
À réception au premier plan, le Snackbar global affiche le titre de l'événement,
par exemple « Nouvelle demande » ou « Demande approuvée ».

**Option A — test local dans Expo Go.** Depuis « Mon profil », appuyer sur
« Activer les notifications », accepter la permission puis utiliser
« Tester une notification locale ». Les contrôles de test ne sont présents
que dans une version de développement. Sans identifiant, le test vérifie la
bannière, le son, la vibration et le Snackbar. Avec l'identifiant d'une demande
existante, il ajoute le lien web attendu par le backend et l'entreprise active
afin de vérifier aussi l'ouverture au toucher. Le test est programmé quelques
secondes plus tard ; passer l'application en arrière-plan pour tester ce cas.
Si l'autorisation est refusée, « Ouvrir les réglages » permet de la modifier.

Les notifications distantes sur Android sont indisponibles dans Expo Go depuis
le SDK 53 ; les notifications locales restent disponibles. L'import du module
peut afficher l'avertissement Expo Go correspondant même si aucun token distant
n'est demandé. Ce message n'indique pas l'échec du test local. Voir la
[documentation Expo Notifications](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/).

**Option B — APK de test et push réels avec EAS Build.** Le projet contient les
profils `preview` et `production` dans `eas.json`. L'application utilise les
identifiants `com.parabellumgroups.mobile` sur Android et iOS ; gardez ces
identifiants stables après une première publication. `preview` produit un APK
Android installable directement ; `production` produit un Android App Bundle
(AAB) destiné au Play Store.

Depuis la racine du dépôt, lancer une fois EAS et lier l'application à un projet
Expo existant (ou en créer un dans le compte Expo voulu) :

```bash
cd mobile
pnpm dlx eas-cli login
pnpm dlx eas-cli init
```

`eas init` ajoute `extra.eas.projectId` dans `app.json`. Ce projet lié est requis
par EAS Build et permet au mobile de demander son Expo Push Token. Si le projet
existe déjà, choisir ce projet lors de l'association plutôt que d'en créer un
second.

Le dépôt est un monorepo Git : l'application reste dans `mobile/`, avec son
propre `package.json`, `pnpm-lock.yaml` et `pnpm-workspace.yaml` (sans packages
partagés). Lancer `eas` depuis `mobile/` ; EAS utilise ce dossier comme racine
de l'application et trouve pnpm grâce au lockfile local. Le `.easignore` doit
rester à la racine Git, au même niveau que `.gitignore` : il remplace les règles
Git ignore pendant l'upload et garde les sources mobiles tout en excluant les
secrets, `node_modules` et les dossiers générés. Le `.gitignore` racine contient
aussi une exception pour `mobile/package.json`.

Pour vérifier l'archive avant un build, EAS fournit
`pnpm exec eas build:inspect --platform android --stage archive --output <dossier-temporaire>`.
Vérifier que le résultat contient `mobile/package.json`, `mobile/pnpm-lock.yaml`,
`mobile/app.json`, `mobile/eas.json` et le code `mobile/src/`. Ne pas ajouter
`cli.requireCommit` pour résoudre un fichier absent : cette option exige un
commit complet et n'annule pas les règles d'ignore.

Pour générer et installer l'APK sur un téléphone Android :

```bash
pnpm dlx eas-cli build --platform android --profile preview
```

À la fin du build, ouvrir le lien d'installation EAS sur le téléphone, télécharger
l'APK et l'ouvrir. Android peut demander d'autoriser l'installation depuis cette
source (navigateur ou gestionnaire de fichiers) ; confirmer, puis lancer
Parabellum Mobile. Le même lien est disponible depuis le tableau de bord EAS.

Pour préparer une version destinée aux stores :

```bash
pnpm dlx eas-cli build --platform android --profile production
pnpm dlx eas-cli build --platform ios --profile production
```

Le build Android de production est un `.aab` : il se téléverse dans Google Play
Console et ne s'installe pas directement par APK. Pour le publier depuis EAS,
configurer d'abord l'application Play Console et la clé de compte de service
Google Play, puis utiliser `pnpm dlx eas-cli submit --platform android`.
La compilation iOS et sa distribution nécessitent les identifiants du compte
Apple Developer. Voir le [guide des profils EAS](https://docs.expo.dev/build/eas-json/)
et le [guide APK Android](https://docs.expo.dev/build-reference/apk/).

### Firebase / FCM v1 pour les push Android

`google-services.json` dépend du projet Firebase et de l'identifiant Android ;
il ne peut pas être généré sans accès à la console Firebase. Pour le créer :

1. Dans Firebase Console, créer/sélectionner le projet Firebase et ajouter une
   application Android avec l'identifiant `com.parabellumgroups.mobile`.
2. Télécharger `google-services.json` et le placer à la racine de `mobile/`.
   Ce fichier contient la configuration publique Firebase et peut être ajouté
   au dépôt. Ne jamais y mettre la clé de compte de service.
3. Dans `app.json`, sous `expo.android`, ajouter
   `"googleServicesFile": "./google-services.json"`, puis relancer un build EAS.
4. Pour FCM v1, créer/télécharger une clé de compte de service Google ayant le
   rôle Firebase Cloud Messaging Admin et l'enregistrer dans EAS avec
   `pnpm dlx eas-cli credentials --platform android`. La clé de service est
   secrète : la téléverser dans EAS, ne pas la committer.

Le `google-services.json` et la clé de compte de service FCM v1 sont deux
fichiers distincts. Le premier identifie l'application Firebase ; la seconde
autorise EAS à envoyer les pushs. Consulter les guides Expo sur les
[identifiants FCM v1](https://docs.expo.dev/push-notifications/fcm-credentials/)
et la [configuration complète des push](https://docs.expo.dev/push-notifications/push-notifications-setup/).

**Liens et entreprises.** Le payload existant contient
`data.link: "/dashboard/demandes-operationnelles?request=<ID>"`. Le mobile
extrait l'identifiant, le valide et ouvre `/demandes/<ID>` ; il ne navigue pas
vers le frontend web. Un clic est pris en compte par l'écouteur de réponse et,
après un démarrage à froid, par la dernière réponse de notification. L'ouverture
attend une session authentifiée et un navigateur prêt.

Avec `data.enterpriseId`, la demande est relue dans ce contexte avant de
changer l'entreprise active. Avec les événements actuels qui ne contiennent
que le lien, le mobile cherche la demande dans les entreprises candidates,
en commençant par l'entreprise active, sans modifier le store pendant les
essais. Chaque lecture utilise un `X-Enterprise-Id` explicite et doit confirmer
l'identifiant, l'entreprise et les droits côté serveur. La liste renvoyée par
`/auth/enterprises` ne constitue pas une preuve d'autorisation ; le backend
actuel y expose toutes les entreprises. Seuls `403` et `404` permettent de
continuer la recherche ; une session expirée ou un échec réseau reste une
erreur. Les liens invalides, les demandes inaccessibles et les changements de
session ne doivent pas ouvrir une demande d'un autre contexte.

**Transport push raccordé.** Après le login ou la restauration d'une session, le mobile enregistre le token avec `POST /api/users/push-token` et le révoque au logout avec `DELETE /api/users/push-token`. L'`auth-service` conserve un token par appareil dans `user_push_tokens`. Les événements existants de l'outbox sont enregistrés dans le `notification-service`, qui récupère les tokens par une route interne authentifiée puis les envoie via l'API Expo. La soumission cible les approbateurs et l'approbation cible le demandeur ainsi que les utilisateurs autorisés aux traitements financiers. Les payloads incluent `enterpriseId` pour ouvrir la demande dans la bonne entreprise.

Configurer `AUTH_SERVICE_URL`, `JWT_SECRET`, un UUID de projet EAS et les identifiants FCM/APNs. La révocation mobile est tentée à la déconnexion ; une erreur réseau peut laisser le token distant enregistré jusqu'à sa révocation ultérieure.

L'expéditeur serveur devra envoyer au service push Expo un message de cette
forme (remplacer le token, l'identifiant et l'entreprise par des valeurs réelles) :

```json
{
  "to": "ExponentPushToken[...]",
  "title": "Demande approuvée",
  "body": "Votre demande a été approuvée.",
  "sound": "default",
  "channelId": "operational-requests",
  "priority": "high",
  "data": {
    "link": "/dashboard/demandes-operationnelles?request=123",
    "enterpriseId": 7,
    "action": "approve"
  }
}
```

Ajouter `enterpriseId` aux événements de l'outbox évite la recherche parmi les
entreprises. Vérifier le transport avec l'outil push Expo, puis avec un événement
réel du backend, en foreground, arrière-plan et démarrage à froid. Répéter avec
une autre entreprise active, une session déconnectée, une demande interdite et
un refus de permission. Les tests locaux valident l'interface et le parcours
d'ouverture ; ils ne valident pas le transport serveur ni les identifiants FCM/APNs.

## Contrats et comportement des services

Les services extraient `data` des enveloppes du backend ; la liste des demandes
conserve également `meta`. Le paramètre `excludeMine=true` est transmis sans
filtrage local des résultats. Le backend actuel l'ignore : un approbateur peut
donc encore retrouver ses propres demandes dans la file « À valider ». Le
détail masque ses boutons de décision. Les montants des bons de caisse reçus
comme nombres par Billing sont convertis en chaînes pour respecter le type mobile.

Le backend d'authentification renvoie un identifiant numérique, un objet `role`,
un objet `enterprise` et `permissionsList`. Le service mobile les convertit vers
`User`. Après le login, il enregistre le JWT dans SecureStore puis charge les
entreprises avec ce jeton. Si cette étape échoue, il supprime le jeton et
réinitialise la session locale. Une déconnexion du store efface aussi la liste et
la sélection d'entreprise.

Le login conserve les entreprises reçues pour les trois cas possibles : aucune,
une seule ou plusieurs. Sans entreprise, la session est fermée et une erreur est
affichée. Une entreprise unique est sélectionnée automatiquement ; sinon le
choix est demandé. Le layout protégé restaure l'utilisateur depuis le JWT au
démarrage et réagit ensuite aux déconnexions sans relancer cette restauration.
Le profil et le menu latéral partagent la suppression du JWT, des stores et du
cache Query lors d'une déconnexion via `useLogout`.

Les écrans d'authentification, le profil et le menu envoient leurs erreurs au `toastStore`
et affichent aussi un message local. La liste affiche les erreurs de chargement
avec un bouton pour réessayer. La création et l'édition affichent également les
erreurs d'enregistrement près du formulaire. Le Snackbar global est désormais
monté après le `Slot` dans le layout racine : messages de succès en vert, erreurs
en rose foncé et informations en bleu, affichés pendant trois secondes.

Le détail affiche également le résultat des actions et les erreurs sur l'écran,
en plus du `toastStore`. Le bouton de création du bon ouvre désormais `CashVoucherModal`
pour les utilisateurs disposant de la permission financière.

La liste propose toujours « Mes demandes », puis « À valider » pour un approbateur
ou un administrateur, « Financier » et « Toutes » selon les permissions. Les vues
demandées dans l'URL sont vérifiées contre les onglets autorisés. Un administrateur
peut consulter la file de validation ; ses droits de décision restent désactivés.
Les cartes affichent le montant approuvé lorsqu'il existe, sinon le montant demandé.

Les queries de liste sont séparées par utilisateur, entreprise, vue et page, avec
20 demandes par page et une fraîcheur de 30 secondes. La page précédente reste
visible pendant la pagination, avec les boutons temporairement désactivés. Un
changement de compte, d'entreprise ou de vue recrée l'observateur pour éviter
d'afficher les résultats du contexte précédent. Si le nombre de pages diminue
après un rafraîchissement, la liste revient à la dernière page disponible. Les
liens `request` sont consommés avant d'ouvrir le détail pour éviter une réouverture
en boucle au retour sur la liste. Aucun résultat n'est filtré localement.

Le cache détail utilise `['operational-request', id, userId, enterpriseId]` et ne
charge une demande que si l'identifiant, la session et l'entreprise sont présents.
La réponse est vérifiée contre l'entreprise active ; un changement de contexte
pendant le chargement empêche sa mise en cache comme résultat valide. Le préfixe
`['operational-request', id]` reste utilisable pour invalider toutes ses variantes.

Le hook `useOperationalRequests()` expose les mutations `create` et `update`.
Une création invalide les listes ; une édition invalide le détail et les listes.
Les écrans attendent cette invalidation avant la navigation et protègent les
retours tardifs après changement de compte ou d'entreprise.

La création exige la permission `operational_requests.create` (ou les droits
administrateur). L'édition exige `operational_requests.update` et vérifie aussi
le propriétaire, l'entreprise et le statut `DRAFT` ou `NEEDS_INFO`. Aucun autre
statut ne présente de formulaire d'édition. Les droits wildcard sont pris en
compte, sans permettre à un administrateur de modifier la demande d'un autre.

Le formulaire valide un bénéficiaire d'au moins deux caractères, un motif d'au
moins cinq caractères et un montant strictement positif, fini et inférieur ou
égal à `999999999999`, comme le backend. Il accepte la virgule décimale et les
espaces des montants français, puis transmet un nombre. L'écran d'édition convertit
les montants reçus en chaînes vers des nombres et les valeurs de `details` vers
des chaînes, en conservant les clés existantes. Seul un changement réel de type
efface les détails. Les dates sont transmises sous la forme `YYYY-MM-DD` sans
décalage de fuseau ; effacer une date existante en édition envoie `''`, que le
backend convertit en `null`.

Le détail présente le résumé, les informations, les détails spécifiques au type,
les justificatifs déjà présents et l'historique. `Timeline` conserve l'ordre des
logs de l'API, traduit les actions connues et affiche les autres avec leurs
underscores remplacés par des espaces. L'absence de justificatif ou d'historique
est affichée explicitement lorsqu'aucun upload n'est proposé.

`AttachmentPicker` utilise le sélecteur de documents natif avec copie dans le
cache. Il accepte uniquement PDF, JPEG et PNG et vérifie la taille avant envoi :
au maximum `8 * 1024 * 1024` octets. Un fichier dont la taille n'est pas connue
est refusé pour garantir ce contrôle. Annuler le sélecteur ne déclenche aucun
upload. Le composant expose le chargement, les erreurs backend et le callback
`onUploaded` pour rafraîchir le détail. Son affichage est raccordé dans l'écran
détail à la permission `canAttach` et aux statuts `DRAFT`, `NEEDS_INFO`, `APPROVED`,
`IN_FINANCIAL_PROCESS`, `CASH_VOUCHER_CREATED` et `DISBURSED`. La liste des pièces
existantes reste visible dans les autres statuts. Le backend contrôle aussi ces
règles et la signature réelle du fichier. Après upload, le callback `onReload`
invalide le détail, y compris sa clé enrichie par l'utilisateur et l'entreprise.

`CashVoucherModal` charge les comptes de trésorerie dans un cache séparé par
compte utilisateur et entreprise. Elle retient les comptes actifs de type `CASH`
pour les espèces, et `BANK` pour chèque, virement ou carte. Un changement de mode
efface la sélection. Chargement, absence de compte et erreur de lecture disposent
de leurs propres états ; une erreur Billing reste visible avec possibilité de
réessayer. La permission opérationnelle `finance` ne remplace pas les permissions
Billing : la Gateway exige `accounting.read` pour la trésorerie et
`expenses.create` pour créer le bon.

Avant chaque création, la modale relit la demande. Elle démarre le traitement
financier uniquement si celle-ci est encore `APPROVED`, puis crée un bon Billing
avec le montant approuvé (ou demandé), TVA nulle et statut `BROUILLON`, et le lie
au dossier. Cette relecture permet de reprendre après un démarrage financier
réussi suivi d'un échec Billing : cet endpoint de démarrage n'est pas idempotent.
Si le POST Billing répond `409`, elle tente la liaison d'un bon existant. Si cette
liaison échoue aussi, l'erreur Billing originale est conservée. Un échec après
une étape partielle actualise les queries du dossier et des listes. La modale
est montée hors du défilement du détail et conserve sa saisie lors d'un
rafraîchissement, notamment quand `APPROVED` devient `IN_FINANCIAL_PROCESS`.
Une création et une liaison réussies actualisent le détail et les listes, puis
ferment la modale. Les annulations ne déclenchent pas de création.

Les actions sont filtrées par statut, propriétaire et permission. Soumettre exige
`operational_requests.submit` et modifier exige `operational_requests.update`,
uniquement pour le demandeur en `DRAFT` ou `NEEDS_INFO`. En `SUBMITTED`, seules
les décisions peuvent apparaître : approuver, rejeter et retourner utilisent leurs
droits distincts. Le demandeur et les administrateurs ne voient aucune décision,
y compris avec le wildcard. Un commentaire non vide est obligatoire pour rejeter
ou retourner ; il reste facultatif pour approuver ou clôturer.

Les décisions et la clôture demandent confirmation avec `Alert.alert`. Les
confirmations sont consommables une seule fois et sont vérifiées de nouveau
contre la demande et la session courantes. L'écran relit également le statut et
les droits avant chaque mutation ; un verrou empêche les doubles soumissions.
Tous les boutons sont désactivés pendant une action. Une réussite invalide les
queries du détail et des listes ; un conflit `409` déclenche aussi leur
actualisation. Les réponses tardives ne publient pas de message dans une autre
session ou après fermeture de l'écran.

La création d'un bon de caisse force `BROUILLON`, y compris à l'exécution. Aucune
méthode de validation ou de décaissement du bon n'est exposée par le service.
La règle mobile de clôture reste limitée à une demande `DISBURSED` avec
la permission financière. Avant de clôturer, le backend vérifie lui-même auprès
de Billing que le bon actif est `DECAISSE`, puis effectue la transition. La
synchronisation est proposée aux financiers en `CASH_VOUCHER_CREATED` ou
`DISBURSED` ; la création du bon reste proposée en `APPROVED` ou
`IN_FINANCIAL_PROCESS` depuis l'écran détail.

## Mise à jour de l'architecture

À chaque ajout, suppression ou renommage d'un composant, écran, dossier ou fichier
de configuration, mettre à jour l'arborescence et sa description dans ce README,
dans la même modification. Actualiser également l'état d'avancement lorsque la
phase du projet change.

Conserver l'architecture convenue : les schémas Zod vivent auprès des formulaires,
les fonctions de formatage dans `src/constants/format.ts`, et les providers racine
dans `app/_layout.tsx`.

