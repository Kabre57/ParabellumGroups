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
  status: 'AVAILABLE' | 'ON_MISSION' | 'ON_LEAVE' | 'SICK' | 'TRAINING';
  matricule: string;
  dateEmbauche: string;
  tauxHoraire?: number;
  competences?: string[];
  certifications?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  // aliases for UI components
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  statut?: string;
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
  status: 'PLANIFIEE' | 'EN_COURS' | 'SUSPENDUE' | 'TERMINEE' | 'ANNULEE';
  priorite: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE';
  budgetEstime?: number;
  coutReel?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  techniciens?: MissionTechnicien[];
  interventions?: Intervention[];
  // aliases for UI components
  title?: string;
  missionNum?: string;
  clientName?: string;
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
  // aliases for UI components
  scheduledDate?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  missionNum?: string;
  technician?: Technicien;
  priorite?: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE';
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
  // aliases for UI components
  name?: string;
  category?: string;
  quantity?: number;
  availableQuantity?: number;
  unit?: string;
  status?: string;
  statut?: string;
  quantiteDisponible?: number;
  quantiteTotale?: number;
  emplacement?: string;
  enAlerte?: boolean;
  enRupture?: boolean;
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
  intervention?: Intervention | null;
  redacteurId: string;
  redacteur?: Technicien;
  titre: string;
  contenu: string;
  conclusions?: string;
  recommandations?: string;
  status: 'BROUILLON' | 'SOUMIS' | 'VALIDE' | 'REJETE';
  dateCreation: string;
  dateModification?: string;
  dateValidation?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SortirMaterielRequest {
  materielId: string;
  interventionId: string;
  technicienId?: string;
  quantite: number;
  notes?: string;
}

export interface CreateRapportInterventionRequest {
  interventionId: string;
  workDone: string;
  issuesFound?: string;
  recommendations?: string;
  title?: string;
}

export type InterventionDetailed = Intervention;

export interface RapportIntervention extends Rapport {
  workDone?: string;
  issuesFound?: string;
  recommendations?: string;
  photos?: string[];
  createdAt?: string;
  updatedAt?: string;
  intervention?: (Intervention & {
    mission?: Mission;
    missionNum?: string;
    technician?: Technicien;
  }) | null;
}

export interface RapportPrintData {
  id: string;
  titre: string;
  contenu: string;
  conclusions?: string;
  recommandations?: string;
  status: string;
  dateCreation: string;
  redacteur?: {
    id: string;
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    matricule?: string;
    competences?: string[];
    specialite?: {
      nom: string;
    };
  };
  intervention?: {
    id: string;
    titre: string;
    description?: string;
    dateDebut: string;
    dateFin?: string;
    mission?: {
      id: string;
      numeroMission: string;
      titre: string;
      clientNom: string;
      clientContact?: string;
      adresse: string;
    };
    materielUtilise?: Array<{
      id: string;
      quantite: number;
      notes?: string;
      materiel?: {
        reference: string;
        nom: string;
      };
    }>;
  };
}

const toNumber = (value: any) => {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatTimeFromDate = (value?: string) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().substring(11, 16);
};

const normalizeTechnicienStatus = (value: any): Technicien['status'] => {
  switch (value) {
    case 'ON_MISSION':
    case 'BUSY':
      return 'ON_MISSION';
    case 'ON_LEAVE':
      return 'ON_LEAVE';
    case 'SICK':
    case 'INACTIVE':
      return 'SICK';
    case 'TRAINING':
      return 'TRAINING';
    case 'AVAILABLE':
    default:
      return 'AVAILABLE';
  }
};

const normalizeInterventionStatus = (value: any): Intervention['status'] => {
  switch (value) {
    case 'SCHEDULED':
      return 'PLANIFIEE';
    case 'IN_PROGRESS':
      return 'EN_COURS';
    case 'COMPLETED':
      return 'TERMINEE';
    case 'CANCELLED':
      return 'ANNULEE';
    case 'PLANIFIEE':
    case 'EN_COURS':
    case 'TERMINEE':
    case 'ANNULEE':
      return value;
    default:
      return 'PLANIFIEE';
  }
};

const normalizeRapportStatus = (value: any): Rapport['status'] => {
  switch (value) {
    case 'SOUMIS':
      return 'SOUMIS';
    case 'VALIDE':
      return 'VALIDE';
    case 'REJETE':
      return 'REJETE';
    case 'EN_REVISION':
      return 'SOUMIS';
    case 'ARCHIVE':
      return 'REJETE';
    case 'BROUILLON':
    default:
      return 'BROUILLON';
  }
};

const mapTechnicien = (technicien: any): Technicien => {
  if (!technicien) {
    return {
      id: '',
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      specialiteId: '',
      status: 'AVAILABLE',
      matricule: '',
      dateEmbauche: '',
    };
  }

  const status = normalizeTechnicienStatus(technicien.status ?? technicien.statut);

  return {
    ...technicien,
    id: technicien.id,
    nom: technicien.nom ?? technicien.lastName ?? '',
    prenom: technicien.prenom ?? technicien.firstName ?? '',
    email: technicien.email ?? '',
    telephone: technicien.telephone ?? technicien.phoneNumber ?? '',
    specialiteId: technicien.specialiteId ?? technicien.specialite_id ?? '',
    specialite: technicien.specialite ?? undefined,
    status,
    matricule: technicien.matricule ?? '',
    dateEmbauche: technicien.dateEmbauche ?? technicien.hireDate ?? '',
    tauxHoraire: technicien.tauxHoraire ?? technicien.hourlyRate,
    competences: technicien.competences ?? undefined,
    certifications: technicien.certifications ?? undefined,
    notes: technicien.notes ?? undefined,
    createdAt: technicien.createdAt ?? undefined,
    updatedAt: technicien.updatedAt ?? undefined,
    firstName: technicien.prenom ?? technicien.firstName,
    lastName: technicien.nom ?? technicien.lastName,
    phoneNumber: technicien.telephone ?? technicien.phoneNumber,
    statut: technicien.statut ?? technicien.status ?? status,
  };
};

const mapMission = (mission: any): Mission => {
  if (!mission) {
    return {
      id: '',
      numeroMission: '',
      titre: '',
      clientNom: '',
      adresse: '',
      dateDebut: '',
      status: 'PLANIFIEE',
      priorite: 'MOYENNE',
    };
  }

  return {
    ...mission,
    id: mission.id,
    numeroMission: mission.numeroMission ?? mission.missionNum ?? '',
    titre: mission.titre ?? mission.title ?? '',
    clientNom: mission.clientNom ?? mission.clientName ?? '',
    adresse: mission.adresse ?? mission.address ?? '',
    dateDebut: mission.dateDebut ?? mission.startDate ?? '',
    dateFin: mission.dateFin ?? mission.endDate ?? undefined,
    status: mission.status ?? 'PLANIFIEE',
    priorite: mission.priorite ?? mission.priority ?? 'MOYENNE',
    title: mission.titre ?? mission.title,
    missionNum: mission.numeroMission ?? mission.missionNum,
    clientName: mission.clientNom ?? mission.clientName,
  };
};

const mapMateriel = (materiel: any): Materiel => {
  const quantiteStock = toNumber(materiel.quantiteStock ?? materiel.quantity ?? materiel.quantiteTotale);
  const seuilAlerte = toNumber(materiel.seuilAlerte);
  const seuilRupture = toNumber(materiel.seuilRupture);
  const enAlerte =
    materiel.enAlerte ?? (Number.isFinite(quantiteStock) && Number.isFinite(seuilAlerte) && quantiteStock <= seuilAlerte);
  const enRupture =
    materiel.enRupture ?? (Number.isFinite(quantiteStock) && Number.isFinite(seuilRupture) && quantiteStock <= seuilRupture);
  const statut = materiel.statut ?? materiel.status ?? (enRupture ? 'HORS_SERVICE' : enAlerte ? 'EN_MAINTENANCE' : 'DISPONIBLE');
  const quantiteDisponible = toNumber(materiel.quantiteDisponible ?? materiel.availableQuantity ?? quantiteStock);

  return {
    ...materiel,
    id: materiel.id,
    reference: materiel.reference ?? '',
    nom: materiel.nom ?? materiel.name ?? '',
    description: materiel.description ?? undefined,
    categorie: materiel.categorie ?? materiel.category ?? '',
    quantiteStock,
    seuilAlerte,
    seuilRupture,
    prixUnitaire: materiel.prixUnitaire ?? materiel.unitPrice ?? undefined,
    fournisseur: materiel.fournisseur ?? undefined,
    emplacementStock: materiel.emplacementStock ?? materiel.emplacement ?? undefined,
    notes: materiel.notes ?? undefined,
    createdAt: materiel.createdAt ?? undefined,
    updatedAt: materiel.updatedAt ?? undefined,
    name: materiel.nom ?? materiel.name,
    category: materiel.categorie ?? materiel.category,
    quantity: quantiteStock,
    availableQuantity: quantiteDisponible,
    unit: materiel.unit ?? 'u',
    status: statut,
    statut,
    quantiteDisponible,
    quantiteTotale: quantiteStock,
    emplacement: materiel.emplacement ?? materiel.emplacementStock ?? undefined,
    enAlerte,
    enRupture,
  };
};

const mapIntervention = (intervention: any): Intervention => {
  const mission = intervention.mission ? mapMission(intervention.mission) : intervention.mission;
  const techniciens = Array.isArray(intervention.techniciens)
    ? intervention.techniciens.map((item: any) => ({
        ...item,
        technicien: item.technicien ? mapTechnicien(item.technicien) : undefined,
      }))
    : undefined;
  const primaryTechnician = techniciens?.[0]?.technicien ?? (intervention.technicien ? mapTechnicien(intervention.technicien) : undefined);
  const dateDebut = intervention.dateDebut ?? intervention.scheduledDate ?? intervention.date ?? undefined;
  const dateFin = intervention.dateFin ?? intervention.endTime ?? undefined;
  const startTime = intervention.startTime ?? formatTimeFromDate(dateDebut);
  const endTime = intervention.endTime ?? formatTimeFromDate(dateFin);
  const status = normalizeInterventionStatus(intervention.status ?? intervention.state);

  return {
    ...intervention,
    id: intervention.id,
    missionId: intervention.missionId ?? intervention.mission_id ?? '',
    mission,
    titre: intervention.titre ?? intervention.title ?? '',
    description: intervention.description ?? undefined,
    dateDebut: dateDebut ?? '',
    dateFin: dateFin ?? undefined,
    dureeEstimee: intervention.dureeEstimee ?? intervention.estimatedDuration ?? undefined,
    dureeReelle: intervention.dureeReelle ?? intervention.actualDuration ?? undefined,
    status,
    resultats: intervention.resultats ?? undefined,
    observations: intervention.observations ?? undefined,
    createdAt: intervention.createdAt ?? undefined,
    updatedAt: intervention.updatedAt ?? undefined,
    techniciens,
    scheduledDate: dateDebut,
    date: dateDebut,
    startTime,
    endTime,
    estimatedDuration: intervention.dureeEstimee ?? intervention.estimatedDuration ?? undefined,
    actualDuration: intervention.dureeReelle ?? intervention.actualDuration ?? undefined,
    missionNum: mission?.numeroMission ?? mission?.missionNum ?? intervention.missionNum ?? undefined,
    technician: primaryTechnician,
    priorite: intervention.priorite ?? intervention.priority ?? undefined,
  };
};

const mapRapport = (rapport: any): RapportIntervention => {
  if (!rapport) {
    return {
      id: '',
      interventionId: '',
      redacteurId: '',
      titre: '',
      contenu: '',
      status: 'BROUILLON',
      dateCreation: '',
    };
  }

  const intervention = rapport.intervention ? mapIntervention(rapport.intervention) : undefined;

  return {
    ...rapport,
    id: rapport.id,
    interventionId: rapport.interventionId ?? '',
    redacteurId: rapport.redacteurId ?? '',
    redacteur: rapport.redacteur ? mapTechnicien(rapport.redacteur) : rapport.redacteur,
    titre: rapport.titre ?? '',
    contenu: rapport.contenu ?? rapport.workDone ?? '',
    conclusions: rapport.conclusions ?? rapport.issuesFound ?? undefined,
    recommandations: rapport.recommandations ?? rapport.recommendations ?? undefined,
    status: normalizeRapportStatus(rapport.status),
    dateCreation: rapport.dateCreation ?? rapport.createdAt ?? '',
    dateModification: rapport.dateModification ?? rapport.updatedAt ?? undefined,
    dateValidation: rapport.dateValidation ?? undefined,
    createdAt: rapport.createdAt ?? rapport.dateCreation ?? undefined,
    updatedAt: rapport.updatedAt ?? rapport.dateModification ?? undefined,
    workDone: rapport.workDone ?? rapport.contenu ?? '',
    issuesFound: rapport.issuesFound ?? rapport.conclusions ?? undefined,
    recommendations: rapport.recommendations ?? rapport.recommandations ?? undefined,
    photos: rapport.photos ?? [],
    intervention: intervention ?? null,
  };
};

// ===== TECHNICAL SERVICE =====

const buildPaginationParams = (params?: SearchParams) => {
  if (!params) return undefined;
  const mapped: Record<string, any> = {};
  if (params.page) mapped.page = params.page;
  if (params.pageSize) mapped.limit = params.pageSize;
  if (params.query) mapped.search = params.query;
  return mapped;
};

const buildMaterielParams = (params?: SearchParams) => {
  const mapped = buildPaginationParams(params) || {};
  if (params?.filters?.categorie) mapped.categorie = params.filters.categorie;
  if (params?.filters?.category) mapped.categorie = params.filters.category;
  return mapped;
};

const buildInterventionParams = (params?: SearchParams) => {
  const mapped = buildPaginationParams(params) || {};
  if (params?.filters?.status) mapped.status = params.filters.status;
  if (params?.filters?.missionId) mapped.missionId = params.filters.missionId;
  if (params?.filters?.technicienId) mapped.technicienId = params.filters.technicienId;
  if (params?.filters?.dateFrom) mapped.dateFrom = params.filters.dateFrom;
  if (params?.filters?.dateTo) mapped.dateTo = params.filters.dateTo;
  return mapped;
};

const buildTechnicienParams = (params?: SearchParams) => {
  const mapped = buildPaginationParams(params) || {};
  if (params?.filters?.status) mapped.status = params.filters.status;
  return mapped;
};

const buildRapportParams = (params?: SearchParams) => {
  const mapped = buildPaginationParams(params) || {};
  if (params?.filters?.status) mapped.status = params.filters.status;
  if (params?.filters?.interventionId) mapped.interventionId = params.filters.interventionId;
  return mapped;
};

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
    const response = await apiClient.get(`${this.basePath}/techniciens`, { params: buildTechnicienParams(params) });
    const data = this.extractData(response);
    return Array.isArray(data) ? data.map(mapTechnicien) : [];
  }

  async getTechnicien(id: string): Promise<Technicien> {
    const response = await apiClient.get(`${this.basePath}/techniciens/${id}`);
    return mapTechnicien(this.extractData(response));
  }

  async getAvailableTechniciens(params?: SearchParams): Promise<Technicien[]> {
    const response = await apiClient.get(`${this.basePath}/techniciens/available`, { params: buildTechnicienParams(params) });
    const data = this.extractData(response);
    return Array.isArray(data) ? data.map(mapTechnicien) : [];
  }

  async getTechnicienStats(id: string): Promise<any> {
    const response = await apiClient.get(`${this.basePath}/techniciens/${id}/stats`);
    return this.extractData(response);
  }

  async createTechnicien(data: Partial<Technicien>): Promise<Technicien> {
    const response = await apiClient.post(`${this.basePath}/techniciens`, data);
    return mapTechnicien(this.extractData(response));
  }

  async updateTechnicien(id: string, data: Partial<Technicien>): Promise<Technicien> {
    const response = await apiClient.put(`${this.basePath}/techniciens/${id}`, data);
    return mapTechnicien(this.extractData(response));
  }

  async updateTechnicienStatus(id: string, status: string): Promise<Technicien> {
    const response = await apiClient.patch(`${this.basePath}/techniciens/${id}/status`, { status });
    return mapTechnicien(this.extractData(response));
  }

  async deleteTechnicien(id: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/techniciens/${id}`);
  }

  // Alias for legacy naming
  async getTechnicians(params?: SearchParams): Promise<Technicien[]> {
    return this.getTechniciens(params);
  }

  // === MISSIONS ===
  async getMissions(params?: SearchParams): Promise<Mission[]> {
    const response = await apiClient.get(`${this.basePath}/missions`, { params: buildPaginationParams(params) });
    const data = this.extractData(response);
    return Array.isArray(data) ? data.map(mapMission) : [];
  }

  async getMission(id: string): Promise<Mission> {
    const response = await apiClient.get(`${this.basePath}/missions/${id}`);
    return mapMission(this.extractData(response));
  }

  async getMissionsStats(): Promise<any> {
    const response = await apiClient.get(`${this.basePath}/missions/stats`);
    return this.extractData(response);
  }

  async createMission(data: Partial<Mission>): Promise<Mission> {
    const response = await apiClient.post(`${this.basePath}/missions`, data);
    return mapMission(this.extractData(response));
  }

  async updateMission(id: string, data: Partial<Mission>): Promise<Mission> {
    const response = await apiClient.put(`${this.basePath}/missions/${id}`, data);
    return mapMission(this.extractData(response));
  }

  async updateMissionStatus(id: string, status: string): Promise<Mission> {
    const response = await apiClient.patch(`${this.basePath}/missions/${id}/status`, { status });
    return mapMission(this.extractData(response));
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
    const response = await apiClient.get(`${this.basePath}/interventions`, { params: buildInterventionParams(params) });
    const data = this.extractData(response);
    return Array.isArray(data) ? data.map(mapIntervention) : [];
  }

  async getIntervention(id: string): Promise<Intervention> {
    const response = await apiClient.get(`${this.basePath}/interventions/${id}`);
    return mapIntervention(this.extractData(response));
  }

  async createIntervention(data: Partial<Intervention>): Promise<Intervention> {
    const response = await apiClient.post(`${this.basePath}/interventions`, data);
    return mapIntervention(this.extractData(response));
  }

  async updateIntervention(id: string, data: Partial<Intervention>): Promise<Intervention> {
    const response = await apiClient.put(`${this.basePath}/interventions/${id}`, data);
    return mapIntervention(this.extractData(response));
  }

  async completeIntervention(id: string, data: { resultats?: string; observations?: string; dureeReelle?: number }): Promise<Intervention> {
    const response = await apiClient.patch(`${this.basePath}/interventions/${id}/complete`, data);
    return mapIntervention(this.extractData(response));
  }

  async deleteIntervention(id: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/interventions/${id}`);
  }

  // === MATERIEL ===
  async getMateriel(params?: SearchParams): Promise<Materiel[]> {
    const response = await apiClient.get(`${this.basePath}/materiel`, { params: buildMaterielParams(params) });
    const data = this.extractData(response);
    return Array.isArray(data) ? data.map(mapMateriel) : [];
  }

  async getMaterielById(id: string): Promise<Materiel> {
    const response = await apiClient.get(`${this.basePath}/materiel/${id}`);
    return mapMateriel(this.extractData(response));
  }

  async getMaterielAlertes(): Promise<Materiel[]> {
    const response = await apiClient.get(`${this.basePath}/materiel/alertes`);
    const data = this.extractData<any>(response);
    const alertes = Array.isArray(data) ? data : data?.alertes;
    return Array.isArray(alertes) ? alertes.map(mapMateriel) : [];
  }

  async getSortiesEnCours(): Promise<SortieMateriel[]> {
    const response = await apiClient.get(`${this.basePath}/materiel/sorties-en-cours`);
    return this.extractData(response);
  }

  async createMateriel(data: Partial<Materiel>): Promise<Materiel> {
    const response = await apiClient.post(`${this.basePath}/materiel`, data);
    return mapMateriel(this.extractData(response));
  }

  async updateMateriel(id: string, data: Partial<Materiel>): Promise<Materiel> {
    const response = await apiClient.put(`${this.basePath}/materiel/${id}`, data);
    return mapMateriel(this.extractData(response));
  }

  async deleteMateriel(id: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/materiel/${id}`);
  }

  // === RAPPORTS ===
  async getRapports(params?: SearchParams): Promise<Rapport[]> {
    const response = await apiClient.get(`${this.basePath}/rapports`, { params: buildRapportParams(params) });
    const data = this.extractData(response);
    return Array.isArray(data) ? data.map(mapRapport) : [];
  }

  async getRapport(id: string): Promise<Rapport> {
    const response = await apiClient.get(`${this.basePath}/rapports/${id}`);
    return mapRapport(this.extractData(response));
  }

  async createRapport(data: Partial<Rapport>): Promise<Rapport> {
    const payload = {
      interventionId: (data as any).interventionId,
      titre: (data as any).titre ?? (data as any).title ?? "Rapport d'intervention",
      contenu: (data as any).contenu ?? (data as any).workDone ?? '',
      conclusions: (data as any).conclusions ?? (data as any).issuesFound ?? undefined,
      recommandations: (data as any).recommandations ?? (data as any).recommendations ?? undefined,
    };
    const response = await apiClient.post(`${this.basePath}/rapports`, payload);
    return mapRapport(this.extractData(response));
  }

  async updateRapport(id: string, data: Partial<Rapport>): Promise<Rapport> {
    const payload = { status: normalizeRapportStatus((data as any).status) };
    const response = await apiClient.patch(`${this.basePath}/rapports/${id}/status`, payload);
    return mapRapport(this.extractData(response));
  }

  async validateRapport(id: string): Promise<Rapport> {
    const response = await apiClient.patch(`${this.basePath}/rapports/${id}/status`, { status: 'VALIDE' });
    return mapRapport(this.extractData(response));
  }

  async deleteRapport(id: string): Promise<void> {
    await apiClient.delete(`${this.basePath}/rapports/${id}`);
  }

  async sortirMateriel(data: SortirMaterielRequest): Promise<SortieMateriel> {
    const response = await apiClient.post(`${this.basePath}/materiel/sorties`, data);
    return this.extractData(response);
  }

  async uploadPhoto(rapportId: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await apiClient.post(`${this.basePath}/rapports/${rapportId}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return this.extractData(response);
  }
}

export const technicalService = new TechnicalService();
