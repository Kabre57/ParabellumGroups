const groups = {
  "accounting": {
    "label": "Comptabilite",
    "permissions": [
      {
        "name": "accounting.read",
        "description": "Consulter les donnees comptables"
      },
      {
        "name": "accounting.accounts.manage",
        "description": "Gerer le plan comptable"
      },
      {
        "name": "accounting.periods.manage",
        "description": "Gerer les exercices et periodes comptables"
      },
      {
        "name": "accounting.journals.manage",
        "description": "Gerer les journaux comptables"
      },
      {
        "name": "accounting.rules.read",
        "description": "Consulter les regles comptables"
      },
      {
        "name": "accounting.rules.update",
        "description": "Modifier les regles comptables"
      },
      {
        "name": "accounting.entries.create",
        "description": "Creer des ecritures comptables"
      },
      {
        "name": "accounting.treasury.manage",
        "description": "Gerer les comptes de tresorerie comptables"
      },
      {
        "name": "accounting.diagnostics.read",
        "description": "Consulter le diagnostic comptable"
      },
      {
        "name": "accounting.reports.read",
        "description": "Consulter les rapports comptables figes"
      },
      {
        "name": "accounting.reports.export",
        "description": "Exporter et figer les rapports comptables"
      },
      {
        "name": "accounting.statements.read",
        "description": "Consulter le bilan et le compte de resultat"
      },
      {
        "name": "accounting.statements.generate",
        "description": "Generer les etats financiers et clotures"
      }
    ]
  },
  "expenses": {
    "label": "Dépenses",
    "permissions": [
      {
        "name": "expenses.read",
        "description": "Consulter les dépenses"
      },
      {
        "name": "expenses.read_all",
        "description": "Voir toutes les dépenses"
      },
      {
        "name": "expenses.read_own",
        "description": "Voir uniquement ses dépenses"
      },
      {
        "name": "expenses.create",
        "description": "Créer des dépenses"
      },
      {
        "name": "expenses.import",
        "description": "Importer des bons de caisse historiques"
      },
      {
        "name": "expenses.update",
        "description": "Modifier les dépenses"
      },
      {
        "name": "expenses.approve",
        "description": "Approuver les dépenses"
      }
    ]
  }
};

module.exports = {
  key: "accounting",
  label: "Comptabilite",
  menuLabel: "Comptabilite",
  version: "1.0.0",
  order: 60,
  description: "Comptabilite, journaux, periodes, regles comptables, tresorerie et depenses.",
  groups,
};
