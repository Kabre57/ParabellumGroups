const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Script d'initialisation des permissions granulaires
 * 21 catégories avec permissions CRUD + spécifiques
 */

const permissionCategories = {
  dashboard: {
    label: 'Tableau de Bord',
    permissions: [
      { name: 'dashboard.read', description: 'Accéder au tableau de bord' },
      { name: 'dashboard.analytics', description: 'Voir les statistiques' },
      { name: 'dashboard.reports', description: 'Générer des rapports' }
    ]
  },
  users: {
    label: 'Utilisateurs',
    permissions: [
      { name: 'users.create', description: 'Créer des utilisateurs' },
      { name: 'users.read', description: 'Consulter les utilisateurs' },
      { name: 'users.update', description: 'Modifier les utilisateurs' },
      { name: 'users.delete', description: 'Supprimer des utilisateurs' },
      { name: 'users.manage_permissions', description: 'Gérer les permissions' },
      { name: 'users.reset_password', description: 'Réinitialiser les mots de passe' },
      { name: 'users.manage_roles', description: 'Gérer les rôles' }
    ]
  },
  prospects: {
    label: 'Prospection Commerciale',
    permissions: [
      { name: 'prospects.create', description: 'Créer des prospects' },
      { name: 'prospects.read', description: 'Consulter les prospects' },
      { name: 'prospects.update', description: 'Modifier les prospects' },
      { name: 'prospects.delete', description: 'Supprimer des prospects' },
      { name: 'prospects.assign', description: 'Assigner des prospects' },
      { name: 'prospects.activities', description: 'Gérer les activités de prospection' },
      { name: 'prospects.convert', description: 'Convertir en client' }
    ]
  },
  customers: {
    label: 'Clients',
    permissions: [
      { name: 'customers.create', description: 'Créer des clients' },
      { name: 'customers.read', description: 'Consulter les clients' },
      { name: 'customers.update', description: 'Modifier les clients' },
      { name: 'customers.delete', description: 'Supprimer des clients' },
      { name: 'customers.manage', description: 'Gestion complète clients' }
    ]
  },
  quotes: {
    label: 'Devis',
    permissions: [
      { name: 'quotes.create', description: 'Créer des devis' },
      { name: 'quotes.read', description: 'Consulter les devis' },
      { name: 'quotes.update', description: 'Modifier les devis' },
      { name: 'quotes.delete', description: 'Supprimer des devis' },
      { name: 'quotes.approve', description: 'Approuver des devis' },
      { name: 'quotes.send', description: 'Envoyer des devis' }
    ]
  },
  invoices: {
    label: 'Facturation',
    permissions: [
      { name: 'invoices.create', description: 'Créer des factures' },
      { name: 'invoices.read', description: 'Consulter les factures' },
      { name: 'invoices.update', description: 'Modifier les factures' },
      { name: 'invoices.delete', description: 'Supprimer des factures' },
      { name: 'invoices.send', description: 'Envoyer des factures' },
      { name: 'invoices.validate', description: 'Valider des factures' }
    ]
  },
  payments: {
    label: 'Paiements',
    permissions: [
      { name: 'payments.create', description: 'Créer des paiements' },
      { name: 'payments.read', description: 'Consulter les paiements' },
      { name: 'payments.update', description: 'Modifier les paiements' },
      { name: 'payments.delete', description: 'Supprimer des paiements' },
      { name: 'payments.validate', description: 'Valider des paiements' }
    ]
  },
  products: {
    label: 'Produits & Services',
    permissions: [
      { name: 'products.create', description: 'Créer des produits' },
      { name: 'products.read', description: 'Consulter les produits' },
      { name: 'products.update', description: 'Modifier les produits' },
      { name: 'products.delete', description: 'Supprimer des produits' }
    ]
  },
  expenses: {
    label: 'Dépenses',
    permissions: [
      { name: 'expenses.create', description: 'Créer des dépenses' },
      { name: 'expenses.read', description: 'Consulter les dépenses' },
      { name: 'expenses.update', description: 'Modifier les dépenses' },
      { name: 'expenses.delete', description: 'Supprimer des dépenses' },
      { name: 'expenses.approve', description: 'Approuver des dépenses' }
    ]
  },
  reports: {
    label: 'Rapports & Analyses',
    permissions: [
      { name: 'reports.financial', description: 'Rapports financiers' },
      { name: 'reports.sales', description: 'Rapports commerciaux' },
      { name: 'reports.hr', description: 'Rapports RH' },
      { name: 'reports.operations', description: 'Rapports opérationnels' }
    ]
  },
  employees: {
    label: 'Employés',
    permissions: [
      { name: 'employees.create', description: 'Créer des employés' },
      { name: 'employees.read', description: 'Consulter les employés' },
      { name: 'employees.update', description: 'Modifier les employés' },
      { name: 'employees.delete', description: 'Supprimer des employés' }
    ]
  },
  salaries: {
    label: 'Salaires & Paie',
    permissions: [
      { name: 'salaries.create', description: 'Créer des fiches de paie' },
      { name: 'salaries.read', description: 'Consulter les salaires' },
      { name: 'salaries.update', description: 'Modifier les salaires' },
      { name: 'salaries.delete', description: 'Supprimer des salaires' },
      { name: 'salaries.validate', description: 'Valider les paies' }
    ]
  },
  contracts: {
    label: 'Contrats',
    permissions: [
      { name: 'contracts.create', description: 'Créer des contrats' },
      { name: 'contracts.read', description: 'Consulter les contrats' },
      { name: 'contracts.update', description: 'Modifier les contrats' },
      { name: 'contracts.delete', description: 'Supprimer des contrats' }
    ]
  },
  leaves: {
    label: 'Congés',
    permissions: [
      { name: 'leaves.create', description: 'Créer des demandes de congés' },
      { name: 'leaves.read', description: 'Consulter les congés' },
      { name: 'leaves.update', description: 'Modifier les congés' },
      { name: 'leaves.delete', description: 'Supprimer des congés' },
      { name: 'leaves.approve', description: 'Approuver les congés' }
    ]
  },
  loans: {
    label: 'Prêts & Avances',
    permissions: [
      { name: 'loans.create', description: 'Créer des prêts' },
      { name: 'loans.read', description: 'Consulter les prêts' },
      { name: 'loans.update', description: 'Modifier les prêts' },
      { name: 'loans.delete', description: 'Supprimer des prêts' },
      { name: 'loans.approve', description: 'Approuver les prêts' }
    ]
  },
  specialites: {
    label: 'Spécialités Techniques',
    permissions: [
      { name: 'specialites.create', description: 'Créer des spécialités' },
      { name: 'specialites.read', description: 'Consulter les spécialités' },
      { name: 'specialites.update', description: 'Modifier les spécialités' },
      { name: 'specialites.delete', description: 'Supprimer des spécialités' }
    ]
  },
  techniciens: {
    label: 'Techniciens',
    permissions: [
      { name: 'techniciens.create', description: 'Créer des techniciens' },
      { name: 'techniciens.read', description: 'Consulter les techniciens' },
      { name: 'techniciens.update', description: 'Modifier les techniciens' },
      { name: 'techniciens.delete', description: 'Supprimer des techniciens' }
    ]
  },
  missions: {
    label: 'Missions Techniques',
    permissions: [
      { name: 'missions.create', description: 'Créer des missions' },
      { name: 'missions.read', description: 'Consulter les missions' },
      { name: 'missions.update', description: 'Modifier les missions' },
      { name: 'missions.delete', description: 'Supprimer des missions' },
      { name: 'missions.assign', description: 'Assigner des missions' }
    ]
  },
  interventions: {
    label: 'Interventions',
    permissions: [
      { name: 'interventions.create', description: 'Créer des interventions' },
      { name: 'interventions.read', description: 'Consulter les interventions' },
      { name: 'interventions.update', description: 'Modifier les interventions' },
      { name: 'interventions.delete', description: 'Supprimer des interventions' },
      { name: 'interventions.complete', description: 'Compléter des interventions' }
    ]
  },
  projects: {
    label: 'Projets',
    permissions: [
      { name: 'projects.create', description: 'Créer des projets' },
      { name: 'projects.read', description: 'Consulter les projets' },
      { name: 'projects.update', description: 'Modifier les projets' },
      { name: 'projects.delete', description: 'Supprimer des projets' },
      { name: 'projects.manage', description: 'Gestion complète projets' }
    ]
  },
  purchases: {
    label: 'Achats',
    permissions: [
      { name: 'purchases.create', description: 'Créer des commandes d\'achat' },
      { name: 'purchases.read', description: 'Consulter les achats' },
      { name: 'purchases.update', description: 'Modifier les achats' },
      { name: 'purchases.delete', description: 'Supprimer des achats' },
      { name: 'purchases.approve', description: 'Approuver les achats' }
    ]
  },
  AuditLog: {
    label: 'Journal de bord (AuditLog)',
    permissions: [
      { name: 'canViewAuditLogInfo', description: 'Voir les journaux d\'audit de niveau INFO', category: 'AuditLog' },
      { name: 'canViewAuditLogWarning', description: 'Voir les journaux d\'audit de niveau WARNING', category: 'AuditLog' },
      { name: 'canViewAuditLogCritical', description: 'Voir les journaux d\'audit de niveau CRITICAL', category: 'AuditLog' },
      { name: 'canViewAuditLogSecurity', description: 'Voir les journaux d\'audit de niveau SECURITY', category: 'AuditLog' }
    ]
  }
};

async function seedPermissions() {
  console.log('🌱 Début de l\'initialisation des permissions...\n');

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const [categoryKey, categoryData] of Object.entries(permissionCategories)) {
    console.log(`📁 Catégorie: ${categoryData.label}`);

    for (const perm of categoryData.permissions) {
      try {
        // Vérifier si la permission existe déjà
        const existing = await prisma.permission.findUnique({
          where: { name: perm.name }
        });

        if (existing) {
          console.log(`   ⏭️  ${perm.name} (existe déjà)`);
          totalSkipped++;
        } else {
          await prisma.permission.create({
            data: {
              name: perm.name,
              description: perm.description,
              category: categoryKey
            }
          });
          console.log(`   ✅ ${perm.name}`);
          totalCreated++;
        }
      } catch (error) {
        console.error(`   ❌ Erreur pour ${perm.name}:`, error.message);
      }
    }
    console.log('');
  }

  console.log('📊 Résumé:');
  console.log(`   ✅ Permissions créées: ${totalCreated}`);
  console.log(`   ⏭️  Permissions ignorées (existantes): ${totalSkipped}`);
  console.log(`   📝 Total: ${totalCreated + totalSkipped}\n`);

  // Compter le total en base
  const total = await prisma.permission.count();
  console.log(`💾 Total de permissions en base de données: ${total}\n`);
}

async function main() {
  try {
    await seedPermissions();
    console.log('✨ Initialisation terminée avec succès!\n');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
