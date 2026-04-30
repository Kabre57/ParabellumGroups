const groups = {
  "enterprises": {
    "label": "Entreprises (Multi-Tenant)",
    "permissions": [
      {
        "name": "enterprises.read",
        "description": "Voir la liste des entreprises"
      },
      {
        "name": "enterprises.read_all",
        "description": "Voir toutes les entreprises du groupe"
      },
      {
        "name": "enterprises.manage_logo",
        "description": "Gérer le logo des entreprises"
      }
    ]
  },
  "users": {
    "label": "Utilisateurs",
    "permissions": [
      {
        "name": "users.read",
        "description": "Consulter les utilisateurs"
      },
      {
        "name": "users.read_all",
        "description": "Voir tous les utilisateurs"
      },
      {
        "name": "users.read_own",
        "description": "Voir son propre profil uniquement"
      },
      {
        "name": "users.create",
        "description": "Créer des utilisateurs"
      },
      {
        "name": "users.update",
        "description": "Modifier les utilisateurs"
      },
      {
        "name": "users.delete",
        "description": "Supprimer des utilisateurs"
      }
    ]
  },
  "roles": {
    "label": "Rôles",
    "permissions": [
      {
        "name": "roles.read",
        "description": "Consulter les rôles"
      },
      {
        "name": "roles.create",
        "description": "Créer des rôles"
      },
      {
        "name": "roles.delete",
        "description": "Supprimer des rôles"
      },
      {
        "name": "roles.manage_permissions",
        "description": "Gérer les permissions des rôles"
      }
    ]
  },
  "permissions": {
    "label": "Permissions",
    "permissions": [
      {
        "name": "permissions.create",
        "description": "Créer des permissions"
      },
      {
        "name": "permissions.update",
        "description": "Modifier les permissions"
      },
      {
        "name": "permissions.delete",
        "description": "Supprimer des permissions"
      }
    ]
  },
  "services": {
    "label": "Services/Départements",
    "permissions": [
      {
        "name": "services.read",
        "description": "Consulter les services"
      },
      {
        "name": "services.read_all",
        "description": "Voir tous les services"
      }
    ]
  }
};

module.exports = {
  key: "administration",
  label: "Administration",
  menuLabel: "Administration",
  version: "1.0.0",
  order: 110,
  description: "Entreprises, utilisateurs, roles, permissions et services.",
  groups,
};
