import { apiClient } from '../shared/client';
import { PaginatedResponse } from '../shared/types';
import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, Contract } from './types';

// Helpers de mapping backend -> frontend
const mapEmployeeFromApi = (api: any): Employee => ({
  id: api.matricule ?? api.id,
  firstName: api.prenoms ?? api.prenom ?? api.firstName ?? '',
  lastName: api.nom ?? api.lastName ?? '',
  email: api.emailPersonnel ?? api.email ?? '',
  phoneNumber: api.telephonePersonnel ?? api.telephone ?? api.phoneNumber,
  nationality: api.nationalite,
  cnpsNumber: api.numeroCnps ?? api.cnpsNumber,
  cnamNumber: api.cnamNumber,
  dateOfBirth: api.dateNaissance,
  address: api.adressePersonnelle ?? api.adresse ?? api.address,
  position: api.posteOccupe ?? api.poste ?? api.position ?? '',
  department: api.service ?? api.direction ?? api.departement ?? api.department ?? '',
  hireDate: api.dateEmbauche ?? api.hireDate ?? '',
  employmentStatus: api.statut ?? api.categorie ?? api.employmentStatus ?? 'CDI',
  isActive: api.statut ? api.statut.toUpperCase() === 'ACTIF' : api.isActive ?? true,
  salary: api.salaire ? Number(api.salaire) : undefined,
  matricule: api.matricule,
  createdAt: api.dateCreation ?? api.createdAt ?? '',
  updatedAt: api.dateModification ?? api.updatedAt ?? '',
});

const mapEmployeeToApi = (payload: CreateEmployeeRequest | UpdateEmployeeRequest) => ({
  matricule: payload.matricule?.trim() || undefined,
  nom: payload.lastName,
  prenoms: payload.firstName,
  emailPersonnel: payload.email,
  telephonePersonnel: payload.phoneNumber,
  adressePersonnelle: payload.address,
  nationalite: payload.nationality,
  numeroCnps: payload.cnpsNumber,
  cnamNumber: payload.cnamNumber,
  dateNaissance: 'dateOfBirth' in payload ? payload.dateOfBirth : undefined,
  statut: payload.isActive === false ? 'INACTIF' : 'ACTIF',
});

export const employeesService = {
  async getEmployees(params?: {
    page?: number;
    pageSize?: number;
    query?: string;
    filters?: any;
  }): Promise<PaginatedResponse<Employee>> {
    const { page = 1, pageSize = 10, query = '', filters = {} } = params || {};
    const backendParams: any = {
      page,
      limit: pageSize,
    };
    if (query.trim()) backendParams.search = query.trim();
    if (filters.department) backendParams.departement = filters.department;
    if (filters.isActive !== undefined) backendParams.status = filters.isActive ? 'ACTIF' : 'CONGE';

    const response = await apiClient.get('/employees', { params: backendParams });
    const data = response.data?.data?.map(mapEmployeeFromApi) ?? [];
    const pagination = response.data?.pagination ?? { page, limit: pageSize, total: data.length, totalPages: 1 };
    return { data, pagination };
  },

  async getEmployee(id: string): Promise<Employee> {
    const response = await apiClient.get(`/employees/${id}`);
    return mapEmployeeFromApi(response.data);
  },

  async createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
    const payload = mapEmployeeToApi(data);
    const response = await apiClient.post('/employees', payload);
    return mapEmployeeFromApi(response.data);
  },

  async updateEmployee(id: string, data: UpdateEmployeeRequest): Promise<Employee> {
    const payload = mapEmployeeToApi(data);
    const response = await apiClient.put(`/employees/${id}`, payload);
    return mapEmployeeFromApi(response.data);
  },

  async deleteEmployee(id: string): Promise<void> {
    await apiClient.delete(`/employees/${id}`);
  },

  async getEmployeeContracts(id: string): Promise<Contract[]> {
    const response = await apiClient.get(`/employees/${id}/contracts`);
    return response.data;
  }
};
