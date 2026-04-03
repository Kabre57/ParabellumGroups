# ParabellumGroups ERP

Plateforme ERP modulaire pour la gestion commerciale (prospection, pipeline, relances), CRM, projets, RH, comptabilite, achats, services techniques et communication.

## 🏗️ STRUCTURE DU PROJET

```
ParabellumGroups/
├── frontend/                 # Application web (Next.js)
├── services/                 # Micro-services Node.js
│   ├── api-gateway/          # Gateway / proxy
│   ├── auth-service/         # Authentification & permissions
│   ├── commercial-service/   # Prospects, pipeline, relances, campagnes
│   ├── customer-service/     # CRM (clients, contacts, opportunites)
│   ├── billing-service/      # Devis & facturation
│   ├── project-service/      # Projets, taches, jalons
│   ├── hr-service/           # RH & paie (bulletins, exports, paie CI)
│   ├── technical-service/    # Missions & interventions
│   ├── procurement-service/  # Achats & logistique
│   ├── communication-service/# Emails & campagnes multicanal
│   ├── analytics-service/    # KPI & rapports
│   └── notification-service/ # Notifications
├── docs/                     # Documentation metier & technique
├── scripts/                  # Scripts utilitaires
├── docker-compose.yml        # Stack locale
└── nginx/                    # Config reverse-proxy
```

## 🚀 Lancer le projet

```
docker compose up -d --build
```

## 🔧 Tests & validation

```
npm run validate
```

## 📁 Services principaux

- **Commercial** : prospection, prospection terrain, pipeline, devis, campagnes/relances.
- **CRM** : clients, contacts, documents, interactions.
- **Projets** : portefeuille projets, taches, jalons, planning.
- **RH / Paie** : employes, paie, exports, bulletins, conformité CNPS/DGI/CMU/ITS.
- **Technique** : missions, interventions, rapports.
- **Achats** : demandes, proformas, commandes, receptions.

## ✅ Bonnes pratiques

- Suivre la structure modulaire dans `frontend/src/components`.
- Preferer les services `services/*` pour toute logique metier serveur.
- Documenter les workflows metiers dans `docs/`.

---

## 🧩 Flux RH & Paie (schéma)

```
RH / PAIE
Employés + Contrats
   │
   ▼
Calcul paie (brut, primes, retenues, IGR)
   │
   ▼
Bulletin généré → Validation → Paiement
   │
   ├─► Export DISA / DGI
   ├─► PDF individuel (bulletin)
   └─► PDF groupé (registre)
```

## 🏭 Installation production (guide rapide)

1) Déployer le projet sur le serveur (ex: `/opt/ParabellumGroups`).
2) Copier les variables d’environnement (voir section suivante).
3) Démarrer la stack Docker :

```
docker compose up -d --build
```

4) Vérifier la santé des services :

```
docker compose ps
```

5) Accéder à l’ERP via Nginx / reverse-proxy.

## 🔐 Variables d’environnement (par service)

### Communes
- `DATABASE_URL` (PostgreSQL)
- `REDIS_URL`
- `JWT_SECRET`
- `S3_BUCKET_NAME`
- `S3_ENDPOINT`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_FORCE_PATH_STYLE`

### `auth-service`
- `JWT_SECRET`
- `TOKEN_EXPIRES_IN`

### `commercial-service`
- `DATABASE_URL`
- `CRM_SERVICE_URL`

### `customer-service`
- `DATABASE_URL`

### `billing-service`
- `DATABASE_URL`
- `COMMERCIAL_SERVICE_URL`

### `project-service`
- `DATABASE_URL`

### `hr-service`
- `DATABASE_URL`
- `PAYROLL_CURRENCY` (ex: `XOF`)

### `communication-service`
- `DATABASE_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

### `notification-service`
- `DATABASE_URL`

### `analytics-service`
- `DATABASE_URL`

## 🧱 Conventions modules front

- Chaque domaine vit dans `frontend/src/components/<domaine>/...`
- Les pages Next.js restent dans `frontend/app/(dashboard)/dashboard/<domaine>/...`
- Les types et helpers réutilisables vont dans `frontend/src/types` et `frontend/src/utils`
- Les hooks métier vont dans `frontend/src/hooks`

## 🧾 Détails RH & Paie (structure)

```
frontend/
├── app/(dashboard)/dashboard/rh/
│   ├── accueil/                  # Accueil + raccourcis + contacts
│   ├── mode-emploi/              # Mode d’emploi LOGIPAIE RH
│   ├── parametres/               # Paramètres entreprise + paie + taux
│   ├── cumuls/                   # Gestion des cumuls mensuels
│   ├── personnel/
│   │   ├── liste/                # Gestion du personnel
│   │   ├── fiche-individuelle/   # Fiche individuelle salarié
│   │   ├── contrat-cdi/          # Contrat CDI auto
│   │   ├── contrat-cdd/          # Contrat CDD auto
│   │   ├── attestation-travail/  # Attestation travail
│   │   ├── certificat-travail/   # Certificat travail
│   │   ├── conges/
│   │   │   ├── gestion/          # Calcul congés
│   │   │   └── attestation/      # Attestation congés
│   │   ├── heures-supplementaires/ # Heures supplémentaires
│   │   ├── gratifications/         # Gratifications
│   │   ├── rupture-contrat/        # Indemnités de rupture
│   │   └── prets/                 # Gestion des prêts
│   ├── paie/
│   │   ├── traitement/           # Traitement paie
│   │   ├── bulletins/            # Bulletins individuels
│   │   ├── bulletins-groupes/    # Bulletins groupés
│   │   ├── livre-paie-mensuel/   # Livre de paie mensuel
│   │   └── livre-paie-annuel/    # Livre de paie annuel
│   ├── declarations/
│   │   ├── its/                  # Déclarations ITS
│   │   ├── fdfp/                 # Déclaration FDFP
│   │   ├── cnps/
│   │   │   ├── liste-nominative/ # Cotisation CNPS
│   │   │   └── declaration/      # Déclaration CNPS
│   │   ├── disa/                 # DISA
│   │   ├── dasc/                 # DASC
│   │   └── etat-301/
│   │       ├── page-1/           # Etat 301 page 1
│   │       └── page-2/           # Etat 301 page 2
│   ├── rns/
│   │   ├── donnees/              # Données RNS
│   │   └── releve/               # Relevé nominatif
│   ├── banque/
│   │   ├── ordre-virement/       # Ordre de virement
│   │   └── liste-virements/      # Liste des salaires à virer
│   ├── comptabilite/
│   │   ├── imputations/          # Imputations comptables
│   │   └── masse-salariale/      # Récap masse salariale
│   ├── provisions/
│   │   ├── conges/               # Provision congés
│   │   └── retraite/             # Provision retraite
│   ├── rapports/
│   │   ├── note-27b/             # Note 27B (SYSCOHADA)
│   │   ├── regul-annuelle-fdfp/  # Régulation annuelle FDFP
│   │   ├── journal-personnel/    # Journal du personnel
│   │   └── indicateurs-rh/       # Indicateurs RH
│   └── logipaie/                 # Portail LOGIPAIE RH (structure Excel)
├── src/components/hr/
│   ├── payroll/              # Cartes, exports, conformité, widgets
│   └── dashboard/            # Cockpit RH
├── src/components/printComponents/
│   └── PayslipPrint.tsx       # Impression bulletin
└── src/shared/api/hr/          # API RH

services/hr-service/
├── controllers/
│   ├── payroll.controller.js
│   └── logipaie.controller.js
├── routes/
│   ├── payroll.routes.js
│   └── logipaie.routes.js
├── utils/
│   └── payrollPdfTemplate.js
└── prisma/ (schema + migrations)
```

## 🧩 RH / Paie (LOGIPAIE_RH) - Modèle et MVC

### ✅ Technologies RH / Paie

- **Backend** : Node.js + Express, Prisma ORM, PostgreSQL
- **Frontend** : Next.js (App Router), React Query, composants UI internes
- **PDF** : génération côté service + impression UI (PayslipPrint)

### ✅ Modèle de données principal (LOGIPAIE_RH)

Tables clés (extrait) :
- `Configuration` (paramètres entreprise, taux CNPS/IGR)
- `Employe` (identité, CNPS, statut)
- `Contrat` (poste, salaire, dates)
- `VariablesMensuelle` (primes, heures sup, retenues)
- `BulletinPaie` (brut, net, IGR, retenues)
- `GestionConge`, `Absence`, `PretAvance`
- `DeclarationCnps`, `DeclarationFiscale`
- `LivrePaieMensuel`, `LivrePaieAnnuel`
- `CumulAnnuel`, `Gratification`, `IndemniteRupture`, `OrdreBancaire`
- `ProvisionCongeCalc`, `ProvisionRetraiteCalc`, `StatistiqueRh`

📄 Cahier des charges : `docs/LOGIPAIE_RH.xlk.xls`

### ✅ MVC backend (hr-service)

**Controllers**
- `employe.controller.js`
- `contract.controller.js`
- `conge.controller.js`
- `presence.controller.js` (absences)
- `evaluation.controller.js` (historique RH)
- `loan.controller.js`
- `payroll.controller.js`

**Routes principales**
- `GET /employees` : liste employés
- `GET /employees/:id` : détail employé
- `GET /employees/:id/contracts` : contrats
- `GET /payrolls` : bulletins
- `GET /payrolls/:id/pdf` : bulletin PDF
- `GET /payroll/exports/disa` : export DISA
- `GET /payroll/exports/dgi` : export DGI
- `GET /payroll/exports/pdf-grouped` : PDF groupé
- `POST /payroll/generate` : génération bulletin
- `POST /payroll/generate-all` : génération période
 - `GET /api/logipaie/*` : accès direct aux 26 tables LOGIPAIE (config, variables, déclarations, livres, virements, etc.)

### ✅ Frontend RH / Paie

Pages :
- `frontend/app/(dashboard)/dashboard/rh/paie/page.tsx`
- `frontend/app/(dashboard)/dashboard/hr/payroll/page.tsx`

Composants :
- `frontend/src/components/hr/payroll/*`
- `frontend/src/components/printComponents/PayslipPrint.tsx`

API frontend :
- `frontend/src/shared/api/hr/*`

### ✅ Endpoints RH / Paie (principaux)

- `GET /employees` / `GET /api/employes`
- `GET /employees/:id` / `GET /employees/:id/contracts`
- `GET /payrolls` / `GET /payrolls/:id`
- `POST /payroll/generate` / `POST /payroll/generate-all`
- `GET /payroll/exports/disa` / `GET /payroll/exports/dgi`
- `GET /payroll/exports/pdf-grouped`

### 🔧 Migration base RH (reset total)

```
cd services/hr-service
npx prisma migrate dev --name logipaie_rh
```

⚠️ Ce reset remplace l'ancien schéma RH par `LOGIPAIE_RH`.
