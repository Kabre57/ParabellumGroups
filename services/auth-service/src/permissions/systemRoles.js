const systemRoles = [
  {
    name: 'Administrateur',
    code: 'ADMIN',
    description: 'Acces complet au systeme',
  },
  {
    name: 'Direction Generale',
    code: 'GENERAL_DIRECTOR',
    description: 'Validation et supervision generale',
  },
  {
    name: 'Responsable de service',
    code: 'SERVICE_MANAGER',
    description: 'Gestion des membres et accès de son service',
  },
  {
    name: 'Gerant',
    code: 'GERANT',
    description: 'Supervision des dashboards et validation des achats',
  },
  {
    name: 'Employe',
    code: 'EMPLOYEE',
    description: 'Utilisateur standard',
  },
  {
    name: 'Membre de service',
    code: 'SERVICE_MEMBER',
    description: 'Accès de base pour un membre créé et géré par son responsable de service',
  },
  {
    name: 'Comptable',
    code: 'ACCOUNTANT',
    description: 'Suivi comptable, bons de caisse et decaissements',
  },
  {
    name: 'Service Achat',
    code: 'PURCHASING_MANAGER',
    description: 'Preparation des demandes, consultation fournisseurs, commandes et receptions',
  },
  {
    name: 'Commercial',
    code: 'COMMERCIAL',
    description: 'Prospection, pipeline, devis clients et suivi commercial',
  },
];

module.exports = { systemRoles };
