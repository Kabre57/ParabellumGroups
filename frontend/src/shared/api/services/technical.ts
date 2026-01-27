import { apiClient } from '../client';
import { ApiResponse, PaginatedResponse, SearchParams } from '../types';

// ===== INTERFACES =====

export interface Specialite {
  id: string;
  nom: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Technicien {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  specialiteId: string;
  specialite?: Specialite;
  status: 'AVAILABLE' | 'BUSY' | 'ON_LEAVE' | 'INACTIVE';
  matricule: string;
  dateEmbauche: string;
  tauxHoraire?: number;
  competences?: string[];
  certifications?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Mission {
  id: string;
  numeroMission: string;
  titre: string;
  description?: string;
  clientNom: string;
  clientContact?: string;
  adresse: string;
  dateDebut: string;
  dateFin?: string;
  status: 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
  priorite: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE';
  budgetEstime?: number;
  coutReel?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  techniciens?: MissionTechnicien[];
  interventions?: Intervention[];
}

export interface MissionTechnicien {
  id: string;
  missionId: string;
  technicienId: string;
  technicien?: Technicien;
  role?: string;
  dateAssignation: string;
}

export interface Intervention {
  id: string;
  missionId: string;
  mission?: Mission;
  titre: string;
  description?: string;
  dateDebut: string;
  dateFin?: string;
  dureeEstimee?: number;
  dureeReelle?: number;
  status: 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
  resultats?: string;
  observations?: string;
  createdAt?: string;
  updatedAt?: string;
  techniciens?: InterventionTechnicien[];
  materielUtilise?: SortieMateriel[];
  rapports?: Rapport[];
}

export interface InterventionTechnicien {
  id: string;
  interventionId: string;
  technicienId: string;
  technicien?: Technicien;
  dateAssignation: string;
}

export interface Materiel {
  id: string;
  reference: string;
  nom: string;
  description?: string;
  categorie: string;
  quantiteStock: number;
  seuilAlerte: number;
  seuilRupture: number;
  prixUnitaire?: number;
  fournisseur?: string;
  emplacementStock?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SortieMateriel {
  id: string;
  materielId: string;
  materiel?: Materiel;
  interventionId: string;
  technicienId: string;
  technicien?: Technicien;
  quantite: number;
  dateSortie: string;
  dateRetour?: string;
  etatRetour?: string;
  notes?: string;
}

export interface Rapport {
  id: string;
  interventionId: string;
  intervention?: Intervention;
  redacteurId: string;
  redacteur?: Technicien;
  titre: string;
  contenu: string;
  conclusions?: string;
  recommandations?: string;
  status: 'BROUILLON' | 'EN_REVISION' | 'VALIDE' | 'ARCHIVE';
  dateCreation: string;
  dateModification?: string;
  dateValidation?: string;
}

// ===== TECHNICAL SERVICE =====

class TechnicalService {
private basePath = '/technical';

  // Helper pour extraire les données de la réponse
private extractData<T>(response: any): T {
  console.log('API Response URL:', response.config?.url);
  console.log('API Response Data:', response.data);
  return response.data?.data !== undefined ? response.data.data : response.data;
}

  // === SPECIALITES ===
  async getSpecialites(): Promise<Specialite[]> {
    const response = await apiClient.get(`${this.basePath}/specialites`);
    return this.extractData(response);
  }

  async getSpecialite(id: string): Promise<Specialite> {
    const response = await apiClient.get(`${this.basePath}/specialites/${id}`);
    return this.extractData(response);
  }

  async createSpecialite(data: Partial<Specialite>): Promise<Specialite> {
    const response = await apiClient.post(`${this.basePath}/specialites`, data);
    return this.extractData(response);
  }

  async updateSpecialite(id: string, data: Partial<Specialite>): Promise<Specialite> {
    const response = await apiClient.put(`${this.basePath}/specialites/${id}`, data);
    return this.extractData(response);
  }

  async deleteSpecialite(id: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/specialites/${id}`);
  }

  // === TECHNICIENS ===
  async getTechniciens(params?: SearchParams): Promise<Technicien[]> {
    const response = await apiClient.get(`${this.basePath}/techniciens`, { params });
    return this.extractData(response);
  }

  async getTechnicien(id: string): Promise<Technicien> {
    const response = await apiClient.get(`${this.basePath}/techniciens/${id}`);
    return this.extractData(response);
  }

  async getAvailableTechniciens(params?: SearchParams): Promise<Technicien[]> {
    const response = await apiClient.get(`${this.basePath}/techniciens/available`, { params });
    return this.extractData(response);
  }

  async getTechnicienStats(id: string): Promise<any> {
    const response = await apiClient.get(`${this.basePath}/techniciens/${id}/stats`);
    return this.extractData(response);
  }

  async createTechnicien(data: Partial<Technicien>): Promise<Technicien> {
    const response = await apiClient.post(`${this.basePath}/techniciens`, data);
    return this.extractData(response);
  }

  async updateTechnicien(id: string, data: Partial<Technicien>): Promise<Technicien> {
    const response = await apiClient.put(`${this.basePath}/techniciens/${id}`, data);
    return this.extractData(response);
  }

  async updateTechnicienStatus(id: string, status: string): Promise<Technicien> {
    const response = await apiClient.patch(`${this.basePath}/techniciens/${id}/status`, { status });
    return this.extractData(response);
  }

  async deleteTechnicien(id: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/techniciens/${id}`);
  }

  // === MISSIONS ===
  async getMissions(params?: SearchParams): Promise<Mission[]> {
    const response = await apiClient.get(`${this.basePath}/missions`, { params });
    return this.extractData(response);
  }

  async getMission(id: string): Promise<Mission> {
    const response = await apiClient.get(`${this.basePath}/missions/${id}`);
    return this.extractData(response);
  }

  async getMissionsStats(): Promise<any> {
    const response = await apiClient.get(`${this.basePath}/missions/stats`);
    return this.extractData(response);
  }

  async createMission(data: Partial<Mission>): Promise<Mission> {
    const response = await apiClient.post(`${this.basePath}/missions`, data);
    return this.extractData(response);
  }

  async updateMission(id: string, data: Partial<Mission>): Promise<Mission> {
    const response = await apiClient.put(`${this.basePath}/missions/${id}`, data);
    return this.extractData(response);
  }

  async updateMissionStatus(id: string, status: string): Promise<Mission> {
    const response = await apiClient.patch(`${this.basePath}/missions/${id}/status`, { status });
    return this.extractData(response);
  }

  async assignTechnicienToMission(missionId: string, technicienId: string, role?: string): Promise<MissionTechnicien> {
    const response = await apiClient.post(`${this.basePath}/missions/${missionId}/techniciens`, {
      technicienId,
      role
    });
    return this.extractData(response);
  }

  async deleteMission(id: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/missions/${id}`);
  }

  // === INTERVENTIONS ===
  async getInterventions(params?: SearchParams): Promise<Intervention[]> {
    const response = await apiClient.get(`${this.basePath}/interventions`, { params });
    return this.extractData(response);
  }

  async getIntervention(id: string): Promise<Intervention> {
    const response = await apiClient.get(`${this.basePath}/interventions/${id}`);
    return this.extractData(response);
  }

  async createIntervention(data: Partial<Intervention>): Promise<Intervention> {
    const response = await apiClient.post(`${this.basePath}/interventions`, data);
    return this.extractData(response);
  }

  async updateIntervention(id: string, data: Partial<Intervention>): Promise<Intervention> {
    const response = await apiClient.put(`${this.basePath}/interventions/${id}`, data);
    return this.extractData(response);
  }

  async completeIntervention(id: string, data: { resultats?: string; observations?: string; dureeReelle?: number }): Promise<Intervention> {
    const response = await apiClient.patch(`${this.basePath}/interventions/${id}/complete`, data);
    return this.extractData(response);
  }

  async deleteIntervention(id: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/interventions/${id}`);
  }

  // === MATERIEL ===
  async getMateriel(params?: SearchParams): Promise<Materiel[]> {
    const response = await apiClient.get(`${this.basePath}/materiel`, { params });
    return this.extractData(response);
  }

  async getMaterielById(id: string): Promise<Materiel> {
    const response = await apiClient.get(`${this.basePath}/materiel/${id}`);
    return this.extractData(response);
  }

  async getMaterielAlertes(): Promise<Materiel[]> {
    const response = await apiClient.get(`${this.basePath}/materiel/alertes`);
    return this.extractData(response);
  }

  async getSortiesEnCours(): Promise<SortieMateriel[]> {
    const response = await apiClient.get(`${this.basePath}/materiel/sorties-en-cours`);
    return this.extractData(response);
  }

  async createMateriel(data: Partial<Materiel>): Promise<Materiel> {
    const response = await apiClient.post(`${this.basePath}/materiel`, data);
    return this.extractData(response);
  }

  async updateMateriel(id: string, data: Partial<Materiel>): Promise<Materiel> {
    const response = await apiClient.put(`${this.basePath}/materiel/${id}`, data);
    return this.extractData(response);
  }

  async deleteMateriel(id: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/materiel/${id}`);
  }

  // === RAPPORTS ===
  async getRapports(params?: SearchParams): Promise<Rapport[]> {
    const response = await apiClient.get(`${this.basePath}/rapports`, { params });
    return this.extractData(response);
  }

  async getRapport(id: string): Promise<Rapport> {
    const response = await apiClient.get(`${this.basePath}/rapports/${id}`);
    return this.extractData(response);
  }

  async createRapport(data: Partial<Rapport>): Promise<Rapport> {
    const response = await apiClient.post(`${this.basePath}/rapports`, data);
    return this.extractData(response);
  }

  async updateRapport(id: string, data: Partial<Rapport>): Promise<Rapport> {
    const response = await apiClient.put(`${this.basePath}/rapports/${id}`, data);
    return this.extractData(response);
  }

  async validateRapport(id: string): Promise<Rapport> {
    const response = await apiClient.patch(`${this.basePath}/rapports/${id}/validate`);
    return this.extractData(response);
  }

  async deleteRapport(id: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/rapports/${id}`);
  }
}

export const technicalService = new TechnicalService();
