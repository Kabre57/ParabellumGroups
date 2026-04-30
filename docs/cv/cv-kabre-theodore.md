# KABRE THEODORE

**Développeur Full-Stack JavaScript / ERP / Automatisation métier**

Téléphone : à compléter  
Email : à compléter  
Localisation : à compléter  
GitHub : à compléter  
LinkedIn : à compléter

---

## Profil professionnel

Développeur full-stack orienté solutions métier, spécialisé dans la conception et l'amélioration d'applications ERP, d'API backend, de tableaux de bord web et de processus de déploiement Docker. Expérience récente sur le projet **ParabellumGroups ERP**, avec un travail complet sur le module comptabilité, les permissions système, les migrations Prisma, la documentation technique et la préparation au déploiement VPS.

Capable d'intervenir sur l'ensemble du cycle de développement : analyse fonctionnelle, modélisation base de données, développement backend, intégration frontend, sécurisation des accès, documentation, tests de vérification et mise en production.

---

## Compétences clés

**Backend**

- Node.js, Express.js, API REST
- Prisma ORM, migrations Prisma
- PostgreSQL
- Gestion des permissions RBAC
- Validation métier côté serveur
- Architecture microservices

**Frontend**

- Next.js, React, TypeScript
- TanStack Query
- Interfaces de gestion ERP
- Tableaux de bord comptables et opérationnels
- Formulaires métier et intégration API

**DevOps et déploiement**

- Docker, Docker Compose
- Déploiement sur VPS Linux
- Git, Git pull, build et relance de services
- Vérification des conteneurs, logs et migrations
- Documentation de commandes de production

**Comptabilité et ERP**

- Module comptabilité ERP
- Plan comptable et familles comptables dynamiques
- Encaissements, décaissements, trésorerie
- Balance comptable et rapports reconstruits
- Notions de plan comptable OHADA

**Documentation et qualité**

- Rédaction de rapports techniques
- Rédaction de manuels utilisateurs
- Documentation Docker/VPS
- Analyse critique des risques techniques
- Vérification des migrations et permissions en base

---

## Expérience projet principale

### ParabellumGroups ERP

**Développeur Full-Stack / Backend / Comptabilité / DevOps**  
Période : mars 2026 - avril 2026

Projet ERP modulaire destiné à centraliser plusieurs fonctions d'entreprise : comptabilité, facturation, achats, inventaire, clients, projets, RH, communication, analytics et services techniques.

### Réalisations principales

#### Module comptabilité

- Analyse complète du module comptable existant et identification des risques techniques.
- Sécurisation des **familles comptables dynamiques** côté backend.
- Ajout d'une validation stricte du type de compte comptable attendu selon la famille.
- Correction d'un bug critique dans la balance comptable lié à une mauvaise variable `d.paymentMethod`.
- Ajout d'un diagnostic des familles comptables obligatoires afin d'identifier les configurations manquantes ou invalides.
- Clarification de la logique entre écritures persistantes et écritures reconstruites dans les rapports.

#### Trésorerie et comptes comptables

- Ajout d'une relation entre les comptes de trésorerie et les comptes comptables.
- Création du champ `TreasuryAccount.accountingAccountId` dans le modèle Prisma.
- Création d'une migration SQL pour relier `treasury_accounts` à `accounting_accounts`.
- Validation backend pour garantir qu'un compte de trésorerie ne peut être lié qu'à un compte comptable actif de type actif.
- Adaptation des workflows pour utiliser le vrai compte comptable lié à la banque ou à la caisse.
- Conservation d'un comportement de secours avec les mappings existants pour éviter les ruptures sur les données déjà présentes.

#### Encaissements et décaissements

- Ajout d'une validation backend des encaissements manuels.
- Blocage des encaissements utilisant un mauvais type de compte comptable.
- Ajout d'une validation backend des décaissements manuels.
- Blocage des décaissements utilisant un compte non compatible avec une charge.
- Amélioration de la cohérence des écritures générées automatiquement.

#### Permissions système

- Création de permissions comptables dédiées :
  - `accounting.read`
  - `accounting.accounts.manage`
  - `accounting.rules.read`
  - `accounting.rules.update`
  - `accounting.entries.create`
  - `accounting.treasury.manage`
  - `accounting.diagnostics.read`
- Intégration des nouveaux droits dans les scripts de synchronisation.
- Mise à jour des modèles de rôles système.
- Remplacement progressif des anciennes permissions trop larges par des permissions comptables spécialisées.

#### Frontend comptabilité

- Mise à jour du formulaire de création de compte de trésorerie.
- Ajout de la sélection d'un compte comptable lié depuis l'interface.
- Filtrage frontend des comptes comptables actifs de type actif.
- Affichage du compte comptable lié dans la liste des comptes de trésorerie.
- Mise à jour des types TypeScript de l'API billing.
- Ajout du support frontend pour le diagnostic des familles comptables.

#### Docker, Prisma et VPS

- Reconstruction des services Docker `billing-service` et `auth-service`.
- Application de la migration Prisma dans l'environnement Docker.
- Resynchronisation des rôles et permissions système.
- Vérification de la présence de la colonne `accountingAccountId` en base.
- Vérification de la présence des permissions `accounting.*` en base.
- Documentation des commandes à exécuter sur le VPS après un `git pull`.

#### Documentation

- Rédaction d'un rapport d'analyse critique du module comptable.
- Rédaction d'un rapport des modifications apportées.
- Mise à jour du tutoriel Docker avec les commandes de migration et de synchronisation.
- Rédaction d'un manuel d'utilisation détaillé du logiciel.
- Préparation de documents professionnels liés au suivi d'activité.

---

## Technologies utilisées sur le projet

- JavaScript, TypeScript
- Node.js, Express.js
- Next.js, React
- Prisma ORM
- PostgreSQL
- Docker, Docker Compose
- Git
- Linux VPS
- REST API
- RBAC / permissions système
- HTML, Markdown, documentation technique

---

## Résultats obtenus

- Module comptable plus sécurisé côté backend.
- Meilleure fiabilité des familles comptables dynamiques.
- Compatibilité avec plusieurs banques et plusieurs caisses.
- Réduction des risques d'erreurs comptables via API.
- Permissions comptables mieux séparées des permissions dépenses/paiements.
- Migration Prisma appliquée et validée.
- Documentation VPS prête pour le déploiement.
- Base technique plus claire pour les prochaines évolutions du module comptabilité.

---

## Formation

**Formation : à compléter**  
Établissement : à compléter  
Année : à compléter

---

## Langues

- Français : courant
- Anglais : à compléter

---

## Qualités professionnelles

- Rigueur dans l'analyse technique
- Sens du détail dans les règles métier
- Capacité à documenter clairement
- Autonomie dans le diagnostic et la correction
- Vision full-stack, du frontend jusqu'au déploiement

