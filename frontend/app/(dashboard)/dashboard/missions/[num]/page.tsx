'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { technicalService, Mission, Intervention } from '@/shared/api/services/technical';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const STATUS_COLORS = {
  PENDING: 'warning',
  IN_PROGRESS: 'default',
  COMPLETED: 'success',
  CANCELLED: 'danger',
} as const;

const PRIORITY_COLORS = {
  LOW: 'outline',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'danger',
} as const;

export default function MissionDetailPage({ params }: { params: { num: string } }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('informations');
  const [interventionForm, setInterventionForm] = useState({
    technicianId: '',
    date: '',
    startTime: '',
    endTime: '',
    description: '',
    status: 'PLANNED',
  });

  const { data: mission, isLoading } = useQuery({
    queryKey: ['mission', params.num],
    queryFn: () => technicalService.getMission(params.num),
  });

  const { data: interventions } = useQuery({
    queryKey: ['interventions', params.num],
    queryFn: () => technicalService.getInterventions(params.num),
    enabled: !!params.num,
  });

  const createInterventionMutation = useMutation({
    mutationFn: (data: any) => technicalService.createIntervention(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interventions', params.num] });
      setInterventionForm({
        technicianId: '',
        date: '',
        startTime: '',
        endTime: '',
        description: '',
        status: 'PLANNED',
      });
    },
  });

  const handleCreateIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    createInterventionMutation.mutate({
      missionNum: params.num,
      ...interventionForm,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner className="w-12 h-12" />
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Mission non trouvée</p>
        <Button onClick={() => router.push('/dashboard/missions')} className="mt-4">
          Retour aux missions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/missions')}
            className="mb-4"
          >
            Retour
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {mission.num} - {mission.title}
          </h1>
          <div className="flex gap-2 mt-2">
            <Badge
              variant={
                STATUS_COLORS[mission.status as keyof typeof STATUS_COLORS] ||
                'default'
              }
            >
              {mission.status}
            </Badge>
            {mission.priority && (
              <Badge
                variant={
                  PRIORITY_COLORS[
                    mission.priority as keyof typeof PRIORITY_COLORS
                  ] || 'default'
                }
              >
                {mission.priority}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="informations">Informations</TabsTrigger>
          <TabsTrigger value="techniciens">Techniciens assignés</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
          <TabsTrigger value="materiel">Matériel</TabsTrigger>
          <TabsTrigger value="rapports">Rapports</TabsTrigger>
        </TabsList>

        <TabsContent value="informations">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Détails de la mission</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Titre</Label>
                <p className="mt-1 text-gray-900 dark:text-white">{mission.title}</p>
              </div>
              <div>
                <Label>Numéro</Label>
                <p className="mt-1 text-gray-900 dark:text-white">{mission.num}</p>
              </div>
              <div>
                <Label>Date de début</Label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {format(new Date(mission.startDate), 'dd MMMM yyyy', { locale: fr })}
                </p>
              </div>
              <div>
                <Label>Date de fin</Label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {mission.endDate
                    ? format(new Date(mission.endDate), 'dd MMMM yyyy', { locale: fr })
                    : 'Non définie'}
                </p>
              </div>
              <div className="md:col-span-2">
                <Label>Localisation</Label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {mission.location || 'Non spécifiée'}
                </p>
              </div>
              <div className="md:col-span-2">
                <Label>Description</Label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {mission.description || 'Aucune description'}
                </p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="techniciens">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Techniciens assignés</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Aucun technicien assigné pour le moment
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="interventions">
          <div className="space-y-6">
            {/* Timeline */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Timeline des interventions</h2>
              {interventions && interventions.length > 0 ? (
                <div className="space-y-4">
                  {interventions.map((intervention: Intervention) => (
                    <div
                      key={intervention.id}
                      className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
                    >
                      <div className="w-2 h-2 mt-2 rounded-full bg-blue-500"></div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {format(new Date(intervention.date), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {intervention.startTime}
                          {intervention.endTime && ` - ${intervention.endTime}`}
                        </p>
                        <p className="mt-1 text-sm">{intervention.description}</p>
                      </div>
                      <Badge variant="default">{intervention.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 dark:text-gray-400">
                  Aucune intervention enregistrée
                </p>
              )}
            </Card>

            {/* Formulaire d'intervention */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Nouvelle intervention</h2>
              <form onSubmit={handleCreateIntervention} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      type="date"
                      id="date"
                      value={interventionForm.date}
                      onChange={(e) =>
                        setInterventionForm({ ...interventionForm, date: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="technicianId">Technicien</Label>
                    <Input
                      type="text"
                      id="technicianId"
                      placeholder="ID du technicien"
                      value={interventionForm.technicianId}
                      onChange={(e) =>
                        setInterventionForm({
                          ...interventionForm,
                          technicianId: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="startTime">Heure de début</Label>
                    <Input
                      type="time"
                      id="startTime"
                      value={interventionForm.startTime}
                      onChange={(e) =>
                        setInterventionForm({
                          ...interventionForm,
                          startTime: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endTime">Heure de fin</Label>
                    <Input
                      type="time"
                      id="endTime"
                      value={interventionForm.endTime}
                      onChange={(e) =>
                        setInterventionForm({ ...interventionForm, endTime: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    value={interventionForm.description}
                    onChange={(e) =>
                      setInterventionForm({
                        ...interventionForm,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <Button type="submit" disabled={createInterventionMutation.isPending}>
                  {createInterventionMutation.isPending
                    ? 'Création...'
                    : 'Créer intervention'}
                </Button>
              </form>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="materiel">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Matériel utilisé</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Aucun matériel assigné pour le moment
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="rapports">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Rapports</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Aucun rapport disponible
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
