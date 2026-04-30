const groups = {
  "notifications": {
    "label": "Notifications",
    "permissions": [
      {
        "name": "notifications.read",
        "description": "Consulter les notifications"
      },
      {
        "name": "notifications.read_own",
        "description": "Voir uniquement ses notifications"
      }
    ]
  },
  "messages": {
    "label": "Messages Internes",
    "permissions": [
      {
        "name": "messages.read",
        "description": "Consulter les messages"
      },
      {
        "name": "messages.send",
        "description": "Envoyer des messages"
      },
      {
        "name": "messages.delete",
        "description": "Supprimer des messages"
      }
    ]
  },
  "emails": {
    "label": "Emails",
    "permissions": [
      {
        "name": "emails.read",
        "description": "Consulter l'historique d'emails"
      },
      {
        "name": "emails.send",
        "description": "Envoyer des emails"
      },
      {
        "name": "emails.send_bulk",
        "description": "Envoi en masse"
      },
      {
        "name": "emails.manage_templates",
        "description": "Gérer les modèles d'email"
      }
    ]
  },
  "documents": {
    "label": "Documents",
    "permissions": [
      {
        "name": "documents.read",
        "description": "Consulter les documents"
      },
      {
        "name": "documents.read_all",
        "description": "Voir tous les documents"
      },
      {
        "name": "documents.upload",
        "description": "Téléverser des documents"
      },
      {
        "name": "documents.update",
        "description": "Modifier les documents"
      },
      {
        "name": "documents.delete",
        "description": "Supprimer des documents"
      }
    ]
  }
};

module.exports = {
  key: "communication",
  label: "Communication",
  menuLabel: "Communication",
  version: "1.0.0",
  order: 100,
  description: "Notifications, messages, emails et documents partages.",
  groups,
};
