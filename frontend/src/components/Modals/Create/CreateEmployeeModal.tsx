import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, User, Mail, Phone, MapPin, Calendar, Building2, Briefcase } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../../services/api';

const employeeService = createCrudService('employees');
const serviceService = createCrudService('services');

const createEmployeeSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis'),
  lastName: z.string().min(1, 'Nom requis'),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  dateOfBirth: z.string().min(1, 'Date de naissance requise'),
  placeOfBirth: z.string().optional(),
  nationality: z.string().default('Ivoirienne'),
  socialSecurityNumber: z.string().optional(),
  bankAccount: z.string().optional(),
  emergencyContact: z.string().optional(),
  serviceId: z.number().min(1, 'Service requis'),
  position: z.string().min(1, 'Poste requis'),
  department: z.string().optional(),
  manager: z.string().optional(),
  hireDate: z.string().min(1, 'Date d\'embauche requise'),
  // Contrat
  contractType: z.enum(['CDI', 'CDD', 'STAGE', 'FREELANCE']),
  baseSalary: z.number().min(0, 'Salaire invalide'),
  workingHours: z.number().min(0).max(80, 'Heures de travail invalides').default(40)
});

type CreateEmployeeFormData = z.infer<typeof createEmployeeSchema>;

interface CreateEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateEmployeeModal: React.FC<CreateEmployeeModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => serviceService.getAll()
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<CreateEmployeeFormData>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      nationality: 'Ivoirienne',
      contractType: 'CDI',
      workingHours: 40
    }
  });

  const createEmployeeMutation = useMutation({
    mutationFn: (data: CreateEmployeeFormData) => employeeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      reset();
      onClose();
    }
  });

  const onSubmit = async (data: CreateEmployeeFormData) => {
    setIsLoading(true);
    try {
      await createEmployeeMutation.mutateAsync(data);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const servicesList = services?.data?.services || [];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <User className="h-5 w-5 mr-2" />
            Créer un Employé
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-6">
          {/* Informations personnelles */}
          <div className="border-b pb-4">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <User className="h-4 w-4 mr-2" />
              Informations Personnelles
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                <input
                  {...register('firstName')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Prénom"
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input
                  {...register('lastName')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nom"
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    {...register('email')}
                    type="email"
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="email@exemple.com"
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    {...register('phone')}
                    type="tel"
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+225 07 07 07 07 07"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    {...register('dateOfBirth')}
                    type="date"
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                {errors.dateOfBirth && <p className="mt-1 text-sm text-red-600">{errors.dateOfBirth.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lieu de naissance</label>
                <input
                  {...register('placeOfBirth')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Abidjan, Côte d'Ivoire"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nationalité</label>
                <input
                  {...register('nationality')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ivoirienne"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de sécurité sociale</label>
                <input
                  {...register('socialSecurityNumber')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="123456789"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 text-gray-400 h-4 w-4" />
                <textarea
                  {...register('address')}
                  rows={2}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Adresse complète"
                />
              </div>
            </div>
          </div>

          {/* Informations professionnelles */}
          <div className="border-b pb-4">
            <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
              <Briefcase className="h-4 w-4 mr-2" />
              Informations Professionnelles
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <select
                    {...register('serviceId', { valueAsNumber: true })}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Sélectionner un service</option>
                    {servicesList.map((service: any) => (
                      <option key={service.id} value={service.id}>{service.name}</option>
                    ))}
                  </select>
                </div>
                {errors.serviceId && <p className="mt-1 text-sm text-red-600">{errors.serviceId.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Poste</label>
                <input
                  {...register('position')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Développeur, Commercial, etc."
                />
                {errors.position && <p className="mt-1 text-sm text-red-600">{errors.position.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Département</label>
                <input
                  {...register('department')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="IT, Ventes, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
                <input
                  {...register('manager')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nom du manager"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d'embauche</label>
                <input
                  {...register('hireDate')}
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.hireDate && <p className="mt-1 text-sm text-red-600">{errors.hireDate.message}</p>}
              </div>
            </div>
          </div>

          {/* Contrat initial */}
          <div className="border-b pb-4">
            <h4 className="text-md font-medium text-gray-900 mb-4">Contrat Initial</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type de contrat</label>
                <select
                  {...register('contractType')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="STAGE">Stage</option>
                  <option value="FREELANCE">Freelance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salaire de base (FCFA)</label>
                <input
                  {...register('baseSalary', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="500000"
                />
                {errors.baseSalary && <p className="mt-1 text-sm text-red-600">{errors.baseSalary.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Heures de travail/semaine</label>
                <input
                  {...register('workingHours', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  max="80"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="40"
                />
                {errors.workingHours && <p className="mt-1 text-sm text-red-600">{errors.workingHours.message}</p>}
              </div>
            </div>
          </div>

          {/* Informations bancaires et urgence */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Informations Complémentaires</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Compte bancaire (IBAN)</label>
                <input
                  {...register('bankAccount')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="CI05 CI000 00000000000000 00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact d'urgence</label>
                <input
                  {...register('emergencyContact')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nom et téléphone"
                />
              </div>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Création...' : 'Créer l\'employé'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};