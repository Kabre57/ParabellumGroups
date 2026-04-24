export interface Specialite {
  id: string;
  nom: string;
  description?: string;
  _count?: {
    techniciens?: number;
  };
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
  _count?: {
    missions?: number;
    interventions?: number;
    rapportsRediges?: number;
    sortiesMateriel?: number;
  };
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
  crmClientId?: string;
  crmAdresseId?: string;
  clientNom: string;
  nomAdresseChantier?: string;
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
  _count?: {
    interventions?: number;
    techniciens?: number;
  };
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
  scheduledDate?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  missionNum?: string;
  technician?: Technicien;
  priorite?: 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE';
  ordresMission?: MissionOrder[];
}

export interface InterventionTechnicien {
  id: string;
  interventionId: string;
  technicienId: string;
  technicien?: Technicien;
  dateAssignation: string;
}

export interface MissionOrder {
  id: string;
  numeroOrdre: string;
  missionId: string;
  interventionId?: string | null;
  technicienId: string;
  mission?: Mission;
  intervention?: Intervention;
  technicien?: Technicien;
  pieceIdentite?: string | null;
  fonction?: string | null;
  qualite?: string | null;
  vehiculeType: 'VEHICULE_DE_SERVICE' | 'VEHICULE_DE_TRANSPORT';
  vehiculeLabel?: string;
  destination: string;
  objetMission: string;
  dateDepart: string;
  dateRetour?: string | null;
  status: 'GENERE' | 'IMPRIME' | 'ARCHIVE';
  notes?: string | null;
  createdByUserId?: string | null;
  printedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
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
  _count?: {
    sorties?: number;
  };
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
  photos?: string[];
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
