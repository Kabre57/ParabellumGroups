# Sidebar Permissions Audit

Date: 2026-03-09

## Goal

Align the frontend sidebar with the real auth permission catalog and document the expected visible menus by role/profile.

## Audit Result

### Valid sidebar permissions confirmed against auth catalog

- `quotes.read`
- `employees.read`
- `reports.read_financial`
- `projects.read`
- `interventions.read`
- `messages.read`
- `invoices.read`
- `customers.read`
- `contracts.read`
- `leaves.read`
- `loans.read`
- `inventory.read`
- `inventory.count`
- `specialites.read`
- `techniciens.read`
- `products.read`
- `suppliers.read`

### Incoherent sidebar permissions found and corrected

- `purchases.read` -> `purchase_orders.read`
- `purchases.create` -> `purchase_orders.create`
- `salaries.read` -> `payroll.read`
- `performance.read` -> `evaluations.read`
- `marketing.read` -> `emails.read`
- `calendar.read` -> `projects.read`
- `time-entries.read` -> `attendance.read`
- `projects.read` on `/dashboard/projets/taches` -> `tasks.read`

### Deliberate frontend-only sentinel

- `admin`
  - This is not an auth catalog permission.
  - It is a frontend sentinel used to expose admin-only navigation to admin users.

## Permission Rules Locked In Frontend

The shared permission matcher now treats these as equivalent when appropriate:

- `.read` <-> `.view`
- `.read` <-> `.read_all`
- `.read` <-> `.read_assigned`
- `.read` <-> `.read_own`
- `.read` <-> `.read_team`

This prevents the sidebar from hiding a section when a user has only a scoped read permission.

## Role To Visible Menus

Important: the current runtime does not rely only on base role permissions. User-specific overrides are already used in production data. Because of that, the matrix below is split into:

- admin behavior rule
- employee baseline
- employee examples with overrides

### ADMIN

Rule:

- sees all professional categories
- sees all admin navigation

Visible categories:

- Tableau de Bord
- Commercial
- CRM
- Facturation
- Services Techniques
- Gestion de Projets
- Achats & Logistique
- Ressources Humaines
- Communication
- Administration

### EMPLOYEE baseline

Base effective permission observed:

- `dashboard.view`

Visible menus:

- Tableau de Bord
  - Tableau de bord

### EMPLOYEE with analytics + interventions overrides

Observed effective permissions on `user@parabellum.com`:

- `dashboard.view`
- `reports.read`
- `reports.read_financial`
- `reports.read_hr`
- `reports.read_operations`
- `reports.read_sales`
- `reports.read_technical`
- `reports.create_report`
- `reports.export`
- `reports.schedule`
- `interventions.read`
- `interventions.read_all`

Visible menus:

- Tableau de Bord
  - Tableau de bord
  - Analytics
- Services Techniques
  - Planning Interventions

### EMPLOYEE with minimal own-scope overrides

Observed effective permissions on `test-1772729772715@example.com`:

- `dashboard.view`
- `users.read_own`
- `services.read_own`

Visible menus:

- Tableau de Bord
  - Tableau de bord

No additional sidebar section is expected, because no current sidebar item is tied to `users.read*` or `services.read*`.

## Operational Rule

A user should never be sent to `/access-denied` during normal navigation.

Expected behavior:

- unauthorized items are hidden from the sidebar
- manual access to a forbidden route redirects to the first authorized route
- admin users bypass sidebar permission filtering

## Audit Command

Run:

```bash
node scripts/audit-sidebar-permissions.js
```

This command fails if a sidebar permission is not found in the auth permission seed, except for the reserved `admin` sentinel.
