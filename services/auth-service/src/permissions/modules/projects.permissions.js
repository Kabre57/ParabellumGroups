const groups = {
  "projects": {
    "label": "Projets",
    "permissions": [
      {
        "name": "projects.read",
        "description": "Consulter les projets"
      },
      {
        "name": "projects.read_all",
        "description": "Voir tous les projets"
      },
      {
        "name": "projects.read_assigned",
        "description": "Voir uniquement ses projets"
      },
      {
        "name": "projects.create",
        "description": "Créer des projets"
      },
      {
        "name": "projects.update",
        "description": "Modifier les projets"
      },
      {
        "name": "projects.delete",
        "description": "Supprimer des projets"
      },
      {
        "name": "projects.manage_team",
        "description": "Gérer l'équipe projet"
      },
      {
        "name": "projects.manage_budget",
        "description": "Gérer le budget projet"
      },
      {
        "name": "projects.change_status",
        "description": "Changer le statut des projets"
      }
    ]
  },
  "tasks": {
    "label": "Tâches Projet",
    "permissions": [
      {
        "name": "tasks.read",
        "description": "Consulter les tâches"
      },
      {
        "name": "tasks.read_all",
        "description": "Voir toutes les tâches"
      },
      {
        "name": "tasks.read_assigned",
        "description": "Voir uniquement ses tâches"
      },
      {
        "name": "tasks.create",
        "description": "Créer des tâches"
      },
      {
        "name": "tasks.update",
        "description": "Modifier les tâches"
      },
      {
        "name": "tasks.delete",
        "description": "Supprimer des tâches"
      },
      {
        "name": "tasks.assign",
        "description": "Assigner des tâches"
      },
      {
        "name": "tasks.change_status",
        "description": "Changer le statut des tâches"
      },
      {
        "name": "tasks.comment",
        "description": "Commenter les tâches"
      }
    ]
  }
};

module.exports = {
  key: "projects",
  label: "Gestion de Projets",
  menuLabel: "Gestion de Projets",
  version: "1.0.0",
  order: 30,
  description: "Projets, taches, equipes projet, budget et suivi operationnel.",
  groups,
};
