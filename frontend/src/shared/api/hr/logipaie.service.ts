import { apiClient } from '../shared/client';

const list = async (path: string, params?: Record<string, any>) => {
  const response = await apiClient.get(`/api/logipaie/${path}`, { params });
  return response.data;
};

export const logipaieService = {
  getConfigurations: (params?: Record<string, any>) => list('configurations', params),
  getHistoriquesEmploye: (params?: Record<string, any>) => list('historiques-employe', params),
  getVariablesMensuelles: (params?: Record<string, any>) => list('variables-mensuelles', params),
  getCumulsAnnuels: (params?: Record<string, any>) => list('cumuls-annuels', params),
  getAbsences: (params?: Record<string, any>) => list('absences', params),
  getGratifications: (params?: Record<string, any>) => list('gratifications', params),
  getIndemnitesRupture: (params?: Record<string, any>) => list('indemnites-rupture', params),
  getDeclarationsCnps: (params?: Record<string, any>) => list('declarations-cnps', params),
  getDeclarationsFiscales: (params?: Record<string, any>) => list('declarations-fiscales', params),
  getDisas: (params?: Record<string, any>) => list('disas', params),
  getDascs: (params?: Record<string, any>) => list('dascs', params),
  getEtat301: (params?: Record<string, any>) => list('etat-301', params),
  getEcrituresComptables: (params?: Record<string, any>) => list('ecritures-comptables', params),
  getProvisionsRetraite: (params?: Record<string, any>) => list('provisions-retraite', params),
  getProvisionsConges: (params?: Record<string, any>) => list('provisions-conges', params),
  getLivresPaieMensuels: (params?: Record<string, any>) => list('livres-paie-mensuels', params),
  getLivresPaieAnnuels: (params?: Record<string, any>) => list('livres-paie-annuels', params),
  getOrdresBancaires: (params?: Record<string, any>) => list('ordres-bancaires', params),
  getDetailsVirement: (params?: Record<string, any>) => list('details-virement', params),
  getStatistiquesRh: (params?: Record<string, any>) => list('statistiques-rh', params),
  getRupturesContrat: (params?: Record<string, any>) => list('ruptures-contrat', params),
  getCertificatsTravail: (params?: Record<string, any>) => list('certificats-travail', params),
};
