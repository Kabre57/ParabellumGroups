import { apiClient } from '../shared/client';
import { PaginatedResponse } from '../shared/types';
import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, Contract } from './types';

// Helpers de mapping backend -> frontend
const mapEmployeeFromApi = (api: any): Employee => ({
  id: api.id,
  firstName: api.prenom ?? api.firstName ?? '',
  lastName: api.nom ?? api.lastName ?? '',
  email: api.email ?? '',
  phoneNumber: api.telephone ?? api.phoneNumber,
  nationality: api.nationalite,
  cnpsNumber: api.cnpsNumber,
  cnamNumber: api.cnamNumber,
  dateOfBirth: api.dateNaissance,
  address: api.adresse,
  position: api.poste ?? api.position ?? '',
  department: api.departement ?? api.department ?? '',
  hireDate: api.dateEmbauche ?? api.hireDate ?? '',
  employmentStatus: api.categorie ?? api.employmentStatus ?? 'CDI',
  isActive: api.status ? api.status === 'ACTIF' : api.isActive ?? true,
  salary: api.salaire ? Number(api.salaire) : undefined,
  matricule: api.matricule,
  createdAt: api.createdAt ?? '',
  updatedAt: api.updatedAt ?? '',
});

const mapEmployeeToApi = (payload: CreateEmployeeRequest | UpdateEmployeeRequest) => ({
  matricule: payload.matricule ?? `EMP-${Date.now()}`,
  nom: payload.lastName,
  prenom: payload.firstName,
  email: payload.email,
  telephone: payload.phoneNumber,
  adresse: payload.address,
  nationalite: payload.nationality,
  cnpsNumber: payload.cnpsNumber,
  cnamNumber: payload.cnamNumber,
  dateEmbauche: payload.hireDate,
  poste: payload.position,
  departement: payload.department,
  salaire: payload.salary ?? 0,
  status: payload.isActive === false ? 'CONGE' : 'ACTIF',
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
      search: query,
    };
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
