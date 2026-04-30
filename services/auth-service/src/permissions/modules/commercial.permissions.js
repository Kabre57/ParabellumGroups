const groups = {
  "prospects": {
    "label": "Prospects",
    "permissions": [
      {
        "name": "prospects.read",
        "description": "Consulter les prospects"
      },
      {
        "name": "prospects.read_all",
        "description": "Voir tous les prospects"
      },
      {
        "name": "prospects.read_own",
        "description": "Voir uniquement ses prospects"
      },
      {
        "name": "prospects.create",
        "description": "Créer des prospects"
      },
      {
        "name": "prospects.update",
        "description": "Modifier les prospects"
      },
      {
        "name": "prospects.delete",
        "description": "Supprimer des prospects"
      },
      {
        "name": "prospects.manage_activities",
        "description": "Gérer les activités de prospection"
      }
    ]
  },
  "opportunities": {
    "label": "Opportunités Commerciales",
    "permissions": [
      {
        "name": "opportunities.read",
        "description": "Consulter les opportunités"
      },
      {
        "name": "opportunities.read_all",
        "description": "Voir toutes les opportunités"
      },
      {
        "name": "opportunities.read_own",
        "description": "Voir uniquement ses opportunités"
      },
      {
        "name": "opportunities.create",
        "description": "Créer des opportunités"
      },
      {
        "name": "opportunities.update",
        "description": "Modifier les opportunités"
      },
      {
        "name": "opportunities.delete",
        "description": "Supprimer des opportunités"
      },
      {
        "name": "opportunities.change_stage",
        "description": "Changer le stade d'opportunité"
      }
    ]
  }
};

module.exports = {
  key: "commercial",
  label: "Commercial",
  menuLabel: "Commercial",
  version: "1.0.0",
  order: 20,
  description: "Prospection, opportunites commerciales et cycle avant-vente.",
  groups,
};
