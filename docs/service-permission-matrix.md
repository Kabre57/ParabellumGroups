# Matrice Services -> Sous-modules -> Permissions

Source: `services/auth-service/prisma/seed-complete-permissions.js` et regroupement frontend courant.

## Tableau de Bord

### Dashboards associes

- `/dashboard` - Dashboard global
- `/dashboard/analytics` - Analytics global

### Rapports

- `reports.create_report`
- `reports.export`
- `reports.read`
- `reports.schedule`

### Tableau de bord

- `dashboard.export`
- `dashboard.manage_widgets`
- `dashboard.read`
- `dashboard.read_analytics`
- `dashboard.read_widgets`

## Commercial

### Dashboards associes

- `/dashboard/commercial/prospects` - Dashboard commercial

### Devis & propositions

- `quotes.approve`
- `quotes.convert`
- `quotes.create`
- `quotes.delete`
- `quotes.duplicate`
- `quotes.export`
- `quotes.print`
- `quotes.read`
- `quotes.read_all`
- `quotes.read_own`
- `quotes.send`
- `quotes.update`

### Prospection

- `prospects.assign`
- `prospects.convert`
- `prospects.create`
- `prospects.delete`
- `prospects.export`
- `prospects.import`
- `prospects.manage_activities`
- `prospects.read`
- `prospects.read_all`
- `prospects.read_own`
- `prospects.update`

### Rapports commerciaux

- `reports.read_sales`

## CRM

### Dashboards associes

- `/dashboard/crm` - Dashboard CRM

### Campagnes email

- `emails.manage_templates`
- `emails.read`
- `emails.send`
- `emails.send_bulk`

### Clients

- `customers.create`
- `customers.delete`
- `customers.export`
- `customers.import`
- `customers.manage_addresses`
- `customers.manage_contacts`
- `customers.manage_documents`
- `customers.read`
- `customers.read_all`
- `customers.read_assigned`
- `customers.read_financial`
- `customers.update`

### Contacts

- `contacts.create`
- `contacts.delete`
- `contacts.read`
- `contacts.update`

### Contrats

- `contracts.approve`
- `contracts.create`
- `contracts.delete`
- `contracts.export`
- `contracts.read`
- `contracts.read_all`
- `contracts.renew`
- `contracts.sign`
- `contracts.terminate`
- `contracts.update`

### Documents

- `documents.delete`
- `documents.download`
- `documents.manage_versions`
- `documents.read`
- `documents.read_all`
- `documents.read_own`
- `documents.share`
- `documents.update`
- `documents.upload`

### Interactions

- `interactions.create`
- `interactions.delete`
- `interactions.read`
- `interactions.read_all`
- `interactions.read_own`
- `interactions.update`

### Opportunites

- `opportunities.assign`
- `opportunities.change_stage`
- `opportunities.create`
- `opportunities.delete`
- `opportunities.export`
- `opportunities.read`
- `opportunities.read_all`
- `opportunities.read_own`
- `opportunities.update`

## Facturation

### Dashboards associes

- `/dashboard/facturation` - Dashboard facturation

### Factures

- `invoices.cancel`
- `invoices.create`
- `invoices.credit_note`
- `invoices.delete`
- `invoices.export`
- `invoices.print`
- `invoices.read`
- `invoices.read_all`
- `invoices.read_own`
- `invoices.send`
- `invoices.update`
- `invoices.validate`

### Paiements

- `payments.create`
- `payments.delete`
- `payments.export`
- `payments.read`
- `payments.read_all`
- `payments.refund`
- `payments.update`
- `payments.validate`

## Comptabilite

### Dashboards associes

- `/dashboard/comptabilite/comptes` - Comptes
- `/dashboard/comptabilite/rapports` - Rapports comptables

### Depenses

- `expenses.approve`
- `expenses.create`
- `expenses.delete`
- `expenses.read`
- `expenses.read_all`
- `expenses.read_own`
- `expenses.reimburse`
- `expenses.reject`
- `expenses.update`

### Rapports financiers

- `reports.read_financial`

## Services Techniques

### Dashboards associes

- `/dashboard/technical` - Dashboard technique
- `/dashboard/technical/analytics` - Analytics technique

### Analyses techniques

- `reports.read_technical`

### Interventions

- `interventions.assign_material`
- `interventions.assign_technician`
- `interventions.complete`
- `interventions.create`
- `interventions.create_report`
- `interventions.delete`
- `interventions.read`
- `interventions.read_all`
- `interventions.read_assigned`
- `interventions.update`

### Materiel

- `materiel.assign`
- `materiel.create`
- `materiel.delete`
- `materiel.maintenance`
- `materiel.read`
- `materiel.track_stock`
- `materiel.update`

### Missions

- `missions.assign`
- `missions.change_status`
- `missions.complete`
- `missions.create`
- `missions.delete`
- `missions.read`
- `missions.read_all`
- `missions.read_assigned`
- `missions.update`

### Rapports techniques

- `rapports_techniques.create`
- `rapports_techniques.delete`
- `rapports_techniques.export`
- `rapports_techniques.read`
- `rapports_techniques.read_all`
- `rapports_techniques.read_own`
- `rapports_techniques.update`
- `rapports_techniques.validate`

### Specialites

- `specialites.create`
- `specialites.delete`
- `specialites.read`
- `specialites.update`

### Techniciens

- `techniciens.create`
- `techniciens.delete`
- `techniciens.manage_specialties`
- `techniciens.read`
- `techniciens.read_performance`
- `techniciens.update`

## Gestion de Projets

### Dashboards associes

- `/dashboard/projets` - Dashboard projets

### Projets

- `projects.archive`
- `projects.change_status`
- `projects.create`
- `projects.delete`
- `projects.manage_budget`
- `projects.manage_team`
- `projects.read`
- `projects.read_all`
- `projects.read_assigned`
- `projects.update`

### Rapports

- `reports.read_operations`

### Taches

- `tasks.assign`
- `tasks.change_status`
- `tasks.comment`
- `tasks.create`
- `tasks.delete`
- `tasks.read`
- `tasks.read_all`
- `tasks.read_assigned`
- `tasks.update`

### Temps & presence

- `attendance.create`
- `attendance.delete`
- `attendance.export`
- `attendance.read`
- `attendance.read_all`
- `attendance.read_own`
- `attendance.read_team`
- `attendance.update`
- `attendance.validate`

## Achats & Logistique

### Dashboards associes

- `/dashboard/achats` - Dashboard achats

### Commandes d'achat

- `purchase_orders.approve`
- `purchase_orders.cancel`
- `purchase_orders.create`
- `purchase_orders.delete`
- `purchase_orders.read`
- `purchase_orders.receive`
- `purchase_orders.send`
- `purchase_orders.update`

### Fournisseurs

- `suppliers.create`
- `suppliers.delete`
- `suppliers.evaluate`
- `suppliers.export`
- `suppliers.read`
- `suppliers.update`

### Produits

- `products.create`
- `products.delete`
- `products.export`
- `products.import`
- `products.manage_categories`
- `products.manage_pricing`
- `products.read`
- `products.update`

### Stocks

- `inventory.adjust`
- `inventory.count`
- `inventory.create`
- `inventory.delete`
- `inventory.export`
- `inventory.read`
- `inventory.read_all`
- `inventory.read_warehouse`
- `inventory.transfer`
- `inventory.update`

## Ressources Humaines

### Dashboards associes

- `/dashboard/rh` - Dashboard RH

### Avances & prets

- `loans.approve`
- `loans.create`
- `loans.delete`
- `loans.manage_repayment`
- `loans.read`
- `loans.read_all`
- `loans.read_own`
- `loans.reject`
- `loans.update`

### Conges

- `leaves.approve`
- `leaves.cancel`
- `leaves.create`
- `leaves.delete`
- `leaves.export`
- `leaves.read`
- `leaves.read_all`
- `leaves.read_own`
- `leaves.read_team`
- `leaves.reject`
- `leaves.update`

### Contrats employe

- `employee_contracts.create`
- `employee_contracts.delete`
- `employee_contracts.read`
- `employee_contracts.read_all`
- `employee_contracts.read_own`
- `employee_contracts.renew`
- `employee_contracts.sign`
- `employee_contracts.terminate`
- `employee_contracts.update`

### Employes

- `employees.create`
- `employees.delete`
- `employees.export`
- `employees.manage_documents`
- `employees.read`
- `employees.read_all`
- `employees.read_own`
- `employees.read_sensitive`
- `employees.read_team`
- `employees.update`
- `employees.update_own`

### Evaluations

- `evaluations.create`
- `evaluations.delete`
- `evaluations.read`
- `evaluations.read_all`
- `evaluations.read_own`
- `evaluations.read_team`
- `evaluations.update`
- `evaluations.validate`

### Paie

- `payroll.create`
- `payroll.delete`
- `payroll.export`
- `payroll.process`
- `payroll.read`
- `payroll.read_all`
- `payroll.read_own`
- `payroll.update`
- `payroll.validate`

### Rapports RH

- `reports.read_hr`

## Communication

### Dashboards associes

- `/dashboard/messages` - Dashboard communication

### Messagerie

- `messages.broadcast`
- `messages.delete`
- `messages.read`
- `messages.send`

### Notifications

- `notifications.create`
- `notifications.delete`
- `notifications.manage_settings`
- `notifications.read`
- `notifications.read_own`
- `notifications.send`
- `notifications.send_bulk`

## Administration

### Dashboards associes

- `/dashboard/admin/users` - Utilisateurs
- `/dashboard/admin/permissions` - Permissions

### Integrations

- `integrations.create`
- `integrations.delete`
- `integrations.read`
- `integrations.test`
- `integrations.update`

### Logs

- `logs.delete`
- `logs.export`
- `logs.read`
- `logs.read_application`
- `logs.read_database`
- `logs.read_error`

### Permissions

- `permissions.create`
- `permissions.delete`
- `permissions.read`
- `permissions.update`

### Roles

- `roles.create`
- `roles.delete`
- `roles.manage_permissions`
- `roles.read`
- `roles.update`

### Sauvegardes

- `backups.create`
- `backups.delete`
- `backups.download`
- `backups.read`
- `backups.restore`

### Services

- `services.assign_manager`
- `services.create`
- `services.delete`
- `services.manage_hierarchy`
- `services.read`
- `services.read_all`
- `services.read_own`
- `services.update`

### Utilisateurs

- `users.activate`
- `users.create`
- `users.delete`
- `users.export`
- `users.impersonate`
- `users.manage_permissions`
- `users.manage_roles`
- `users.read`
- `users.read_all`
- `users.read_own`
- `users.reset_password`
- `users.update`
- `users.update_own`

## Autres permissions

### stock movements

- `stock_movements.create`
- `stock_movements.delete`
- `stock_movements.read`
- `stock_movements.update`
- `stock_movements.validate`

### system settings

- `system_settings.read`
- `system_settings.update`
- `system_settings.update_email`
- `system_settings.update_general`
- `system_settings.update_integrations`
- `system_settings.update_security`

### warehouses

- `warehouses.create`
- `warehouses.delete`
- `warehouses.read`
- `warehouses.update`

