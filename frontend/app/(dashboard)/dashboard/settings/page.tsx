'use client';

import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Building2, Database, Globe, Mail, Save, Settings, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { authService } from '@/shared/api/auth';
import type { User } from '@/shared/api/shared/types';
import { enterpriseApi, type Enterprise } from '@/lib/api';

type UserPreferences = {
  timezone?: string;
  language?: string;
  currency?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    dailySummary?: boolean;
    securityAlerts?: boolean;
  };
  security?: {
    require2fa?: boolean;
    notifyNewLogin?: boolean;
  };
};

const tabs = [
  { id: 'general', label: 'Général', icon: Settings },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Sécurité', icon: Shield },
  { id: 'database', label: 'Base de données', icon: Database },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'localization', label: 'Localisation', icon: Globe },
] as const;

const defaultPreferences: UserPreferences = {
  timezone: 'Africa/Abidjan',
  language: 'fr',
  currency: 'XOF',
  notifications: {
    email: true,
    push: true,
    dailySummary: false,
    securityAlerts: true,
  },
  security: {
    require2fa: false,
    notifyNewLogin: true,
  },
};

const parsePreferences = (value: User['preferences']): UserPreferences => {
  if (!value) return defaultPreferences;
  if (typeof value === 'object') {
    return {
      ...defaultPreferences,
      ...value,
      notifications: { ...defaultPreferences.notifications, ...(value.notifications || {}) },
      security: { ...defaultPreferences.security, ...(value.security || {}) },
    };
  }

  try {
    const parsed = JSON.parse(value);
    return {
      ...defaultPreferences,
      ...parsed,
      notifications: { ...defaultPreferences.notifications, ...(parsed.notifications || {}) },
      security: { ...defaultPreferences.security, ...(parsed.security || {}) },
    };
  } catch {
    return defaultPreferences;
  }
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('general');

  const userQuery = useQuery<User>({
    queryKey: ['settings-current-user'],
    queryFn: () => authService.getCurrentUser(),
    staleTime: 5 * 60 * 1000,
  });

  const currentUser = userQuery.data;
  const preferences = useMemo(() => parsePreferences(currentUser?.preferences), [currentUser?.preferences]);
  const [enterpriseDraft, setEnterpriseDraft] = useState({
    name: '',
    code: '',
    description: '',
  });
  const [prefsDraft, setPrefsDraft] = useState<UserPreferences>(defaultPreferences);

  const enterpriseQuery = useQuery<{ success: boolean; data: Enterprise }>({
    queryKey: ['settings-enterprise', currentUser?.enterpriseId],
    queryFn: () => enterpriseApi.getById(currentUser?.enterpriseId as string | number),
    enabled: Boolean(currentUser?.enterpriseId),
    staleTime: 5 * 60 * 1000,
  });

  React.useEffect(() => {
    const enterprise = enterpriseQuery.data?.data;
    if (enterprise) {
      setEnterpriseDraft({
        name: enterprise.name || '',
        code: enterprise.code || '',
        description: enterprise.description || '',
      });
    }
  }, [enterpriseQuery.data?.data]);

  React.useEffect(() => {
    setPrefsDraft(preferences);
  }, [preferences]);

  const updateEnterpriseMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser?.enterpriseId) return null;
      return enterpriseApi.update(currentUser.enterpriseId, {
        name: enterpriseDraft.name.trim(),
        code: enterpriseDraft.code.trim() || undefined,
        description: enterpriseDraft.description.trim() || undefined,
      });
    },
    onSuccess: async () => {
      toast.success("Paramètres de l'entreprise enregistrés.");
      await queryClient.invalidateQueries({ queryKey: ['settings-enterprise'] });
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Impossible d'enregistrer l'entreprise.");
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async () =>
      authService.updateProfile({
        preferences: prefsDraft,
      }),
    onSuccess: async () => {
      toast.success('Préférences enregistrées.');
      await queryClient.invalidateQueries({ queryKey: ['settings-current-user'] });
      await queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: () => {
      toast.error("Impossible d'enregistrer les préférences.");
    },
  });

  if (userQuery.isLoading) {
    return <div className="p-6">Chargement des paramètres...</div>;
  }

  if (!currentUser) {
    return <div className="p-6">Impossible de charger les paramètres.</div>;
  }

  const enterprise = enterpriseQuery.data?.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Paramètres Système</h1>
          <p className="mt-2 text-muted-foreground">
            Réglages opérationnels du workspace, de l’entreprise active et des préférences utilisateur.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Entreprise active</div>
            <div className="mt-2 font-semibold">{enterprise?.name || currentUser.enterprise?.name || 'Non rattachée'}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Rôle</div>
            <div className="mt-2 font-semibold">{typeof currentUser.role === 'string' ? currentUser.role : currentUser.role?.name || currentUser.role?.code || '—'}</div>
          </Card>
          <Card className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Service</div>
            <div className="mt-2 font-semibold">{currentUser.service?.name || currentUser.department || 'Non renseigné'}</div>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-fit p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                }`}
              >
                <tab.icon className="mr-3 h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </Card>

        <Card className="p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Paramètres généraux</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ces informations pilotent l’identité de l’entreprise visible dans les documents et l’admin.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium">Nom de l’entreprise</label>
                  <Input value={enterpriseDraft.name} onChange={(e) => setEnterpriseDraft((cur) => ({ ...cur, name: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Code entreprise</label>
                  <Input value={enterpriseDraft.code} onChange={(e) => setEnterpriseDraft((cur) => ({ ...cur, code: e.target.value }))} placeholder="PBL" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Email de contact principal</label>
                  <Input value={currentUser.email} readOnly className="bg-muted/40" />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium">Description</label>
                  <Textarea
                    rows={4}
                    value={enterpriseDraft.description}
                    onChange={(e) => setEnterpriseDraft((cur) => ({ ...cur, description: e.target.value }))}
                    placeholder="Présentez l’activité, le périmètre ou l’usage de cette entreprise."
                  />
                </div>
              </div>
              <div className="flex justify-end border-t pt-4">
                <Button onClick={() => updateEnterpriseMutation.mutate()} disabled={updateEnterpriseMutation.isPending || !currentUser.enterpriseId}>
                  <Save className="mr-2 h-4 w-4" />
                  {updateEnterpriseMutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Préférences de notifications</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Réglages personnels stockés sur votre profil pour adapter le bruit opérationnel à votre usage.
                </p>
              </div>
              {[
                ['email', 'Notifications par email', 'Recevoir les alertes métier importantes dans votre boîte mail.'],
                ['push', 'Notifications dans l’application', 'Conserver le flux temps réel dans le header et les pages métier.'],
                ['dailySummary', 'Résumé quotidien', 'Recevoir un récapitulatif des activités et validations attendues.'],
                ['securityAlerts', 'Alertes de sécurité', 'Prévenir en cas de connexion inhabituelle ou de changement sensible.'],
              ].map(([key, title, description]) => (
                <label key={key} className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/30">
                  <input
                    type="checkbox"
                    checked={Boolean(prefsDraft.notifications?.[key as keyof NonNullable<UserPreferences['notifications']>])}
                    onChange={(e) =>
                      setPrefsDraft((cur) => ({
                        ...cur,
                        notifications: {
                          ...cur.notifications,
                          [key]: e.target.checked,
                        },
                      }))
                    }
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">{title}</div>
                    <div className="text-sm text-muted-foreground">{description}</div>
                  </div>
                </label>
              ))}
              <div className="flex justify-end border-t pt-4">
                <Button onClick={() => updatePreferencesMutation.mutate()} disabled={updatePreferencesMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updatePreferencesMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Sécurité</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pilotage léger des préférences sécurité côté utilisateur, avec rappel du périmètre réel de votre compte.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Dernière connexion</div>
                  <div className="mt-2 font-semibold">
                    {currentUser.lastLoginAt || (currentUser as any).lastLogin
                      ? new Date((currentUser.lastLoginAt || (currentUser as any).lastLogin) as string).toLocaleString('fr-FR')
                      : 'Non disponible'}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Entreprise rattachée</div>
                  <div className="mt-2 font-semibold">{enterprise?.name || currentUser.enterprise?.name || 'Aucune'}</div>
                </Card>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={Boolean(prefsDraft.security?.require2fa)}
                  onChange={(e) =>
                    setPrefsDraft((cur) => ({
                      ...cur,
                      security: {
                        ...cur.security,
                        require2fa: e.target.checked,
                      },
                    }))
                  }
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">Demander la 2FA dès qu’elle sera activée côté backend</div>
                  <div className="text-sm text-muted-foreground">
                    Préférence enregistrée sur le profil. Le mécanisme complet peut ensuite être branché côté auth-service.
                  </div>
                </div>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/30">
                <input
                  type="checkbox"
                  checked={Boolean(prefsDraft.security?.notifyNewLogin)}
                  onChange={(e) =>
                    setPrefsDraft((cur) => ({
                      ...cur,
                      security: {
                        ...cur.security,
                        notifyNewLogin: e.target.checked,
                      },
                    }))
                  }
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">M’avertir des nouvelles connexions</div>
                  <div className="text-sm text-muted-foreground">
                    Utile pour les profils administratifs et les comptes utilisés sur plusieurs sites.
                  </div>
                </div>
              </label>
              <div className="flex justify-end border-t pt-4">
                <Button onClick={() => updatePreferencesMutation.mutate()} disabled={updatePreferencesMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updatePreferencesMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Base de données</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Lecture projet des briques actuellement exploitées par l’ERP, sans faux réglages non branchés.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-emerald-200 bg-emerald-50 p-4">
                  <div className="font-semibold text-emerald-800">Architecture active</div>
                  <div className="mt-2 text-sm text-emerald-700">PostgreSQL + Prisma, multi-services ERP, déployés sous Docker.</div>
                </Card>
                <Card className="p-4">
                  <div className="font-semibold">Contexte applicatif</div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Auth, CRM, achats, facturation, comptabilité et services techniques reposent sur une base commune et des flux d’événements internes.
                  </div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'email' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Email</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Les paramètres SMTP ne sont pas encore exposés en édition dans ce projet; on affiche ici les points d’usage réels.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Adresse utilisateur</div>
                  <div className="mt-2 font-semibold">{currentUser.email}</div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">Entreprise pour les documents</div>
                  <div className="mt-2 font-semibold">{enterprise?.name || 'Non définie'}</div>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'localization' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">Localisation</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Préférences utilisateur utilisées pour le rendu des dates, devises et horaires dans l’interface.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">Langue</label>
                  <select
                    className="w-full rounded-md border px-3 py-2"
                    value={prefsDraft.language || 'fr'}
                    onChange={(e) => setPrefsDraft((cur) => ({ ...cur, language: e.target.value }))}
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Fuseau horaire</label>
                  <select
                    className="w-full rounded-md border px-3 py-2"
                    value={prefsDraft.timezone || 'Africa/Abidjan'}
                    onChange={(e) => setPrefsDraft((cur) => ({ ...cur, timezone: e.target.value }))}
                  >
                    <option value="Africa/Abidjan">Afrique/Abidjan (GMT)</option>
                    <option value="Europe/Paris">Europe/Paris</option>
                    <option value="UTC">UTC</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Devise par défaut</label>
                  <select
                    className="w-full rounded-md border px-3 py-2"
                    value={prefsDraft.currency || 'XOF'}
                    onChange={(e) => setPrefsDraft((cur) => ({ ...cur, currency: e.target.value }))}
                  >
                    <option value="XOF">FCFA (XOF)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="USD">Dollar (USD)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end border-t pt-4">
                <Button onClick={() => updatePreferencesMutation.mutate()} disabled={updatePreferencesMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  {updatePreferencesMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
