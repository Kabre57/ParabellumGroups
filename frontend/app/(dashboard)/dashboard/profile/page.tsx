'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { User, Mail, Phone, Building, Calendar, Shield, Edit, Save, X, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { authService } from '@/shared/api/auth';
import type { User as AuthUser } from '@/shared/api/shared/types';

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { data: currentUser, isLoading: isLoadingUser } = useQuery<AuthUser>({
    queryKey: ['currentUser'],
    queryFn: () => authService.getCurrentUser(),
    staleTime: 5 * 60 * 1000,
  });

  const [userData, setUserData] = useState<AuthUser | null>(null);
  const [formData, setFormData] = useState<AuthUser | null>(null);

  useEffect(() => {
    if (currentUser) {
      setUserData(currentUser);
      setFormData(currentUser);
    }
  }, [currentUser]);

  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrateur',
    GENERAL_DIRECTOR: 'Directeur Général',
    SERVICE_MANAGER: 'Responsable de Service',
    EMPLOYEE: 'Employé',
    ACCOUNTANT: 'Comptable',
    MANAGER: 'Manager'
  };

  const handleEdit = () => {
    setIsEditing(true);
    setFormData(userData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(userData);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      if (!formData) throw new Error('Aucune donnée à sauvegarder');
      const updated = await authService.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        avatar: formData.avatar,
      });
      setUserData(updated);
      setFormData(updated);
      setIsEditing(false);
      toast.success('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => prev ? { ...prev, [name]: value } : prev);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  if (isLoadingUser || !userData || !formData) {
    return <div className="p-6">Chargement du profil...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Mon Profil</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gérez vos informations personnelles et préférences
          </p>
        </div>

        {!isEditing ? (
          <button
            onClick={handleEdit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Edit className="w-5 h-5" />
            Modifier
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              disabled={isLoading}
            >
              <X className="w-5 h-5" />
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
              disabled={isLoading}
            >
              <Save className="w-5 h-5" />
              {isLoading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        )}
      </div>

      {/* Photo de profil */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold">
              {userData.firstName[0]}{userData.lastName[0]}
            </div>
            {isEditing && (
              <button
                className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700"
                title="Changer la photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {userData.firstName} {userData.lastName}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-1">
              <Shield className="w-4 h-4" />
              {roleLabels[userData.role] || userData.role}
            </p>
          </div>
        </div>
      </div>

      {/* Informations personnelles */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Informations personnelles</h3>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Prénom */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Prénom
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900 dark:text-gray-100 font-medium">{userData.firstName}</p>
              )}
            </div>

            {/* Nom */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Nom
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900 dark:text-gray-100 font-medium">{userData.lastName}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900 dark:text-gray-100 font-medium">{userData.email}</p>
              )}
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Phone className="w-4 h-4 inline mr-2" />
                Téléphone
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  name="phoneNumber"
                  value={(formData as any).phoneNumber || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              ) : (
                <p className="text-gray-900 dark:text-gray-100 font-medium">{(userData as any).phoneNumber || '—'}</p>
              )}
            </div>
          </div>

          {/* Service */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building className="w-4 h-4 inline mr-2" />
              Service
            </label>
            <p className="text-gray-900 font-medium">—</p>
          </div>

          {/* Rôle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Shield className="w-4 h-4 inline mr-2" />
              Rôle
            </label>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {roleLabels[userData.role] || userData.role}
            </span>
          </div>

          {/* Date d'arrivée */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Date d'arrivée
            </label>
            <p className="text-gray-900 font-medium">{formatDate(userData.joinedDate)}</p>
          </div>
        </div>
      </div>

      {/* Sécurité */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sécurité</h3>
        </div>

        <div className="p-6">
          <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            Changer le mot de passe
          </button>
        </div>
      </div>

      {/* Activité récente */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activité récente</h3>
        </div>

        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">Connexion réussie</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Aujourd'hui à 09:30</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">Profil mis à jour</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Hier à 14:22</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-gray-400 mt-2"></div>
              <div className="flex-1">
                <p className="text-sm text-gray-900 dark:text-gray-100 font-medium">Mot de passe modifié</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Il y a 3 jours</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
