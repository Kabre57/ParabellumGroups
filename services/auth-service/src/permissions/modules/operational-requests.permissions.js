const groups = {
  operational_requests: {
    label: 'Demandes opérationnelles',
    permissions: [
      { name: 'operational_requests.create', description: 'Créer une demande opérationnelle' },
      { name: 'operational_requests.read_own', description: 'Consulter ses demandes opérationnelles' },
      { name: 'operational_requests.read_all', description: 'Consulter les demandes de son périmètre' },
      { name: 'operational_requests.update', description: 'Modifier un brouillon ou une demande à compléter' },
      { name: 'operational_requests.submit', description: 'Soumettre une demande opérationnelle' },
      { name: 'operational_requests.approve', description: 'Approuver une demande opérationnelle' },
      { name: 'operational_requests.reject', description: 'Rejeter une demande opérationnelle' },
      { name: 'operational_requests.return', description: 'Retourner une demande pour complément' },
      { name: 'operational_requests.finance', description: 'Traiter les demandes approuvées et lier un bon de caisse' },
      { name: 'operational_requests.manage_attachments', description: 'Ajouter des justificatifs aux demandes opérationnelles' },
    ],
  },
};

module.exports = {
  key: 'operational_requests',
  label: 'Demandes opérationnelles',
  menuLabel: 'Demandes opérationnelles',
  version: '1.0.0',
  order: 90,
  description: 'Demandes d’avance, décisions de la Direction générale et suivi financier.',
  groups,
};
