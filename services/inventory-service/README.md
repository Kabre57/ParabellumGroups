# Inventory Service

Service de gestion des stocks, inventaires et équipements pour l'ERP Parabellum.

## Fonctionnalités

### Gestion des Articles
- CRUD complet des articles
- Gestion des unités (PIECE, KG, M, L)
- Statuts (ACTIF, INACTIF, OBSOLETE)
- Alertes de stock (seuil alerte et rupture)
- Valorisation du stock (prix achat/vente)
- Historique des mouvements

### Mouvements de Stock
- Types : ENTREE, SORTIE, AJUSTEMENT, TRANSFERT
- Traçabilité complète (utilisateur, document, date)
- Annulation de mouvements
- Filtrage par article, type, période

### Inventaires
- Création et planification d'inventaires
- Numérotation automatique (INV-YYYYMM-NNNN)
- Statuts : PLANIFIE, EN_COURS, TERMINE, VALIDE
- Gestion des lignes d'inventaire
- Calcul automatique des écarts
- Validation et mise à jour du stock
- Rapports d'écarts

### Gestion des Équipements
- CRUD complet des équipements
- Statuts : DISPONIBLE, EN_SERVICE, EN_PANNE, EN_MAINTENANCE, REFORME
- Suivi de la valeur et de l'amortissement
- Affectation par département et utilisateur
- Statistiques de disponibilité

### Maintenance des Équipements
- Types : PREVENTIVE, CORRECTIVE
- Planning de maintenance
- Suivi des coûts réels
- Statuts : PLANIFIEE, EN_COURS, TERMINEE, ANNULEE
- Affectation aux techniciens

## Installation

```bash
# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env

# Initialiser la base de données
npx prisma migrate dev

# Démarrer le service
npm start
```

## API Endpoints

### Articles
- `POST /api/articles` - Créer un article
- `GET /api/articles` - Liste des articles (filtres: status, categorie, search)
- `GET /api/articles/:id` - Détails d'un article
- `PUT /api/articles/:id` - Modifier un article
- `DELETE /api/articles/:id` - Supprimer un article
- `GET /api/articles/alertes` - Alertes de stock
- `GET /api/articles/valeur-stock` - Valorisation du stock
- `GET /api/articles/:id/mouvements` - Mouvements d'un article

### Mouvements
- `POST /api/mouvements` - Créer un mouvement
- `GET /api/mouvements` - Liste des mouvements (filtres: type, dateDebut, dateFin)
- `GET /api/mouvements/article/:articleId` - Mouvements par article
- `GET /api/mouvements/type/:type` - Mouvements par type
- `DELETE /api/mouvements/:id/cancel` - Annuler un mouvement

### Inventaires
- `POST /api/inventaires` - Créer un inventaire
- `GET /api/inventaires` - Liste des inventaires (filtre: status)
- `GET /api/inventaires/:id` - Détails d'un inventaire
- `PUT /api/inventaires/:id` - Modifier un inventaire
- `DELETE /api/inventaires/:id` - Supprimer un inventaire
- `POST /api/inventaires/:inventaireId/lignes` - Ajouter une ligne
- `POST /api/inventaires/:id/start` - Démarrer l'inventaire
- `POST /api/inventaires/:id/close` - Clôturer l'inventaire
- `POST /api/inventaires/:id/validate` - Valider l'inventaire
- `GET /api/inventaires/:id/ecarts` - Écarts d'inventaire

### Équipements
- `POST /api/equipements` - Créer un équipement
- `GET /api/equipements` - Liste des équipements (filtres: status, categorie, departement)
- `GET /api/equipements/stats` - Statistiques des équipements
- `GET /api/equipements/:id` - Détails d'un équipement
- `PUT /api/equipements/:id` - Modifier un équipement
- `DELETE /api/equipements/:id` - Supprimer un équipement
- `PATCH /api/equipements/:id/status` - Changer le statut
- `GET /api/equipements/:id/maintenances` - Maintenances d'un équipement

### Maintenances
- `POST /api/maintenances` - Créer une maintenance
- `GET /api/maintenances` - Liste des maintenances (filtres: status, type, equipementId)
- `GET /api/maintenances/planning` - Planning de maintenance
- `GET /api/maintenances/:id` - Détails d'une maintenance
- `PUT /api/maintenances/:id` - Modifier une maintenance
- `DELETE /api/maintenances/:id` - Supprimer une maintenance
- `POST /api/maintenances/:id/complete` - Terminer une maintenance

## Modèles de Données

### Article
```javascript
{
  id: "uuid",
  reference: "ART-001",
  nom: "Article exemple",
  description: "Description",
  categorie: "Catégorie",
  unite: "PIECE|KG|M|L",
  prixAchat: 10.50,
  prixVente: 15.00,
  quantiteStock: 100,
  seuilAlerte: 20,
  seuilRupture: 5,
  emplacement: "A1-B2",
  fournisseurId: "uuid",
  status: "ACTIF|INACTIF|OBSOLETE"
}
```

### MouvementStock
```javascript
{
  id: "uuid",
  articleId: "uuid",
  type: "ENTREE|SORTIE|AJUSTEMENT|TRANSFERT",
  quantite: 10,
  dateOperation: "2024-01-01T00:00:00Z",
  utilisateurId: "uuid",
  numeroDocument: "DOC-001",
  emplacement: "A1-B2",
  notes: "Notes"
}
```

### Inventaire
```javascript
{
  id: "uuid",
  numeroInventaire: "INV-202401-0001",
  dateDebut: "2024-01-01T00:00:00Z",
  dateFin: "2024-01-02T00:00:00Z",
  status: "PLANIFIE|EN_COURS|TERMINE|VALIDE",
  nbArticles: 50,
  nbEcarts: 5,
  montantEcart: 100.50,
  notes: "Notes"
}
```

### Equipement
```javascript
{
  id: "uuid",
  reference: "EQP-001",
  nom: "Équipement exemple",
  description: "Description",
  categorie: "Catégorie",
  dateAchat: "2024-01-01T00:00:00Z",
  valeurAchat: 1000,
  departement: "Production",
  utilisateurId: "uuid",
  emplacement: "Atelier 1",
  status: "DISPONIBLE|EN_SERVICE|EN_PANNE|EN_MAINTENANCE|REFORME"
}
```

## Variables d'Environnement

- `PORT` - Port du service (défaut: 4014)
- `DATABASE_URL` - URL de connexion PostgreSQL
- `AUTH_SERVICE_URL` - URL du service d'authentification
- `NODE_ENV` - Environnement (development, production)

## Technologies

- Node.js / Express
- Prisma ORM
- PostgreSQL
- Helmet (sécurité)
- Rate Limiting
- CORS

## Sécurité

- Authentification via JWT (service auth)
- Rate limiting (100 requêtes/15min)
- Helmet pour les headers de sécurité
- Validation des données
- Gestion des erreurs centralisée

## Port

Le service écoute sur le port **4014**.
