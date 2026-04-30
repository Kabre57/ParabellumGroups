const groups = {
  "customers": {
    "label": "Clients",
    "permissions": [
      {
        "name": "customers.read",
        "description": "Consulter les clients"
      },
      {
        "name": "customers.read_all",
        "description": "Voir tous les clients"
      },
      {
        "name": "customers.read_assigned",
        "description": "Voir uniquement les clients assignés"
      },
      {
        "name": "customers.create",
        "description": "Créer des clients"
      },
      {
        "name": "customers.update",
        "description": "Modifier les clients"
      },
      {
        "name": "customers.delete",
        "description": "Supprimer des clients"
      },
      {
        "name": "customers.manage_contacts",
        "description": "Gérer les contacts clients"
      },
      {
        "name": "customers.manage_addresses",
        "description": "Gérer les adresses clients"
      },
      {
        "name": "customers.manage_documents",
        "description": "Gérer les documents clients"
      }
    ]
  },
  "contracts": {
    "label": "Contrats Clients",
    "permissions": [
      {
        "name": "contracts.read",
        "description": "Consulter les contrats"
      },
      {
        "name": "contracts.read_all",
        "description": "Voir tous les contrats"
      },
      {
        "name": "contracts.create",
        "description": "Créer des contrats"
      },
      {
        "name": "contracts.update",
        "description": "Modifier les contrats"
      },
      {
        "name": "contracts.delete",
        "description": "Supprimer des contrats"
      },
      {
        "name": "contracts.sign",
        "description": "Signer des contrats"
      },
      {
        "name": "contracts.approve",
        "description": "Approuver des contrats"
      },
      {
        "name": "contracts.terminate",
        "description": "Résilier des contrats"
      },
      {
        "name": "contracts.export",
        "description": "Exporter les contrats"
      }
    ]
  }
};

module.exports = {
  key: "crm",
  label: "CRM",
  menuLabel: "CRM",
  version: "1.0.0",
  order: 40,
  description: "Clients et contrats clients.",
  groups,
};
