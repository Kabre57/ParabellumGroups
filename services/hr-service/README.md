# 🧾 Détails RH & Paie (structure)

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
