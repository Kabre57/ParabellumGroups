import { apiClient } from '../shared/client';
import { PaginatedResponse } from '../shared/types';
import { Employee, CreateEmployeeRequest, UpdateEmployeeRequest, Contract } from './types';

// Helpers de mapping backend -> frontend
const getLatestContract = (api: any) => {
  if (Array.isArray(api.contrats) && api.contrats.length > 0) return api.contrats[0];
  return api.contrat ?? api.contract ?? null;
};

const mapEmployeeFromApi = (api: any): Employee => {
  const contract = getLatestContract(api);
  const status = api.statut ?? api.status;

  return {
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
    position: api.posteOccupe ?? contract?.posteOccupe ?? api.poste ?? api.position ?? '',
    department: api.service ?? contract?.service ?? contract?.direction ?? api.direction ?? api.departement ?? api.department ?? '',
    hireDate: api.dateEmbauche ?? contract?.dateDebut ?? api.hireDate ?? '',
    employmentStatus: contract?.typeContrat ?? api.categorie ?? api.employmentStatus ?? 'CDI',
    isActive: status ? String(status).toUpperCase() === 'ACTIF' : api.isActive ?? true,
    salary: Number(api.salaire ?? contract?.salaireBaseMensuel ?? api.salary ?? 0) || undefined,
    matricule: api.matricule,
    createdAt: api.dateCreation ?? api.createdAt ?? '',
    updatedAt: api.dateModification ?? api.updatedAt ?? '',
  };
};

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
  posteOccupe: payload.position,
  service: payload.department,
  dateDebut: 'hireDate' in payload ? payload.hireDate : undefined,
  salaireBaseMensuel: payload.salary,
  typeContrat: 'employmentStatus' in payload ? payload.employmentStatus : 'CDI',
  statut: payload.isActive === false ? 'INACTIF' : 'ACTIF',
});

const buildPagination = (payload: any, page: number, pageSize: number, itemCount: number) => {
  const currentPage = Number(payload?.currentPage ?? payload?.page ?? page) || page;
  const resolvedPageSize = Number(payload?.pageSize ?? payload?.limit ?? pageSize) || pageSize;
  const totalItems = Number(payload?.totalItems ?? payload?.total ?? itemCount) || itemCount;
  const totalPages = Number(payload?.totalPages ?? Math.ceil(totalItems / Math.max(1, resolvedPageSize))) || 1;

  return {
    currentPage,
    totalPages,
    pageSize: resolvedPageSize,
    totalItems,
    hasNext: currentPage < totalPages,
    hasPrevious: currentPage > 1,
  };
};

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
    const payload = response.data ?? {};
    const data = payload?.data?.map(mapEmployeeFromApi) ?? [];
    const pagination = buildPagination(payload?.pagination ?? payload, page, pageSize, data.length);
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
