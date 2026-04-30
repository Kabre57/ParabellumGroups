const groups = {
  "purchases": {
    "label": "Achats",
    "permissions": [
      {
        "name": "purchases.read",
        "description": "Consulter le dashboard achats"
      },
      {
        "name": "purchases.read_all",
        "description": "Voir tous les achats"
      },
      {
        "name": "purchases.create",
        "description": "Créer des devis d achat"
      },
      {
        "name": "purchases.submit",
        "description": "Soumettre des devis d achat pour approbation"
      },
      {
        "name": "purchases.update",
        "description": "Modifier des devis d achat"
      },
      {
        "name": "purchases.delete",
        "description": "Supprimer des devis d achat"
      }
    ]
  },
  "suppliers": {
    "label": "Fournisseurs",
    "permissions": [
      {
        "name": "suppliers.read",
        "description": "Consulter les fournisseurs"
      },
      {
        "name": "suppliers.create",
        "description": "Créer des fournisseurs"
      },
      {
        "name": "suppliers.update",
        "description": "Modifier les fournisseurs"
      },
      {
        "name": "suppliers.delete",
        "description": "Supprimer des fournisseurs"
      },
      {
        "name": "suppliers.evaluate",
        "description": "Ã‰valuer les fournisseurs"
      }
    ]
  },
  "purchase_requests": {
    "label": "Demandes d'Achat",
    "permissions": [
      {
        "name": "purchase_requests.read",
        "description": "Consulter les demandes d'achat"
      },
      {
        "name": "purchase_requests.read_all",
        "description": "Voir toutes les demandes"
      },
      {
        "name": "purchase_requests.read_own",
        "description": "Voir uniquement ses demandes"
      },
      {
        "name": "purchase_requests.read_committee",
        "description": "Consulter le tableau de décision et la commission achat"
      },
      {
        "name": "purchase_requests.create",
        "description": "Créer des demandes d'achat"
      },
      {
        "name": "purchase_requests.update",
        "description": "Modifier les demandes"
      },
      {
        "name": "purchase_requests.approve",
        "description": "Approuver les demandes"
      },
      {
        "name": "purchase_requests.evaluate_committee",
        "description": "Renseigner et signer la grille de commission achat"
      },
      {
        "name": "purchase_requests.recommend_supplier",
        "description": "Recommander une offre fournisseur pour validation"
      },
      {
        "name": "purchase_requests.export_committee",
        "description": "Exporter le PV et le rapport de commission achat"
      }
    ]
  },
  "purchase_orders": {
    "label": "Bons de Commande",
    "permissions": [
      {
        "name": "purchase_orders.read",
        "description": "Consulter les bons de commande"
      },
      {
        "name": "purchase_orders.create",
        "description": "Créer des bons de commande"
      },
      {
        "name": "purchase_orders.update",
        "description": "Modifier les bons de commande"
      },
      {
        "name": "purchase_orders.delete",
        "description": "Supprimer des bons de commande"
      },
      {
        "name": "purchase_orders.send",
        "description": "Envoyer aux fournisseurs"
      },
      {
        "name": "purchase_orders.approve",
        "description": "Approuver les bons de commande"
      },
      {
        "name": "purchase_orders.receive",
        "description": "Enregistrer les réceptions"
      },
      {
        "name": "purchase_orders.cancel",
        "description": "Annuler des commandes"
      }
    ]
  },
  "products": {
    "label": "Produits & Services",
    "permissions": [
      {
        "name": "products.read",
        "description": "Consulter le catalogue produits"
      },
      {
        "name": "products.create",
        "description": "Créer des produits/services"
      },
      {
        "name": "products.update",
        "description": "Modifier les produits"
      },
      {
        "name": "products.delete",
        "description": "Supprimer des produits"
      },
      {
        "name": "products.manage_pricing",
        "description": "Gérer les tarifs"
      }
    ]
  },
  "inventory": {
    "label": "Inventaire",
    "permissions": [
      {
        "name": "inventory.read",
        "description": "Consulter l'inventaire"
      },
      {
        "name": "inventory.read_all",
        "description": "Voir tous les stocks"
      },
      {
        "name": "inventory.read_warehouse",
        "description": "Voir uniquement son entrepôt"
      },
      {
        "name": "inventory.create",
        "description": "Ajouter des articles"
      },
      {
        "name": "inventory.update",
        "description": "Modifier les articles"
      },
      {
        "name": "inventory.delete",
        "description": "Supprimer des articles"
      },
      {
        "name": "inventory.adjust",
        "description": "Ajuster les stocks"
      },
      {
        "name": "inventory.transfer",
        "description": "Transférer entre entrepôts"
      },
      {
        "name": "inventory.count",
        "description": "Effectuer des comptages"
      }
    ]
  },
  "stock_movements": {
    "label": "Mouvements de Stock",
    "permissions": [
      {
        "name": "stock_movements.create",
        "description": "Créer des mouvements (entrées/sorties)"
      }
    ]
  }
};

module.exports = {
  key: "procurement",
  label: "Achats & Logistique",
  menuLabel: "Achats & Logistique",
  version: "1.0.0",
  order: 80,
  description: "Achats, demandes, fournisseurs, produits, bons de commande et stocks.",
  groups,
};
