'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, Building, Calendar, Edit, Mail, Phone, Save, Shield, User, X } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { authService } from '@/shared/api/auth';
import type { User as AuthUser } from '@/shared/api/shared/types';

type EditableProfile = {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  position: string;
  department: string;
};

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrateur',
  GENERAL_DIRECTOR: 'Direction Générale',
  SERVICE_MANAGER: 'Responsable de service',
  EMPLOYEE: 'Employé',
  ACCOUNTANT: 'Comptable',
  MANAGER: 'Manager',
  PURCHASING_MANAGER: 'Service Achat',
  COMMERCIAL: 'Commercial',
};

const resolveRoleLabel = (role: AuthUser['role']) => {
  if (typeof role === 'string') {
    return roleLabels[role] || role;
  }
  const roleCode = role?.code || role?.name || '';
  return roleLabels[roleCode] || roleCode || 'N/A';
};

const toEditableProfile = (user: AuthUser): EditableProfile => ({
  firstName: user.firstName || '',
  lastName: user.lastName || '',
  phoneNumber: (user as any).phoneNumber || '',
  position: user.position || '',
  department: user.department || '',
});

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<EditableProfile | null>(null);

  const { data: currentUser, isLoading } = useQuery<AuthUser>({
    queryKey: ['currentUser'],
    queryFn: () => authService.getCurrentUser(),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (currentUser) {
      setFormData(toEditableProfile(currentUser));
    }
  }, [currentUser]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!formData) {
        throw new Error('Aucune donnée à enregistrer');
      }

      return authService.updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber || undefined,
        position: formData.position || undefined,
        department: formData.department || undefined,
      });
    },
    onSuccess: async () => {
      toast.success('Profil mis à jour avec succès');
      setIsEditing(false);
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du profil');
    },
  });

  const fullName = useMemo(() => {
    if (!currentUser) return '';
    return `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email;
  }, [currentUser]);

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return '—';
    return parsed.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading || !currentUser || !formData) {
    return <div className="p-6">Chargement du profil...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mon Profil</h1>
          <p className="mt-2 text-muted-foreground">
            Informations personnelles, rattachement organisationnel et préférences de compte.
          </p>
        </div>

        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFormData(toEditableProfile(currentUser));
                setIsEditing(false);
              }}
              disabled={updateProfileMutation.isPending}
            >
              <X className="mr-2 h-4 w-4" />
              Annuler
            </Button>
            <Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {updateProfileMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        )}
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-3xl font-bold text-white">
            {(currentUser.firstName || 'U')[0]}
            {(currentUser.lastName || 'S')[0]}
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{fullName}</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {resolveRoleLabel(currentUser.role)}
              </span>
              <span className="inline-flex items-center gap-2">
                <Building className="h-4 w-4" />
                {currentUser.enterprise?.name || 'Entreprise non rattachée'}
              </span>
              <span className="inline-flex items-center gap-2">
                <BadgeCheck className="h-4 w-4" />
                {currentUser.isActive ? 'Compte actif' : 'Compte inactif'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">Informations personnelles</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Prénom</label>
              {isEditing ? (
                <Input value={formData.firstName} onChange={(e) => setFormData((cur) => (cur ? { ...cur, firstName: e.target.value } : cur))} />
              ) : (
                <div className="rounded-md border bg-muted/20 px-3 py-2">{currentUser.firstName}</div>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Nom</label>
              {isEditing ? (
                <Input value={formData.lastName} onChange={(e) => setFormData((cur) => (cur ? { ...cur, lastName: e.target.value } : cur))} />
              ) : (
                <div className="rounded-md border bg-muted/20 px-3 py-2">{currentUser.lastName}</div>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Email</label>
              <div className="rounded-md border bg-muted/20 px-3 py-2">{currentUser.email}</div>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Téléphone</label>
              {isEditing ? (
                <Input value={formData.phoneNumber} onChange={(e) => setFormData((cur) => (cur ? { ...cur, phoneNumber: e.target.value } : cur))} />
              ) : (
                <div className="rounded-md border bg-muted/20 px-3 py-2">{(currentUser as any).phoneNumber || '—'}</div>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Poste</label>
              {isEditing ? (
                <Input value={formData.position} onChange={(e) => setFormData((cur) => (cur ? { ...cur, position: e.target.value } : cur))} />
              ) : (
                <div className="rounded-md border bg-muted/20 px-3 py-2">{currentUser.position || '—'}</div>
              )}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Département</label>
              {isEditing ? (
                <Input value={formData.department} onChange={(e) => setFormData((cur) => (cur ? { ...cur, department: e.target.value } : cur))} />
              ) : (
                <div className="rounded-md border bg-muted/20 px-3 py-2">{currentUser.department || '—'}</div>
              )}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Rattachement</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Building className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Entreprise</div>
                  <div className="text-muted-foreground">{currentUser.enterprise?.name || 'Aucune'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Rôle</div>
                  <div className="text-muted-foreground">{resolveRoleLabel(currentUser.role)}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Service</div>
                  <div className="text-muted-foreground">{currentUser.service?.name || 'Non renseigné'}</div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Historique du compte</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Date de création</div>
                  <div className="text-muted-foreground">{formatDate(currentUser.createdAt)}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Dernière mise à jour</div>
                  <div className="text-muted-foreground">{formatDate(currentUser.updatedAt)}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">Dernière connexion</div>
                  <div className="text-muted-foreground">{formatDate((currentUser as any).lastLogin || currentUser.lastLoginAt)}</div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Contact rapide</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{currentUser.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{(currentUser as any).phoneNumber || '—'}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
