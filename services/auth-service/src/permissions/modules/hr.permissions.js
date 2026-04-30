const groups = {
  "employees": {
    "label": "Employés",
    "permissions": [
      {
        "name": "employees.read",
        "description": "Consulter les employés"
      },
      {
        "name": "employees.read_all",
        "description": "Voir tous les employés"
      },
      {
        "name": "employees.read_team",
        "description": "Voir uniquement son équipe"
      },
      {
        "name": "employees.read_own",
        "description": "Voir uniquement son dossier"
      },
      {
        "name": "employees.create",
        "description": "Créer des employés"
      },
      {
        "name": "employees.update",
        "description": "Modifier les employés"
      },
      {
        "name": "employees.update_own",
        "description": "Modifier son propre dossier"
      },
      {
        "name": "employees.delete",
        "description": "Supprimer des employés"
      }
    ]
  },
  "payroll": {
    "label": "Paie",
    "permissions": [
      {
        "name": "payroll.read",
        "description": "Consulter les fiches de paie"
      },
      {
        "name": "payroll.read_all",
        "description": "Voir toutes les paies"
      },
      {
        "name": "payroll.read_own",
        "description": "Voir uniquement sa paie"
      },
      {
        "name": "payroll.create",
        "description": "Créer des fiches de paie"
      },
      {
        "name": "payroll.update",
        "description": "Modifier les paies"
      },
      {
        "name": "payroll.delete",
        "description": "Supprimer des paies"
      },
      {
        "name": "payroll.validate",
        "description": "Valider les paies"
      },
      {
        "name": "payroll.export",
        "description": "Exporter les données de paie"
      },
      {
        "name": "payroll.process",
        "description": "Traiter les paies (calculs automatiques)"
      }
    ]
  },
  "leaves": {
    "label": "Congés",
    "permissions": [
      {
        "name": "leaves.read",
        "description": "Consulter les congés"
      },
      {
        "name": "leaves.read_all",
        "description": "Voir tous les congés"
      },
      {
        "name": "leaves.read_team",
        "description": "Voir les congés de son équipe"
      },
      {
        "name": "leaves.read_own",
        "description": "Voir uniquement ses congés"
      },
      {
        "name": "leaves.create",
        "description": "Créer des demandes de congés"
      },
      {
        "name": "leaves.update",
        "description": "Modifier les congés"
      },
      {
        "name": "leaves.delete",
        "description": "Supprimer des congés"
      },
      {
        "name": "leaves.approve",
        "description": "Approuver les demandes de congés"
      },
      {
        "name": "leaves.reject",
        "description": "Rejeter les demandes de congés"
      }
    ]
  },
  "attendance": {
    "label": "Présences",
    "permissions": [
      {
        "name": "attendance.read",
        "description": "Consulter les présences"
      },
      {
        "name": "attendance.create",
        "description": "Enregistrer des présences"
      }
    ]
  },
  "evaluations": {
    "label": "Ã‰valuations",
    "permissions": [
      {
        "name": "evaluations.read",
        "description": "Consulter les évaluations"
      },
      {
        "name": "evaluations.read_all",
        "description": "Voir toutes les évaluations"
      },
      {
        "name": "evaluations.read_team",
        "description": "Voir les évaluations de son équipe"
      },
      {
        "name": "evaluations.read_own",
        "description": "Voir uniquement ses évaluations"
      },
      {
        "name": "evaluations.create",
        "description": "Créer des évaluations"
      }
    ]
  },
  "loans": {
    "label": "PrÃªts & Avances",
    "permissions": [
      {
        "name": "loans.read",
        "description": "Consulter les prÃªts"
      },
      {
        "name": "loans.read_all",
        "description": "Voir tous les prÃªts"
      },
      {
        "name": "loans.read_own",
        "description": "Voir uniquement ses prÃªts"
      },
      {
        "name": "loans.create",
        "description": "Créer des demandes de prÃªt"
      },
      {
        "name": "loans.update",
        "description": "Modifier les prÃªts"
      },
      {
        "name": "loans.delete",
        "description": "Supprimer des prÃªts"
      },
      {
        "name": "loans.approve",
        "description": "Approuver les prÃªts"
      },
      {
        "name": "loans.manage_repayment",
        "description": "Gérer les remboursements"
      }
    ]
  }
};

module.exports = {
  key: "hr",
  label: "Ressources Humaines",
  menuLabel: "Ressources Humaines",
  version: "1.0.0",
  order: 90,
  description: "Employes, paie, conges, presences, evaluations, prets et avances.",
  groups,
};
