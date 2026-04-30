const groups = {
  "dashboard": {
    "label": "Tableau de Bord",
    "permissions": [
      {
        "name": "dashboard.read",
        "description": "Accéder au tableau de bord principal"
      },
      {
        "name": "dashboard.read_analytics",
        "description": "Voir les statistiques et KPIs"
      }
    ]
  },
  "analytics": {
    "label": "Analytique & Rapports",
    "permissions": [
      {
        "name": "reports.read",
        "description": "Consulter les analyses"
      },
      {
        "name": "reports.read_financial",
        "description": "Voir les analyses financières"
      },
      {
        "name": "reports.read_sales",
        "description": "Voir les analyses commerciales"
      },
      {
        "name": "reports.read_hr",
        "description": "Voir les analyses RH"
      },
      {
        "name": "reports.read_operations",
        "description": "Voir les analyses opérationnelles"
      },
      {
        "name": "reports.read_technical",
        "description": "Voir les analyses techniques"
      },
      {
        "name": "reports.create_report",
        "description": "Créer des rapports personnalisés"
      },
      {
        "name": "reports.export",
        "description": "Exporter les rapports"
      }
    ]
  }
};

module.exports = {
  key: "dashboard",
  label: "Tableau de Bord",
  menuLabel: "Tableau de Bord",
  version: "1.0.0",
  order: 10,
  description: "Acces aux tableaux de bord, indicateurs et rapports transversaux.",
  groups,
};
