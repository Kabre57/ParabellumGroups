const groups = {
  "quotes": {
    "label": "Devis",
    "permissions": [
      {
        "name": "quotes.read",
        "description": "Consulter les devis"
      },
      {
        "name": "quotes.read_all",
        "description": "Voir tous les devis"
      },
      {
        "name": "quotes.read_own",
        "description": "Voir uniquement ses devis"
      },
      {
        "name": "quotes.create",
        "description": "Créer des devis"
      },
      {
        "name": "quotes.update",
        "description": "Modifier les devis"
      },
      {
        "name": "quotes.delete",
        "description": "Supprimer des devis"
      },
      {
        "name": "quotes.approve",
        "description": "Approuver des devis"
      },
      {
        "name": "quotes.convert",
        "description": "Convertir un devis en facture"
      },
      {
        "name": "quotes.print",
        "description": "Imprimer des devis"
      },
      {
        "name": "quotes.export",
        "description": "Exporter les devis"
      }
    ]
  },
  "invoices": {
    "label": "Factures",
    "permissions": [
      {
        "name": "billing.dashboard.read",
        "description": "Consulter le dashboard facturation"
      },
      {
        "name": "invoices.read",
        "description": "Consulter les factures"
      },
      {
        "name": "invoices.read_all",
        "description": "Voir toutes les factures"
      },
      {
        "name": "invoices.read_own",
        "description": "Voir uniquement ses factures"
      },
      {
        "name": "invoices.create",
        "description": "Créer des factures"
      },
      {
        "name": "invoices.update",
        "description": "Modifier les factures"
      },
      {
        "name": "invoices.delete",
        "description": "Supprimer des factures"
      },
      {
        "name": "invoices.send",
        "description": "Envoyer des factures"
      },
      {
        "name": "invoices.validate",
        "description": "Valider des factures"
      },
      {
        "name": "invoices.cancel",
        "description": "Annuler des factures"
      },
      {
        "name": "invoices.credit_note",
        "description": "Créer des avoirs"
      },
      {
        "name": "invoices.print",
        "description": "Imprimer des factures"
      },
      {
        "name": "invoices.export",
        "description": "Exporter les factures"
      }
    ]
  },
  "credit_notes": {
    "label": "Avoirs & Notes de credit",
    "permissions": [
      {
        "name": "credit_notes.read",
        "description": "Consulter les avoirs et notes de credit"
      }
    ]
  },
  "payments": {
    "label": "Paiements",
    "permissions": [
      {
        "name": "payments.read",
        "description": "Consulter les paiements"
      },
      {
        "name": "payments.read_all",
        "description": "Voir tous les paiements"
      },
      {
        "name": "payments.create",
        "description": "Enregistrer des paiements"
      },
      {
        "name": "payments.update",
        "description": "Modifier les paiements"
      },
      {
        "name": "payments.delete",
        "description": "Supprimer des paiements"
      },
      {
        "name": "payments.validate",
        "description": "Valider des paiements"
      }
    ]
  }
};

module.exports = {
  key: "billing",
  label: "Facturation",
  menuLabel: "Facturation",
  version: "1.0.0",
  order: 50,
  description: "Devis, factures, avoirs, paiements et suivi de facturation.",
  groups,
};
