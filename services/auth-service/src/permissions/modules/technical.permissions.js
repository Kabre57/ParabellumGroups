const groups = {
  "techniciens": {
    "label": "Techniciens",
    "permissions": [
      {
        "name": "techniciens.read",
        "description": "Consulter les techniciens"
      },
      {
        "name": "techniciens.create",
        "description": "Créer des techniciens"
      },
      {
        "name": "techniciens.update",
        "description": "Modifier les techniciens"
      },
      {
        "name": "techniciens.delete",
        "description": "Supprimer des techniciens"
      },
      {
        "name": "techniciens.manage_specialties",
        "description": "Gérer les spécialités"
      },
      {
        "name": "techniciens.read_performance",
        "description": "Voir les performances"
      }
    ]
  },
  "specialites": {
    "label": "Spécialités Techniques",
    "permissions": [
      {
        "name": "specialites.read",
        "description": "Consulter les spécialités"
      },
      {
        "name": "specialites.create",
        "description": "Créer des spécialités"
      },
      {
        "name": "specialites.update",
        "description": "Modifier les spécialités"
      },
      {
        "name": "specialites.delete",
        "description": "Supprimer des spécialités"
      }
    ]
  },
  "missions": {
    "label": "Missions Techniques",
    "permissions": [
      {
        "name": "missions.read",
        "description": "Consulter les missions"
      },
      {
        "name": "missions.read_all",
        "description": "Voir toutes les missions"
      },
      {
        "name": "missions.read_assigned",
        "description": "Voir uniquement ses missions"
      },
      {
        "name": "missions.create",
        "description": "Créer des missions"
      },
      {
        "name": "missions.update",
        "description": "Modifier les missions"
      },
      {
        "name": "missions.delete",
        "description": "Supprimer des missions"
      },
      {
        "name": "missions.assign",
        "description": "Assigner des missions"
      },
      {
        "name": "missions.change_status",
        "description": "Changer le statut des missions"
      },
      {
        "name": "missions.complete",
        "description": "Marquer une mission comme terminée"
      }
    ]
  },
  "mission_orders": {
    "label": "Ordres de Mission",
    "permissions": [
      {
        "name": "mission_orders.read",
        "description": "Consulter les ordres de mission"
      },
      {
        "name": "mission_orders.create",
        "description": "Generer des ordres de mission"
      },
      {
        "name": "mission_orders.update",
        "description": "Mettre a jour les ordres de mission"
      },
      {
        "name": "mission_orders.delete",
        "description": "Supprimer des ordres de mission"
      },
      {
        "name": "mission_orders.print",
        "description": "Imprimer des ordres de mission"
      }
    ]
  },
  "interventions": {
    "label": "Interventions",
    "permissions": [
      {
        "name": "interventions.read",
        "description": "Consulter les interventions"
      },
      {
        "name": "interventions.read_all",
        "description": "Voir toutes les interventions"
      },
      {
        "name": "interventions.read_assigned",
        "description": "Voir uniquement ses interventions"
      },
      {
        "name": "interventions.create",
        "description": "Créer des interventions"
      },
      {
        "name": "interventions.update",
        "description": "Modifier les interventions"
      },
      {
        "name": "interventions.delete",
        "description": "Supprimer des interventions"
      },
      {
        "name": "interventions.assign_technician",
        "description": "Assigner des techniciens"
      },
      {
        "name": "interventions.assign_material",
        "description": "Assigner du matériel"
      },
      {
        "name": "interventions.complete",
        "description": "Compléter une intervention"
      },
      {
        "name": "interventions.create_report",
        "description": "Créer des rapports d'intervention"
      }
    ]
  },
  "rapports_techniques": {
    "label": "Rapports Techniques",
    "permissions": [
      {
        "name": "rapports_techniques.read",
        "description": "Consulter les rapports techniques"
      },
      {
        "name": "rapports_techniques.read_own",
        "description": "Voir uniquement ses rapports"
      },
      {
        "name": "rapports_techniques.create",
        "description": "Créer des rapports"
      },
      {
        "name": "rapports_techniques.update",
        "description": "Modifier les rapports"
      },
      {
        "name": "rapports_techniques.delete",
        "description": "Supprimer des rapports"
      },
      {
        "name": "rapports_techniques.validate",
        "description": "Valider des rapports"
      },
      {
        "name": "rapports_techniques.export",
        "description": "Exporter les rapports"
      }
    ]
  },
  "materiel": {
    "label": "Matériel Technique",
    "permissions": [
      {
        "name": "materiel.read",
        "description": "Consulter le matériel"
      },
      {
        "name": "materiel.create",
        "description": "Ajouter du matériel"
      },
      {
        "name": "materiel.update",
        "description": "Modifier le matériel"
      },
      {
        "name": "materiel.delete",
        "description": "Supprimer du matériel"
      },
      {
        "name": "materiel.assign",
        "description": "Assigner du matériel"
      },
      {
        "name": "materiel.track_stock",
        "description": "Suivre les stocks"
      },
      {
        "name": "materiel.maintenance",
        "description": "Gérer la maintenance"
      }
    ]
  }
};

module.exports = {
  key: "technical",
  label: "Services Techniques",
  menuLabel: "Services Techniques",
  version: "1.0.0",
  order: 70,
  description: "Techniciens, specialites, missions, interventions, rapports techniques et materiel.",
  groups,
};
