# Specification API

## Objet

Cette specification decrit le workflow cible pour les achats:

`DevisAchat -> Soumission -> Approbation -> BonDeCommande`

Le devis d'achat est:

- cree par un utilisateur, mais rattache au `Service` metier demandeur
- soumis a approbation
- transforme automatiquement en `BonDeCommande` apres approbation
- remonte dans le module facturation via un read model alimente par events

## Principes

- `procurement-service` reste le service source de verite pour les devis d'achat et les bons de commande
- `api-gateway` reste l'unique point d'entree frontend
- `billing-service` ne cree pas les achats: il consomme un flux d'evenements et expose une vue de consultation
- compatibilite descendante:
  - l'entite actuelle `DemandeAchat` peut etre evoluee en `DevisAchat`
  - l'ancienne route `/demandes-achat` peut etre maintenue temporairement comme alias

## Headers propages par la gateway

Headers minimum a transmettre vers `procurement-service`:

```http
Authorization: Bearer <jwt>
X-User-Id: 12
X-User-Email: acheteur@parabellum.com
X-User-Role: MANAGER
X-Service-Id: 4
X-Correlation-Id: 8a8a7a4f-...
```

Regle:

- `X-Service-Id` est obligatoire pour creer/soumettre un devis d'achat
- le nom du service doit etre resolu par `procurement-service` via `auth-service` a partir de `X-Service-Id`

## Schema de donnees cible

### DevisAchat

```json
{
  "id": "uuid",
  "numeroDevisAchat": "DPA-202603-00012",
  "serviceId": 4,
  "serviceName": "Services Techniques",
  "demandeurUserId": 12,
  "demandeurEmail": "acheteur@parabellum.com",
  "fournisseurId": "uuid",
  "fournisseurNom": "Tech Supply SARL",
  "objet": "Achat routeurs et accessoires",
  "description": "Besoin pour deploiement client",
  "devise": "XOF",
  "montantHT": 850000,
  "montantTVA": 153000,
  "montantTTC": 1003000,
  "status": "BROUILLON",
  "approvalStatus": "EN_ATTENTE",
  "submittedAt": null,
  "approvedAt": null,
  "approvedByUserId": null,
  "approvedByServiceId": null,
  "bonCommandeId": null,
  "notes": "Urgent",
  "createdAt": "2026-03-18T10:00:00.000Z",
  "updatedAt": "2026-03-18T10:00:00.000Z",
  "lignes": [
    {
      "id": "uuid",
      "articleId": "uuid",
      "referenceArticle": "RTR-001",
      "designation": "Routeur Cisco",
      "categorie": "Reseau",
      "quantite": 2,
      "prixUnitaire": 300000,
      "tva": 18,
      "montantHT": 600000,
      "montantTTC": 708000
    }
  ]
}
```

### BonDeCommande

```json
{
  "id": "uuid",
  "numeroBon": "BCA-202603-00034",
  "sourceDevisAchatId": "uuid",
  "serviceId": 4,
  "serviceName": "Services Techniques",
  "fournisseurId": "uuid",
  "fournisseurNom": "Tech Supply SARL",
  "dateCommande": "2026-03-18T11:00:00.000Z",
  "dateLivraisonPrevue": "2026-03-25T00:00:00.000Z",
  "montantHT": 850000,
  "montantTVA": 153000,
  "montantTTC": 1003000,
  "status": "BROUILLON",
  "createdFromApproval": true,
  "createdAt": "2026-03-18T11:00:00.000Z",
  "updatedAt": "2026-03-18T11:00:00.000Z",
  "lignes": [
    {
      "id": "uuid",
      "articleId": "uuid",
      "designation": "Routeur Cisco",
      "quantite": 2,
      "prixUnitaire": 300000,
      "tva": 18,
      "montantHT": 600000,
      "montantTTC": 708000
    }
  ]
}
```

### Historique d'approbation

```json
{
  "id": "uuid",
  "devisAchatId": "uuid",
  "action": "APPROVED",
  "fromStatus": "SOUMIS",
  "toStatus": "APPROUVE",
  "actorUserId": 3,
  "actorEmail": "directeur@parabellum.com",
  "actorServiceId": 1,
  "actorServiceName": "Direction",
  "commentaire": "Budget valide",
  "createdAt": "2026-03-18T11:00:00.000Z"
}
```

## Statuts

### DevisAchat.status

- `BROUILLON`
- `SOUMIS`
- `APPROUVE`
- `REJETE`
- `CONVERTI_EN_BC`
- `ANNULE`

### BonDeCommande.status

- `BROUILLON`
- `ENVOYE`
- `CONFIRME`
- `LIVRE`
- `ANNULE`

## Contrat API

## 1. Gateway -> procurement-service

Convention publique frontend:

- prefixe public: `/api/procurement`
- prefixe interne procurement-service: `/api`

### 1.1 Lister les devis d'achat

`GET /api/procurement/devis-achat`

Query params:

- `status`
- `serviceId`
- `fournisseurId`
- `search`
- `page`
- `limit`

Reponse:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "numeroDevisAchat": "DPA-202603-00012",
      "serviceId": 4,
      "serviceName": "Services Techniques",
      "fournisseurId": "uuid",
      "fournisseurNom": "Tech Supply SARL",
      "objet": "Achat routeurs et accessoires",
      "montantTTC": 1003000,
      "status": "SOUMIS",
      "approvalStatus": "EN_ATTENTE",
      "createdAt": "2026-03-18T10:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

### 1.2 Creer un devis d'achat

`POST /api/procurement/devis-achat`

Payload:

```json
{
  "fournisseurId": "uuid",
  "objet": "Achat routeurs et accessoires",
  "description": "Besoin pour projet client ABC",
  "dateBesoin": "2026-03-25",
  "notes": "Urgent",
  "status": "BROUILLON",
  "lignes": [
    {
      "articleId": "uuid",
      "designation": "Routeur Cisco",
      "quantite": 2,
      "prixUnitaire": 300000,
      "tva": 18
    }
  ]
}
```

Regles:

- `serviceId` et `serviceName` sont determines cote backend depuis les headers gateway
- `demandeurUserId` vient de `X-User-Id`
- `montantHT`, `montantTVA`, `montantTTC` sont calcules cote backend

### 1.3 Soumettre un devis d'achat

`POST /api/procurement/devis-achat/:id/submit`

Payload:

```json
{
  "commentaire": "Pret pour validation budgetaire"
}
```

Effet:

- passe `status = SOUMIS`
- genere un event `procurement.purchase_quote.submitted`

### 1.4 Approuver un devis d'achat

`POST /api/procurement/devis-achat/:id/approve`

Payload:

```json
{
  "commentaire": "Accord direction",
  "dateLivraisonPrevue": "2026-03-25"
}
```

Reponse:

```json
{
  "success": true,
  "message": "Devis d'achat approuve et converti en bon de commande",
  "data": {
    "purchaseQuote": {
      "id": "uuid",
      "numeroDevisAchat": "DPA-202603-00012",
      "status": "CONVERTI_EN_BC"
    },
    "purchaseOrder": {
      "id": "uuid",
      "numeroBon": "BCA-202603-00034",
      "status": "BROUILLON"
    }
  }
}
```

Regles:

- seul un devis en `SOUMIS` peut etre approuve
- un devis sans fournisseur ou sans lignes ne peut pas etre approuve
- l'approbation cree automatiquement un `BonDeCommande`

### 1.5 Rejeter un devis d'achat

`POST /api/procurement/devis-achat/:id/reject`

Payload:

```json
{
  "commentaire": "Montant hors budget"
}
```

Effet:

- passe `status = REJETE`
- conserve le devis pour historique et event sourcing

### 1.6 Detail d'un devis d'achat

`GET /api/procurement/devis-achat/:id`

Reponse:

- structure complete `DevisAchat` avec lignes, fournisseur, historique d'approbation et `bonCommandeId` si present

### 1.7 Historique d'approbation

`GET /api/procurement/devis-achat/:id/approval-history`

### 1.8 Statistiques devis d'achat

`GET /api/procurement/devis-achat/stats`

Reponse:

```json
{
  "success": true,
  "data": {
    "totalQuotes": 18,
    "pendingApproval": 4,
    "approvedThisMonth": 6,
    "rejectedThisMonth": 2,
    "convertedToOrders": 5,
    "totalAmountPending": 2400000
  }
}
```

## 2. Endpoints bons de commande

Les endpoints existants restent:

- `GET /api/procurement/bons-commande`
- `GET /api/procurement/bons-commande/:id`
- `PUT /api/procurement/bons-commande/:id`
- `PATCH /api/procurement/bons-commande/:id/status`

Extension recommandee sur la reponse:

```json
{
  "id": "uuid",
  "numeroBon": "BCA-202603-00034",
  "sourceDevisAchatId": "uuid",
  "serviceId": 4,
  "serviceName": "Services Techniques"
}
```

## 3. Billing read model

Choix recommande:

- pas d'ecriture synchrone vers `billing-service`
- consommation d'events emis par `procurement-service`
- exposition d'un read model pour consultation finance

### 3.1 Endpoints billing a exposer

`GET /api/billing/purchase-commitments`

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sourceType": "PURCHASE_ORDER",
      "sourceId": "uuid",
      "sourceNumber": "BCA-202603-00034",
      "serviceId": 4,
      "serviceName": "Services Techniques",
      "supplierId": "uuid",
      "supplierName": "Tech Supply SARL",
      "amountHT": 850000,
      "amountTVA": 153000,
      "amountTTC": 1003000,
      "currency": "XOF",
      "status": "BROUILLON",
      "createdAt": "2026-03-18T11:00:00.000Z"
    }
  ]
}
```

`GET /api/billing/purchase-commitments/stats`

```json
{
  "success": true,
  "data": {
    "totalPurchases": 14,
    "draftOrders": 3,
    "confirmedOrders": 7,
    "receivedOrders": 2,
    "cancelledOrders": 2,
    "totalCommittedAmount": 12500000
  }
}
```

## Events vers billing-service

## Envelope commun

```json
{
  "eventId": "uuid",
  "eventType": "procurement.purchase_quote.created",
  "occurredAt": "2026-03-18T10:00:00.000Z",
  "source": "procurement-service",
  "version": 1,
  "correlationId": "uuid",
  "payload": {}
}
```

## Event 1. procurement.purchase_quote.created

Usage:

- creation d'un devis d'achat
- read-side finance "demandes en cours"

Payload minimal:

```json
{
  "purchaseQuoteId": "uuid",
  "purchaseQuoteNumber": "DPA-202603-00012",
  "serviceId": 4,
  "serviceName": "Services Techniques",
  "requesterUserId": 12,
  "supplierId": "uuid",
  "supplierName": "Tech Supply SARL",
  "amountHT": 850000,
  "amountTVA": 153000,
  "amountTTC": 1003000,
  "currency": "XOF",
  "status": "BROUILLON"
}
```

## Event 2. procurement.purchase_quote.submitted

Payload minimal:

```json
{
  "purchaseQuoteId": "uuid",
  "purchaseQuoteNumber": "DPA-202603-00012",
  "status": "SOUMIS",
  "submittedAt": "2026-03-18T10:15:00.000Z"
}
```

## Event 3. procurement.purchase_quote.approved

Payload minimal:

```json
{
  "purchaseQuoteId": "uuid",
  "purchaseQuoteNumber": "DPA-202603-00012",
  "serviceId": 4,
  "serviceName": "Services Techniques",
  "approvedByUserId": 3,
  "approvedByServiceId": 1,
  "approvedByServiceName": "Direction",
  "amountTTC": 1003000,
  "status": "APPROUVE"
}
```

## Event 4. procurement.purchase_quote.rejected

Payload minimal:

```json
{
  "purchaseQuoteId": "uuid",
  "purchaseQuoteNumber": "DPA-202603-00012",
  "status": "REJETE",
  "reason": "Montant hors budget"
}
```

## Event 5. procurement.purchase_order.created

Event cle pour `billing-service`.

Payload minimal:

```json
{
  "purchaseOrderId": "uuid",
  "purchaseOrderNumber": "BCA-202603-00034",
  "sourcePurchaseQuoteId": "uuid",
  "sourcePurchaseQuoteNumber": "DPA-202603-00012",
  "serviceId": 4,
  "serviceName": "Services Techniques",
  "supplierId": "uuid",
  "supplierName": "Tech Supply SARL",
  "amountHT": 850000,
  "amountTVA": 153000,
  "amountTTC": 1003000,
  "currency": "XOF",
  "status": "BROUILLON",
  "createdAt": "2026-03-18T11:00:00.000Z"
}
```

## Event 6. procurement.purchase_order.status_changed

Payload minimal:

```json
{
  "purchaseOrderId": "uuid",
  "purchaseOrderNumber": "BCA-202603-00034",
  "fromStatus": "BROUILLON",
  "toStatus": "CONFIRME",
  "serviceId": 4,
  "serviceName": "Services Techniques",
  "amountTTC": 1003000
}
```

## Event 7. procurement.purchase_order.received

Payload minimal:

```json
{
  "purchaseOrderId": "uuid",
  "purchaseOrderNumber": "BCA-202603-00034",
  "receivedAt": "2026-03-25T14:00:00.000Z",
  "receivedAmountTTC": 1003000,
  "status": "LIVRE"
}
```

## Regles d'autorisation

Creation:

- `purchases.create`

Lecture:

- `purchases.read`

Approbation:

- `purchases.approve`

Rejet:

- `purchases.approve`

Mise a jour bon de commande:

- `purchase_orders.update`

Reception:

- `purchase_orders.receive`

## Compatibilite descendante recommandee

Routes legacy a garder temporairement:

- `/api/procurement/demandes-achat` -> alias de `/api/procurement/devis-achat`
- le champ `numeroDemande` peut etre conserve en base comme alias technique si necessaire

Regle de transition:

- frontend Achats passe progressivement sur `devis-achat`
- backend accepte encore `demandes-achat` pendant la phase de migration

## Premiere livraison minimale

Perimetre conseille pour V1:

- creation de devis d'achat rattache au service
- lignes article + fournisseur
- soumission
- approbation avec creation auto du bon de commande
- emission des events:
  - `procurement.purchase_quote.created`
  - `procurement.purchase_quote.submitted`
  - `procurement.purchase_quote.approved`
  - `procurement.purchase_order.created`
- vue read-only des achats dans le module Facturation

Tout le reste peut venir en V2:

- multi-approbation
- seuils budgetaires
- comptabilisation analytique avancee
- rapprochement reception/facture fournisseur
