ovici le plan d’architecture détaillé pour pour ajouter :

module placements
module états financiers / réglementaires robustes
1. Vision cible
L’objectif est d’avoir un noyau comptable unique, persistant et auditable, sur lequel viennent se brancher:

la comptabilité générale
la trésorerie
les achats / ventes
le portefeuille de placements
les états de synthèse et rapports réglementaires
Principe central:

toutes les opérations validées finissent en AccountingJournalEntry
les rapports lisent d’abord les écritures persistées
les modules métier alimentent le journal via des workflows contrôlés
2. Architecture cible globale
Je recommande 4 couches.

Référentiels
plan comptable
journaux
périodes comptables
tiers
familles comptables
actifs financiers
contreparties
banques / caisses
Moteurs métier
moteur comptable
moteur trésorerie
moteur placements
moteur budget / analytique
Journalisation et calcul
écritures comptables persistantes
valorisations
cash-flows attendus
agrégats de reporting
clôtures
Restitution
balance
grand livre
bilan
compte de résultat
tableaux réglementaires
dashboards placements
3. Module États Financiers / Réglementaires
Objectif: rendre la comptabilité fiable, clôturable et exploitable pour les états officiels.

3.1 Données à créer / renforcer
Tables nouvelles ou à compléter:

AccountingPeriod

id
name
startDate
endDate
status : OPEN, CLOSED, LOCKED
fiscalYearId
FiscalYear

id
label
startDate
endDate
status
AccountingJournal

id
code
label
type : vente, achat, banque, caisse, OD
AccountingJournalEntry

déjà existant, à renforcer si besoin:
journalId
periodId
entryNumber
entryDate
status
sourceModule
sourceType
sourceId
validatedBy
validatedAt
postedAt
AccountingJournalLine

entryId
accountId
debit
credit
description
thirdPartyId
costCenterId
enterpriseId
ThirdPartyAccountLink

pour lier tiers/fournisseur/client à comptes auxiliaires si nécessaire
AccountingReportSnapshot

pour historiser les états produits à date donnée
AccountingDiagnostic

anomalies de configuration / déséquilibre / familles manquantes
3.2 Services backend
Créer ou structurer:

services/billing-service/core/services/AccountingPostingService.js

point unique de création des écritures persistantes
services/billing-service/core/services/AccountingPeriodService.js

ouverture / clôture / verrouillage des périodes
services/billing-service/core/services/TrialBalanceService.js

balance générale
services/billing-service/core/services/GeneralLedgerService.js

grand livre
services/billing-service/core/services/FinancialStatementService.js

bilan
compte de résultat
annexes synthétiques
services/billing-service/core/services/RegulatoryReportService.js

exports paramétrés
services/billing-service/core/services/AccountingDiagnosticService.js

familles manquantes
écritures non équilibrées
périodes incohérentes
comptes de trésorerie non liés
3.3 Contrôleurs / routes
À ajouter:

/api/billing/accounting/periods
/api/billing/accounting/fiscal-years
/api/billing/accounting/trial-balance
/api/billing/accounting/general-ledger
/api/billing/accounting/balance-sheet
/api/billing/accounting/income-statement
/api/billing/accounting/regulatory-reports
/api/billing/accounting/diagnostics
3.4 Frontend
Pages à créer:

comptabilite/periodes
comptabilite/grand-livre
comptabilite/bilan
comptabilite/compte-resultat
comptabilite/diagnostic
comptabilite/rapports-reglementaires
Composants principaux:

filtres période / exercice / entreprise
tableau de grand livre
arborescence bilan / résultat
centre de diagnostic comptable
export PDF / Excel / CSV
3.5 Règles métier clés

aucune écriture sur période clôturée
toute écriture doit être équilibrée
numérotation unique par journal et période
validation comptable obligatoire avant comptabilisation finale sur certains flux
balance, grand livre, bilan et résultat lisent le journal persistant
4. Module Placements
Objectif: gérer portefeuille, titres, valorisation, cash-flows, rendement et risque.

4.1 Modèle de données
Tables à créer:

InvestmentPortfolio

id
code
label
enterpriseId
regimeId
baseCurrency
status
InvestmentAsset

id
assetCode
label
assetType
issuer
currency
nominalValue
maturityDate
couponRate
paymentFrequency
riskCategory
InvestmentHolding

position détenue
portfolioId
assetId
quantity
bookValue
marketValue
accruedInterest
valuationDate
InvestmentTransaction

portfolioId
assetId
transactionType
tradeDate
settlementDate
quantity
unitPrice
grossAmount
fees
taxes
status
InvestmentValuation

assetId
portfolioId
valuationDate
valuationMethod
bookValue
marketValue
unrealizedGainLoss
ExpectedCashflow

assetId
portfolioId
flowType
dueDate
expectedAmount
receivedAmount
status
CustodyFeeRule

règles de droits de garde
CustodyFeeCharge

frais calculés
InvestmentCoverage

couvertures inter-régimes
InvestmentAlert

échéance proche
coupon attendu
anomalie de valorisation
InvestmentAccountingMapping

comptes comptables pour:
acquisition
produit financier
plus-value / moins-value
intérêts courus
frais
4.2 Services backend
Créer:

InvestmentPortfolioService.js
InvestmentTransactionService.js
InvestmentValuationService.js
InvestmentCashflowService.js
InvestmentPerformanceService.js
InvestmentRiskService.js
InvestmentAlertService.js
InvestmentAccountingService.js
4.3 Fonctions métier à couvrir

comptabilité matière des titres
historique des mouvements
valorisation périodique
calcul des coupons / dividendes / loyers / échéances DAT
suivi des tombées d’échéance
calcul droits de garde
estimation de valeur liquidative
rendement par actif / classe / portefeuille
analyse de risque simple puis avancée
4.4 Intégration comptable
Chaque événement placement validé doit produire une écriture:

achat d’actif
vente
coupon encaissé
dividende encaissé
loyer perçu
amortissement / dépréciation si requis
droits de garde
Cela passe par:

InvestmentAccountingService
puis AccountingPostingService
4.5 Frontend placements
Pages à prévoir:

placements/portefeuilles
placements/actifs
placements/positions
placements/transactions
placements/valorisations
placements/cashflows
placements/alertes
placements/performance
placements/risque
Composants:

tableau positions
fiche actif
calendrier des échéances
dashboard portefeuille
courbes de valorisation
vue cash-flows attendus vs reçus
5. Dépendances entre les 2 blocs
Il faut faire états financiers robustes avant placements avancés.

Pourquoi:

les placements doivent poster des écritures propres
les états réglementaires doivent s’appuyer sur un journal fiable
sinon on construit un module placements sur une base comptable encore instable
Ordre strict:

stabiliser journal comptable persistant
périodes comptables / clôtures
balance + grand livre + états de synthèse
intégration comptable fiable des flux existants
module placements
rapports réglementaires enrichis
6. Ordre d’implémentation recommandé
Phase 1: noyau comptable

clôtures comptables
journaux
grand livre
balance robuste
bilan
compte de résultat
diagnostic comptable
permissions comptables fines
Phase 2: trésorerie renforcée

rapprochement bancaire
avis d’opérations
budget de trésorerie
validation comptable des encaissements/décaissements
Phase 3: comptabilité analytique

centres de coûts
axes analytiques
ventilation des écritures
reporting analytique
Phase 4: placements

référentiel actifs
portefeuilles
transactions
positions
valorisations
cash-flows attendus
alertes
Phase 5: performance et risque

rendement
volatilité simple
exposition par classe d’actif
valeur liquidative
Phase 6: réglementaire

exports officiels
snapshots
auditabilité
contrôles de cohérence
7. Permissions à prévoir
Nouvelles permissions conseillées:

accounting.periods.manage
accounting.reports.read
accounting.reports.export
accounting.statements.read
accounting.statements.generate
investments.read
investments.manage
investments.valuate
investments.cashflows.read
investments.risk.read
investments.accounting.post
8. Risques à traiter dès l’architecture

ne pas continuer avec rapports reconstruits partiellement hors journal
éviter les comptes hardcodés
ne pas mélanger validation métier et comptabilisation finale
verrouiller les périodes clôturées
imposer piste d’audit sur toute validation sensible
prévoir multi-entreprise / multi-régime dès le schéma
9. Livrables d’architecture
Je recommande de produire ensuite 4 documents internes:

cartographie des flux comptables
modèle de données cible
matrice permissions / rôles
plan de migration du journal actuel vers journal persistant unique

Voici le modèle de données détaillé que je recommande, aligné avec les noms déjà présents dans le projet.

Je le découpe en 2 blocs:

États financiers / réglementaires
Placements
Et je distingue:

tables à créer
tables existantes à enrichir
relations clés
1. Noyau comptable cible
Le principe cible est simple:

toutes les opérations validées aboutissent à AccountingJournalEntry + AccountingJournalLine
les états lisent prioritairement ce journal persistant
les périodes comptables verrouillent la production officielle
1.1 Tables existantes à enrichir
Tables déjà là dans schema.prisma (line 360):

AccountingAccount
AccountingFamilyRule
AccountingJournalEntry
AccountingJournalLine
TreasuryAccount
Encaissement
Decaissement
Budget, BudgetVersion, BudgetAllocation
Je recommande les enrichissements suivants.

AccountingJournalEntry

ajouter journalId String?
ajouter periodId String?
ajouter fiscalYearId String?
ajouter status AccountingJournalEntryStatus @default(DRAFT)
ajouter postedAt DateTime?
ajouter validatedAt DateTime?
ajouter validatedByUserId String?
ajouter reversedEntryId String?
ajouter isLocked Boolean @default(false)
AccountingJournalLine

ajouter enterpriseId Int?
ajouter thirdPartyId String?
ajouter thirdPartyName String?
ajouter costCenterId String?
ajouter analyticAxisId String?
ajouter allocationKey String?
ajouter currency String @default("XOF")
ajouter exchangeRate Float?
ajouter amountCurrency Float?
AccountingAccount

ajouter parentId String?
ajouter level Int @default(1)
ajouter categoryCode String?
ajouter allowManualPosting Boolean @default(true)
ajouter requiresThirdParty Boolean @default(false)
ajouter requiresCostCenter Boolean @default(false)
BudgetAllocation

ajouter costCenterId String?
ajouter analyticAxisId String?
1.2 Tables à créer pour les états financiers
FiscalYear

id String @id @default(uuid())
code String @unique
label String
startDate DateTime
endDate DateTime
status FiscalYearStatus @default(OPEN)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
AccountingPeriod

id String @id @default(uuid())
fiscalYearId String
code String
label String
startDate DateTime
endDate DateTime
periodType AccountingPeriodType
status AccountingPeriodStatus @default(OPEN)
closedAt DateTime?
closedByUserId String?
lockedAt DateTime?
lockedByUserId String?
relation fiscalYear -> FiscalYear
Index:

@@index([fiscalYearId])
@@index([startDate, endDate])
@@unique([fiscalYearId, code])
AccountingJournal

id String @id @default(uuid())
code String @unique
label String
type AccountingJournalType
description String?
isActive Boolean @default(true)
enterpriseId Int?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
AccountingEntrySequence

id String @id @default(uuid())
journalId String
periodId String
nextNumber Int @default(1)
relation vers AccountingJournal, AccountingPeriod
Permet:

numérotation unique par journal / période
AccountingClosing

id String @id @default(uuid())
periodId String
status AccountingClosingStatus
notes String?
snapshotData Json?
createdByUserId String?
validatedByUserId String?
createdAt DateTime @default(now())
validatedAt DateTime?
AccountingDiagnosticRun

id String @id @default(uuid())
runDate DateTime @default(now())
scope String
status String
summary Json
createdByUserId String?
AccountingDiagnosticIssue

id String @id @default(uuid())
runId String
issueType String
severity String
entityType String
entityId String?
message String
details Json?
AccountingReportSnapshot

id String @id @default(uuid())
reportType AccountingReportType
periodId String?
fiscalYearId String?
enterpriseId Int?
generatedAt DateTime @default(now())
generatedByUserId String?
parameters Json
payload Json
Ça permet:

de figer un bilan ou une balance à date donnée
1.3 Tables analytiques
CostCenter

id String @id @default(uuid())
code String @unique
label String
description String?
isActive Boolean @default(true)
parentId String?
AnalyticAxis

id String @id @default(uuid())
code String @unique
label String
description String?
isActive Boolean @default(true)
AnalyticValue

id String @id @default(uuid())
axisId String
code String
label String
isActive Boolean @default(true)
AnalyticAllocation

id String @id @default(uuid())
journalLineId String
axisId String?
valueId String?
costCenterId String?
percentage Float
amount Float
2. Module placements
Le module placements doit être séparé du noyau comptable, mais branché dessus.

2.1 Référentiel placements
InvestmentPortfolio

id String @id @default(uuid())
code String @unique
label String
enterpriseId Int?
regimeCode String?
baseCurrency String @default("XOF")
status InvestmentPortfolioStatus @default(ACTIVE)
description String?
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
InvestmentAsset

id String @id @default(uuid())
assetCode String @unique
label String
assetType InvestmentAssetType
assetClass InvestmentAssetClass
issuerName String?
issuerCountry String?
currency String @default("XOF")
isin String?
referenceRate String?
couponRate Float?
dividendPolicy String?
nominalValue Float?
issueDate DateTime?
maturityDate DateTime?
paymentFrequency String?
riskCategory String?
isActive Boolean @default(true)
metadata Json?
InvestmentCounterparty

id String @id @default(uuid())
code String @unique
name String
type InvestmentCounterpartyType
contactInfo Json?
isActive Boolean @default(true)
Custodian

id String @id @default(uuid())
code String @unique
name String
contactInfo Json?
isActive Boolean @default(true)
2.2 Positions et opérations
InvestmentHolding

id String @id @default(uuid())
portfolioId String
assetId String
quantity Float
bookValue Float
averageCost Float
marketValue Float?
accruedInterest Float?
valuationDate DateTime?
status InvestmentHoldingStatus @default(OPEN)
createdAt DateTime @default(now())
updatedAt DateTime @updatedAt
Contrainte:

@@unique([portfolioId, assetId])
InvestmentTransaction

id String @id @default(uuid())
portfolioId String
assetId String
counterpartyId String?
transactionType InvestmentTransactionType
tradeDate DateTime
settlementDate DateTime?
quantity Float
unitPrice Float
grossAmount Float
fees Float @default(0)
taxes Float @default(0)
netAmount Float
currency String @default("XOF")
exchangeRate Float?
status InvestmentTransactionStatus @default(DRAFT)
reference String?
notes String?
createdByUserId String?
validatedByUserId String?
validatedAt DateTime?
InvestmentCorporateAction

id String @id @default(uuid())
assetId String
portfolioId String?
actionType InvestmentCorporateActionType
effectiveDate DateTime
recordDate DateTime?
paymentDate DateTime?
grossAmount Float?
netAmount Float?
currency String?
status String
metadata Json?
2.3 Valorisation et performance
InvestmentValuation

id String @id @default(uuid())
portfolioId String
assetId String
valuationDate DateTime
valuationMethod InvestmentValuationMethod
bookValue Float
marketValue Float
accruedInterest Float @default(0)
unrealizedGainLoss Float @default(0)
priceSource String?
priceValue Float?
metadata Json?
Contrainte:

@@unique([portfolioId, assetId, valuationDate])
PortfolioValuationSnapshot

id String @id @default(uuid())
portfolioId String
valuationDate DateTime
bookValue Float
marketValue Float
cashValue Float
netAssetValue Float
performanceYtd Float?
performanceSinceInception Float?
riskScore Float?
InvestmentPerformanceMetric

id String @id @default(uuid())
portfolioId String?
assetId String?
asOfDate DateTime
metricType InvestmentMetricType
value Float
periodLabel String?
InvestmentRiskMetric

id String @id @default(uuid())
portfolioId String?
assetId String?
asOfDate DateTime
metricType InvestmentRiskMetricType
value Float
metadata Json?
2.4 Cash-flows attendus
ExpectedCashflow

id String @id @default(uuid())
portfolioId String
assetId String
flowType ExpectedCashflowType
dueDate DateTime
expectedAmount Float
receivedAmount Float @default(0)
currency String @default("XOF")
status ExpectedCashflowStatus @default(PENDING)
sourceTransactionId String?
reference String?
notes String?
MaturityAlert

id String @id @default(uuid())
portfolioId String
assetId String
alertType MaturityAlertType
triggerDate DateTime
dueDate DateTime
status MaturityAlertStatus @default(PENDING)
message String
sentAt DateTime?
2.5 Droits de garde
CustodyFeeRule

id String @id @default(uuid())
custodianId String?
assetClass InvestmentAssetClass?
rateType CustodyFeeRateType
rateValue Float
minimumFee Float?
currency String @default("XOF")
isActive Boolean @default(true)
effectiveFrom DateTime
effectiveTo DateTime?
CustodyFeeCharge

id String @id @default(uuid())
portfolioId String
assetId String?
custodianId String?
periodStart DateTime
periodEnd DateTime
calculatedBase Float
rateApplied Float
amount Float
currency String @default("XOF")
status CustodyFeeChargeStatus @default(CALCULATED)
reference String?
2.6 Couvertures inter-régimes
InvestmentCoverage

id String @id @default(uuid())
sourcePortfolioId String
targetPortfolioId String
assetId String?
coverageType InvestmentCoverageType
effectiveDate DateTime
amount Float
status String
notes String?
2.7 Mapping comptable placements
InvestmentAccountingMapping

id String @id @default(uuid())
assetType InvestmentAssetType?
assetClass InvestmentAssetClass?
transactionType InvestmentTransactionType?
eventType String
debitAccountId String?
creditAccountId String?
expenseAccountId String?
incomeAccountId String?
isActive Boolean @default(true)
Ce mapping permet:

achat d’actif
vente
coupon
dividende
loyer
frais de garde
amortissement / dépréciation
3. Relations clés
Relations critiques à prévoir:

FiscalYear 1 -> n AccountingPeriod
AccountingJournal 1 -> n AccountingJournalEntry
AccountingPeriod 1 -> n AccountingJournalEntry
AccountingJournalEntry 1 -> n AccountingJournalLine
AccountingAccount 1 -> n AccountingJournalLine
TreasuryAccount n -> 1 AccountingAccount
InvestmentPortfolio 1 -> n InvestmentHolding
InvestmentPortfolio 1 -> n InvestmentTransaction
InvestmentPortfolio 1 -> n InvestmentValuation
InvestmentAsset 1 -> n InvestmentTransaction
InvestmentAsset 1 -> n ExpectedCashflow
InvestmentAsset 1 -> n InvestmentValuation
4. Enums à ajouter
Enums conseillés:

FiscalYearStatus

OPEN, CLOSED, LOCKED
AccountingPeriodType

MONTH, QUARTER, SEMESTER, YEAR, CUSTOM
AccountingPeriodStatus

OPEN, CLOSED, LOCKED
AccountingJournalType

SALES, PURCHASE, BANK, CASH, GENERAL, PAYROLL, INVESTMENT
AccountingJournalEntryStatus

DRAFT, VALIDATED, POSTED, REVERSED
AccountingReportType

TRIAL_BALANCE, GENERAL_LEDGER, BALANCE_SHEET, INCOME_STATEMENT, REGULATORY
InvestmentAssetType

BOND, EQUITY, TERM_DEPOSIT, REAL_ESTATE, FUND_UNIT, TREASURY_BILL, OTHER
InvestmentAssetClass

FIXED_INCOME, EQUITY, REAL_ESTATE, CASH_EQUIVALENT, ALTERNATIVE
InvestmentTransactionType

BUY, SELL, COUPON, DIVIDEND, RENT, MATURITY, REINVESTMENT, FEE, REVALUATION
InvestmentValuationMethod

AMORTIZED_COST, MARK_TO_MARKET, MODEL_BASED, MANUAL
ExpectedCashflowType

COUPON, DIVIDEND, RENT, MATURITY, INTEREST, TERM_DEPOSIT_MATURITY
5. Ordre de création conseillé
Je recommande cet ordre exact en base:

FiscalYear
AccountingPeriod
AccountingJournal
enrichissement AccountingJournalEntry
enrichissement AccountingJournalLine
CostCenter, AnalyticAxis, AnalyticValue, AnalyticAllocation
AccountingReportSnapshot
AccountingDiagnosticRun, AccountingDiagnosticIssue
InvestmentPortfolio
InvestmentAsset
InvestmentCounterparty, Custodian
InvestmentHolding
InvestmentTransaction
InvestmentValuation
ExpectedCashflow
CustodyFeeRule, CustodyFeeCharge
InvestmentCoverage
InvestmentAccountingMapping
6. Recommandation pratique