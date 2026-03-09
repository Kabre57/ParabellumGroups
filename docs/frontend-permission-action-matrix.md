# Frontend Permission Matrix

Ce document verrouille le comportement attendu du frontend: quelles pages sont visibles et quelles actions UI s'affichent selon les permissions.

## Regles globales

- Une permission de lecture controle la visibilite de la page et du menu associe.
- Les actions d'ecriture sont masquees si la permission correspondante manque.
- Les actions `Voir`, `Retour`, filtres, recherche et impression purement documentaire restent visibles tant qu'une page est lisible.
- Les alias frontend acceptes sont centralises dans [frontend/src/shared/permissions.ts](/home/theo_pbl/apps/ParabellumGroups/frontend/src/shared/permissions.ts).
- La logique CRUD d'affichage est centralisee dans [frontend/src/shared/action-visibility.ts](/home/theo_pbl/apps/ParabellumGroups/frontend/src/shared/action-visibility.ts).

## Administration

| Route | Lecture minimale | Actions visibles |
| --- | --- | --- |
| `/dashboard/admin/users` | `users.read`, `users.read_all`, `users.read_own` | `Nouvel utilisateur` -> `users.create`; `Modifier`/activation -> `users.update`; `Supprimer` -> `users.delete`; `Permissions utilisateur` + overrides -> `permissions.manage` ou `users.update` |
| `/dashboard/admin/roles` | `roles.read` | `Nouveau role` -> `roles.create`; `Supprimer` -> `roles.delete` |
| `/dashboard/admin/permissions` | `permissions.read` | `Nouvelle permission` -> `permissions.create`; `Edit` -> `permissions.update`; `Delete` -> `permissions.delete`; `Workflow` -> `permissions.manage` |
| `/dashboard/admin/permissions/workflow` | `permissions.read` ou `permissions.manage` | `Demandes en attente` + `Approuver/Rejeter` -> `permissions.manage`; `Creer une demande` -> `permissions.read` ou `permissions.manage`; `Roles avec templates` -> `roles.create` |

## CRM

| Route | Lecture minimale | Actions visibles |
| --- | --- | --- |
| `/dashboard/crm/clients` | `customers.read`, `customers.read_all`, `customers.read_assigned` | `Nouveau client` -> `customers.create`; `Archiver` -> `customers.delete`; `Voir` toujours visible |
| `/dashboard/crm/clients/[id]` | `customers.read`, `customers.read_all`, `customers.read_assigned` | `Modifier` -> `customers.update`; `Archiver` -> `customers.delete`; `Ajouter/Modifier contact` -> `customers.manage_contacts` ou `customers.update`; `Ajouter adresse` -> `customers.manage_addresses` ou `customers.update`; `Nouvelle interaction` -> `customers.update` |
| `/dashboard/crm/contacts` | `customers.read`, `customers.read_all`, `customers.read_assigned` | `Nouveau contact` -> `customers.manage_contacts` ou `customers.update`; `Modifier` -> meme permission; `Supprimer` -> `customers.manage_contacts` ou `customers.delete` |
| `/dashboard/crm/addresses` | `customers.read`, `customers.read_all`, `customers.read_assigned` | `Nouvelle adresse` -> `customers.manage_addresses` ou `customers.update`; `Modifier`/`Definir principale` -> meme permission; `Supprimer` -> `customers.manage_addresses` ou `customers.delete` |
| `/dashboard/crm/documents` | `documents.read`, `documents.read_all`, `customers.manage_documents` | `Ajouter document` -> `documents.upload` ou `customers.manage_documents`; `Modifier` -> `documents.update` ou `customers.manage_documents`; `Supprimer` -> `documents.delete` ou `customers.manage_documents` |
| `/dashboard/crm/interactions` | `customers.read`, `customers.read_all`, `customers.read_assigned` | `Nouvelle interaction` -> `customers.update` ou `prospects.manage_activities`; `Modifier` -> meme permission; `Supprimer` -> `customers.delete` ou `prospects.manage_activities` |
| `/dashboard/crm/opportunities` | `opportunities.read`, `opportunities.read_all`, `opportunities.read_own` | `Nouvelle opportunite` -> `opportunities.create`; `Modifier` -> `opportunities.update` ou `opportunities.change_stage`; `Supprimer` -> `opportunities.delete` |
| `/dashboard/crm/contracts` | `contracts.read`, `contracts.read_all` | `Nouveau contrat` -> `contracts.create`; `Valider/Terminer` -> `contracts.update`, `contracts.approve` ou `contracts.terminate`; `Telecharger` -> `contracts.export`; `Supprimer` -> `contracts.delete` |
| `/dashboard/crm/email-campaigns` | `emails.read` | `Nouvelle campagne` -> `emails.send` ou `emails.manage_templates`; `Modifier` -> meme permission; `Supprimer` -> `emails.manage_templates` |
| `/dashboard/crm/reports` | `reports.read`, `reports.read_sales`, `reports.read_operations` | `Nouveau rapport` -> `reports.create_report`; `Modifier`/`Supprimer` -> `reports.create_report`; `Telecharger` -> `reports.export` |
| `/dashboard/crm/type-clients` | `customers.read`, `customers.read_all`, `customers.read_assigned` | `Nouveau type` -> `customers.update`; `Modifier`/toggle -> `customers.update`; `Supprimer` -> `customers.delete` |

## Commercial

| Route | Lecture minimale | Actions visibles |
| --- | --- | --- |
| `/dashboard/commercial/prospects` | `prospects.read`, `prospects.read_all`, `prospects.read_own` | `Nouveau prospect` -> `prospects.create`; `Modifier` -> `prospects.update`; `Supprimer` -> `prospects.delete` |
| `/dashboard/commercial/pipeline` | `opportunities.read`, `opportunities.read_all`, `opportunities.read_own` | `Nouvelle opportunite` -> `opportunities.create`; `Modifier` -> `opportunities.update` ou `opportunities.change_stage`; `Supprimer` -> `opportunities.delete` |
| `/dashboard/commercial/quotes` | `quotes.read`, `quotes.read_all`, `quotes.read_own` | `Nouveau devis` -> `quotes.create`; `Modifier` -> `quotes.update` ou `quotes.approve`; `Supprimer` -> `quotes.delete`; `Exporter/Imprimer` -> `quotes.export` ou `quotes.print` |

## Achats

| Route | Lecture minimale | Actions visibles |
| --- | --- | --- |
| `/dashboard/achats/commandes` | `purchase_orders.read` | `Nouvelle commande` -> `purchase_orders.create`; `Modifier` -> `purchase_orders.update`, `purchase_orders.approve`, `purchase_orders.receive`, `purchase_orders.send`; `Supprimer` -> `purchase_orders.delete` ou `purchase_orders.cancel`; `Voir` toujours visible; `Imprimer` -> `purchase_orders.send`; `Creer une reception` -> permission update/receive |
| `/dashboard/achats/produits` | `products.read` | `Nouveau produit` -> `products.create`; `Modifier` -> `products.update` ou `products.manage_pricing`; `Supprimer` -> `products.delete` |
| `/dashboard/achats/fournisseurs` | `suppliers.read` | `Nouveau fournisseur` -> `suppliers.create`; `Modifier` -> `suppliers.update` ou `suppliers.evaluate`; `Supprimer` -> `suppliers.delete` |
| `/dashboard/achats/stock` | `inventory.read`, `inventory.read_all`, `inventory.read_warehouse` | `Ajuster stock` -> `inventory.update`, `inventory.adjust`, `inventory.transfer`, `inventory.count`; `Ajouter un article` -> `inventory.create`; bouton `Ajuster` ligne -> meme permission |
| `/dashboard/achats/audit` | `inventory.read`, `inventory.read_all`, `inventory.count` | `Nouvel audit` -> `inventory.count` ou `inventory.adjust` |
| `/dashboard/achats/receptions` | `purchase_orders.read` ou `inventory.read` | `Valider reception` -> `purchase_orders.receive` ou `inventory.update` |

## RH

| Route | Lecture minimale | Actions visibles |
| --- | --- | --- |
| `/dashboard/rh/employes` | `employees.read`, `employees.read_all`, `employees.read_own`, `employees.read_team` | `Nouvel employe` -> `employees.create`; `Modifier` -> `employees.update`; `Voir profil` toujours visible |
| `/dashboard/rh/employes/[id]` | `employees.read`, `employees.read_all`, `employees.read_own`, `employees.read_team` | `Modifier` -> `employees.update` ou `employees.update_own` |
| `/dashboard/rh/contrats` | `contracts.read`, `contracts.read_all` | `Nouveau contrat` -> `contracts.create`; `Telecharger PDF` -> `contracts.export`; `Valider/Terminer` -> `contracts.update`, `contracts.approve`, `contracts.terminate`; `Supprimer` -> `contracts.delete` |
| `/dashboard/rh/conges` | `leaves.read`, `leaves.read_all`, `leaves.read_own`, `leaves.read_team` | `Nouvelle demande` -> `leaves.create`; `Approuver/Rejeter` -> `leaves.approve` ou `leaves.reject` |
| `/dashboard/rh/prets` | `loans.read`, `loans.read_all`, `loans.read_own` | `Nouvelle demande` -> `loans.create`; `Cloturer` -> `loans.update`, `loans.manage_repayment`, `loans.approve`; `Supprimer` -> `loans.delete` |
| `/dashboard/rh/evaluations` | `evaluations.read`, `evaluations.read_all`, `evaluations.read_own`, `evaluations.read_team` | `Nouvelle evaluation` -> `evaluations.create`; `Modifier` -> `evaluations.update` ou `evaluations.validate` |
| `/dashboard/rh/paie` | `payroll.read`, `payroll.read_all`, `payroll.read_own` | `Exporter` -> `payroll.export`; `Generer paie` -> `payroll.create` ou `payroll.process`; `Ajuster/Recalculer` -> `payroll.update` ou `payroll.process`; `Valider/Payer` -> `payroll.validate` ou `payroll.process` |

## Technique

| Route | Lecture minimale | Actions visibles |
| --- | --- | --- |
| `/dashboard/technical/interventions` | `interventions.read`, `interventions.read_all`, `interventions.read_assigned` | `Nouvelle intervention` -> `interventions.create`; `Terminer` -> `interventions.complete`; `Modifier` -> `interventions.update`; `Supprimer` -> `interventions.delete`; `Imprimer` -> `interventions.create_report`; `Voir` toujours visible |
| `/dashboard/technical/interventions/[id]` | `interventions.read`, `interventions.read_all`, `interventions.read_assigned` | `Modifier` -> `interventions.update`; `Imprimer` -> `interventions.create_report`; `Ajouter technicien` -> `interventions.assign_technician` ou `interventions.update`; `Ajouter materiel` -> `interventions.assign_material` ou `interventions.update` |
| `/dashboard/technical/missions` | `missions.read`, `missions.read_all`, `missions.read_assigned` | `Nouvelle mission` -> `missions.create`; `Modifier` -> `missions.update` ou `missions.assign`; `Supprimer` -> `missions.delete`; `Imprimer` -> lecture/export documentaire; `Changer statut` -> `missions.change_status` ou `missions.complete`; `Voir` toujours visible |
| `/dashboard/technical/techniciens` | `techniciens.read` | `Nouveau technicien` -> `techniciens.create`; `Modifier` -> `techniciens.update` ou `techniciens.manage_specialties`; `Supprimer` -> `techniciens.delete`; `Imprimer` -> `techniciens.read_performance`; `Voir` toujours visible |
| `/dashboard/technical/specialites` | `specialites.read` | `Nouvelle specialite` -> `specialites.create`; `Modifier` -> `specialites.update`; `Supprimer` -> `specialites.delete`; `Imprimer` -> lecture documentaire |
| `/dashboard/technical/materiel` | `materiel.read` | `Nouveau materiel` -> `materiel.create`; `Modifier` -> `materiel.update`, `materiel.assign`, `materiel.maintenance`; `Supprimer` -> `materiel.delete` |
| `/dashboard/technical/equipment` | `materiel.read` | `Nouveau materiel` -> `materiel.create`; `Modifier` -> `materiel.update`, `materiel.assign`, `materiel.maintenance`; `Supprimer` -> `materiel.delete`; `Imprimer` -> `materiel.track_stock` |
| `/dashboard/technical/rapports` | `reports.read`, `reports.read_technical` | `Nouveau rapport` -> `interventions.create_report` ou `reports.create_report`; `Imprimer le rapport`/`Apercu PDF` -> `reports.export` ou `interventions.create_report`; `Supprimer photo` -> `reports.delete`; `Voir` toujours visible |

## Notes d'audit

- Les permissions du sidebar ont ete alignees avec le seed auth et doivent rester synchronisees avec [scripts/audit-sidebar-permissions.js](/home/theo_pbl/apps/ParabellumGroups/scripts/audit-sidebar-permissions.js).
- Les pages qui n'ont qu'une vue en lecture ne doivent pas afficher de CTA de creation implicite dans les etats vides.
- Le frontend doit preferer masquer les actions non autorisees plutot que rediriger vers `/access-denied` pendant la navigation normale.
