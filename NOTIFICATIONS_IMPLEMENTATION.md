# Notifications Dynamiques & Page Mot de Passe Oublié

## ✅ Implémentations Réalisées

### 1. Page Mot de Passe Oublié (`/forgot-password`)

**Fichier créé :** `frontend/app/(auth)/forgot-password/page.tsx`

**Fonctionnalités :**
- ✅ Formulaire d'envoi d'email avec validation Zod
- ✅ Design cohérent avec la page de connexion (style prarabellum groups)
- ✅ Logo Parabellum et branding
- ✅ Appel API vers `/api/auth/forgot-password`
- ✅ État de succès avec icône de confirmation
- ✅ Option de réessayer si l'email n'est pas reçu
- ✅ Lien de retour vers la page de connexion
- ✅ Notifications toast pour succès/erreur
- ✅ État de chargement avec spinner

**Route :** http://localhost:3000/forgot-password

---

### 2. Système de Notifications Dynamiques

#### A. Hook Notifications (`frontend/src/hooks/useNotifications.ts`)

**Fonctions exportées :**
```typescript
- useNotifications() : Récupère les notifications avec React Query
- useMarkNotificationAsRead() : Marque une notification comme lue
- useMarkAllNotificationsAsRead() : Marque toutes les notifications comme lues
```

**Caractéristiques :**
- ✅ Rafraîchissement automatique toutes les 30 secondes
- ✅ Gestion du cache avec React Query
- ✅ TypeScript typé avec interface `Notification`

#### B. Composant NotificationDropdown (`frontend/src/components/layout/NotificationDropdown.tsx`)

**Fonctionnalités :**
- ✅ Badge rouge avec nombre de notifications non lues
- ✅ Dropdown avec liste des notifications
- ✅ Icônes de type (info, success, warning, error) avec couleurs
- ✅ Format de date relatif (il y a X minutes) en français
- ✅ Bouton "Marquer comme lu" pour chaque notification
- ✅ Bouton "Tout marquer comme lu"
- ✅ Lien vers les détails si disponible
- ✅ État de chargement
- ✅ Message si aucune notification
- ✅ Lien vers page dédiée en footer
- ✅ Backdrop pour fermer au clic extérieur

#### C. Intégration dans le Header

**Fichier modifié :** `frontend/src/components/layout/Header.tsx`

- ✅ Remplacement du bouton statique par `<NotificationDropdown />`
- ✅ Badge dynamique qui s'affiche seulement si `unreadCount > 0`
- ✅ **Aucune donnée simulée**, toutes les données proviennent de l'API

---

### 3. Backend - Service Notification

#### A. Schema Prisma (`services/notification-service/prisma/schema.prisma`)

**Modèle Notification :**
```prisma
model Notification {
  id          String   @id @default(uuid())
  userId      String
  type        String   // info, success, warning, error
  title       String
  message     String
  isRead      Boolean  @default(false)
  data        Json?    // Permet de stocker link et autres données
  createdAt   DateTime @default(now())
  readAt      DateTime?
}
```

#### B. Controller amélioré (`services/notification-service/src/controllers/notification.controller.ts`)

**Endpoint `GET /user/:userId` :**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Titre",
      "message": "Message",
      "type": "info",
      "read": false,
      "createdAt": "2026-02-11T20:00:00Z",
      "link": "/dashboard/..."
    }
  ],
  "unreadCount": 3
}
```

**Endpoints disponibles :**
- ✅ `POST /send` : Créer une notification (+ envoi email optionnel)
- ✅ `GET /user/:userId` : Récupérer notifications (limite 50, triées par date)
- ✅ `PATCH /:id/read` : Marquer une notification comme lue
- ✅ `PATCH /user/:userId/mark-all-read` : Marquer toutes comme lues

#### C. Routes mises à jour (`services/notification-service/src/routes/notification.routes.ts`)

- ✅ Utilisation de `PATCH` au lieu de `PUT` (convention REST)
- ✅ Route `/mark-all-read` au lieu de `/read-all`

---

## 🔧 Configuration Requise

### Variables d'Environnement (Backend)

Ajouter dans `services/notification-service/.env` :
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@parabellum.com
```

### Variables d'Environnement (Frontend)

Déjà configuré dans `frontend/.env` :
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## 📝 Utilisation

### 1. Envoyer une Notification (depuis n'importe quel service)

```javascript
// Exemple : Notification après création d'une mission
await fetch('http://notification-service:4012/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid',
    type: 'success',
    title: 'Nouvelle mission créée',
    message: 'La mission MIS-2026-001 a été créée avec succès',
    email: 'user@example.com', // Optionnel
    data: { link: '/dashboard/technical/missions/mission-id' }
  })
});
```

### 2. Accéder aux Notifications (Frontend)

```typescript
import { useNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  const { data, isLoading } = useNotifications();
  const unreadCount = data?.unreadCount || 0;
  const notifications = data?.data || [];
  
  // ...
}
```

---

## 🎯 Points Clés

1. **Aucune donnée simulée** : Toutes les notifications proviennent de l'API réelle
2. **Temps réel** : Rafraîchissement automatique toutes les 30 secondes
3. **Performance** : Limite de 50 notifications, avec pagination possible
4. **UX** : Badge visible seulement si unreadCount > 0
5. **Sécurité** : Authentification requise (userId depuis token JWT)
6. **Extensible** : Champ `data` JSON pour ajouter des informations custom

---

## 🚀 Prochaines Étapes Recommandées

1. **API Gateway** : Ajouter route `/api/notifications` qui proxy vers notification-service
2. **WebSockets** : Implémenter Socket.io pour notifications en temps réel (sans polling)
3. **Auth Middleware** : Extraire userId depuis JWT au lieu de le passer en paramètre
4. **Page dédiée** : Créer `/dashboard/notifications` pour voir l'historique complet
5. **Filtres** : Ajouter filtres par type, date, lu/non-lu
6. **Préférences** : Permettre à l'utilisateur de gérer ses préférences de notification
