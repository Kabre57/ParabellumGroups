'use client';

import React from 'react';
import { useMissions, useInterventions, useTechniciens, useMaterielAlertes } from '@/hooks/useTechnical';
import { Mission, Intervention, Technicien, Materiel } from '@/shared/api/services/technical';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Wrench, Users, ClipboardList, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function TechnicalAnalyticsPage() {
  const { data: missions = [] } = useMissions({ pageSize: 100 });
  const { data: interventions = [] } = useInterventions({ pageSize: 100 });
  const { data: techniciens = [] } = useTechniciens({ pageSize: 100 });
  const { data: alertes = [] } = useMaterielAlertes();

  const stats = {
    totalMissions: missions.length,
    missionsActives: missions.filter((m: Mission) => m.status === 'EN_COURS').length,
    totalInterventions: interventions.length,
    interventionsTerminees: interventions.filter((i: Intervention) => i.status === 'TERMINEE').length,
    techniciensDisponibles: techniciens.filter((t: Technicien) => t.status === 'AVAILABLE').length,
    alertesMateriel: alertes.length,
  };

  const missionsByStatus = missions.reduce((acc: any, mission: Mission) => {
    acc[mission.status] = (acc[mission.status] || 0) + 1;
    return acc;
  }, {});

  const missionStatusData = Object.entries(missionsByStatus).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value,
  }));

  const interventionsByStatus = interventions.reduce((acc: any, intervention: Intervention) => {
    acc[intervention.status] = (acc[intervention.status] || 0) + 1;
    return acc;
  }, {});

  const interventionStatusData = Object.entries(interventionsByStatus).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value,
  }));

  const techniciensBySpecialite = techniciens.reduce((acc: any, tech: Technicien) => {
    const specialite = tech.specialite?.nom || 'Non spécifié';
    acc[specialite] = (acc[specialite] || 0) + 1;
    return acc;
  }, {});

  const specialiteData = Object.entries(techniciensBySpecialite)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 10);

  const techniciensByStatus = techniciens.reduce((acc: any, tech: Technicien) => {
    acc[tech.status] = (acc[tech.status] || 0) + 1;
    return acc;
  }, {});

  const techStatusData = Object.entries(techniciensByStatus).map(([name, value]) => ({
    name: name === 'AVAILABLE' ? 'Disponible' : name === 'BUSY' ? 'Occupé' : name === 'ON_LEAVE' ? 'En congé' : 'Inactif',
    value,
  }));

  const interventionsByMonth = interventions.reduce((acc: any, intervention: Intervention) => {
    const month = intervention.dateDebut?.slice(0, 7) || 'Inconnu';
    if (!acc[month]) {
      acc[month] = { count: 0, completed: 0 };
    }
    acc[month].count += 1;
    if (intervention.status === 'TERMINEE') {
      acc[month].completed += 1;
    }
    return acc;
  }, {});

  const monthlyData = Object.entries(interventionsByMonth)
    .map(([month, data]: [string, any]) => ({
      month,
      total: data.count,
      completed: data.completed,
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Tableau de Bord Technique</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Vue d'ensemble des activités techniques</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Missions Totales</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalMissions}</p>
              <p className="text-sm text-green-600 mt-1">{stats.missionsActives} en cours</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <ClipboardList className="w-8 h-8 text-blue-600 dark:text-blue-300" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Interventions</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.totalInterventions}</p>
              <p className="text-sm text-green-600 mt-1">{stats.interventionsTerminees} terminées</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <Wrench className="w-8 h-8 text-green-600 dark:text-green-300" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Techniciens</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{techniciens.length}</p>
              <p className="text-sm text-green-600 mt-1">{stats.techniciensDisponibles} disponibles</p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <Users className="w-8 h-8 text-purple-600 dark:text-purple-300" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Taux de Complétion</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.totalInterventions > 0
                  ? Math.round((stats.interventionsTerminees / stats.totalInterventions) * 100)
                  : 0}
                %
              </p>
              <p className="text-sm text-gray-500 mt-1">Interventions terminées</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-300" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Alertes Matériel</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{stats.alertesMateriel}</p>
              <p className="text-sm text-orange-600 mt-1">Stock faible</p>
            </div>
            <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
              <AlertTriangle className="w-8 h-8 text-orange-600 dark:text-orange-300" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Durée Moy. Intervention</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {interventions.filter((i: Intervention) => i.dureeReelle).length > 0
                  ? Math.round(
                      interventions
                        .filter((i: Intervention) => i.dureeReelle)
                        .reduce((sum: number, i: Intervention) => sum + (i.dureeReelle || 0), 0) /
                        interventions.filter((i: Intervention) => i.dureeReelle).length
                    )
                  : 0}
                h
              </p>
              <p className="text-sm text-gray-500 mt-1">Durée réelle moyenne</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Clock className="w-8 h-8 text-blue-600 dark:text-blue-300" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Répartition des Missions</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={missionStatusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {missionStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Statut des Interventions</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={interventionStatusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Techniciens par Spécialité
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={specialiteData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Évolution Mensuelle
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" />
              <Line type="monotone" dataKey="completed" stroke="#10b981" name="Terminées" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Disponibilité des Techniciens
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {techStatusData.map((item, index) => (
            <div key={index} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{item.value}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.name}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
