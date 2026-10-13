'use client';

import React, { useState } from 'react';
import { useMissions, useDeleteMission, useUpdateMissionStatus, useResyncMissionFromCrm } from '@/hooks/useTechnical';
import { Mission, technicalService } from '@/shared/api/technical';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Eye, Edit, Trash2, Calendar, MapPin, Printer, Loader2, FileText, Download, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { CreateMissionModal } from '@/components/technical/CreateMissionModal';
import { toast } from 'sonner';
import MissionOrderPrint from '@/components/printComponents/MissionOrderPrint';
import MissionPrint from '@/components/printComponents/MissionPrint';
import { useAuth } from '@/shared/hooks/useAuth';
import { getCrudVisibility } from '@/shared/action-visibility';
import { isAdminRole } from '@/shared/permissions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { statusColors, prioriteColors, useMissionsPageModel } from './page.model';

export default function MissionsPage() {  const { user, isAdmin, search, setSearch, statusFilter, setStatusFilter, showForm, setShowForm, selectedMission, setSelectedMission, printingMission, setPrintingMission, printingOrder, setPrintingOrder, orderSelection, setOrderSelection, isPrinting, setIsPrinting, missions, isLoading, error, refetch, deleteMutation, updateStatusMutation, resyncMutation, canCreate, canUpdate, canDelete, canExport, canApprove, filteredMissions, hasMissionInterventions, hasCompletedIntervention, handleDelete, handleCreate, handleEdit, handleStatusChange, handlePrint, handleResyncMission, handleDownloadPdf, handleMissionOrderPrint, formatDate, formatCurrency } = useMissionsPageModel();



  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement des missions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-2">Erreur lors du chargement des missions</p>
          <p className="text-sm text-gray-600">{error instanceof Error ? error.message : 'Erreur inconnue'}</p>
          <p className="text-xs text-gray-500 mt-2">Vérifiez que le service Technical backend est démarré</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {printingOrder && (
        <MissionOrderPrint
          mission={printingOrder.mission}
          technicien={printingOrder.technicien}
          interventionTitle={printingOrder.interventionTitle}
          onClose={() => setPrintingOrder(null)}
        />
      )}
      {printingMission && (
        <MissionPrint
          mission={printingMission}
          onClose={() => setPrintingMission(null)}
        />
      )}
      <Dialog open={!!orderSelection} onOpenChange={(open) => !open && setOrderSelection(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Choisir le technicien</DialogTitle>
            <DialogDescription>
              Un ordre de mission nominatif sera imprimé pour le technicien sélectionné.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {orderSelection?.recipients.map((recipient) => (
              <div
                key={recipient.key}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {[recipient.technicien?.prenom, recipient.technicien?.nom].filter(Boolean).join(' ') || recipient.technicien?.nom}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {recipient.technicien?.specialite?.nom || recipient.interventionTitle || 'Technicien d’intervention'}
                  </div>
                </div>
                <Button
                  onClick={() => {
                    if (!orderSelection) return;
                    setPrintingOrder({
                      mission: orderSelection.mission,
                      technicien: recipient.technicien,
                      interventionTitle: recipient.interventionTitle,
                    });
                    setOrderSelection(null);
                  }}
                >
                  Imprimer
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Missions Techniques</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestion des missions et affectations
          </p>
        </div>
        {canCreate && (
          <Button className="flex items-center gap-2" onClick={handleCreate}>
            <Plus className="w-4 h-4" />
            Nouvelle Mission
          </Button>
        )}
      </div>      {/* MODAL POUR LA CR?ATION */}
      {canCreate && showForm && !selectedMission && (
        <CreateMissionModal
          isOpen={true}
          onCreated={() => refetch()}
          onClose={() => {
            setShowForm(false);
            setSelectedMission(undefined);
          }}
        />
      )}


      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Rechercher par titre, numéro ou client..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Tous les statuts</option>
            <option value="PLANIFIEE">Planifiée</option>
            <option value="EN_COURS">En cours</option>
            <option value="TERMINEE">Terminée</option>
            <option value="ANNULEE">Annulée</option>
          </select>
        </div>
      </div>

      {/* Tableau des missions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  N° Mission
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Titre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Adresse
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Dates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Budget
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Priorité
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredMissions.map((mission: Mission) => {
                const missionHasInterventions = hasMissionInterventions(mission);
                const missionLocked = hasCompletedIntervention(mission);
                const canEditMission = canUpdate && !missionLocked;
                const canDeleteMission = canDelete && (isAdmin || (!missionHasInterventions && !missionLocked));
                const canChangeStatus = canApprove && !missionLocked;

                return (
                <tr
                  key={mission.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {mission.numeroMission}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {mission.titre}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {mission.description ? (
                        <span className="truncate max-w-xs inline-block">
                          {mission.description.substring(0, 50)}...
                        </span>
                      ) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {mission.clientNom}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {mission.clientContact || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white flex items-start">
                      <MapPin className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0 text-gray-400" />
                      <span className="truncate max-w-xs">{mission.adresse}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white flex items-center">
                      <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                      {formatDate(mission.dateDebut)}
                    </div>
                    {mission.dateFin && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        → {formatDate(mission.dateFin)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {formatCurrency(mission.budgetEstime)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={`${statusColors[mission.status]} px-2 py-1 rounded-full text-xs font-medium`}>
                      {mission.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={`${prioriteColors[mission.priorite]} px-2 py-1 rounded-full text-xs font-medium`}>
                      {mission.priorite}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/dashboard/technical/missions/${mission.id}`}>
                        <Button variant="outline" size="sm" className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Voir
                        </Button>
                      </Link>
                      {canExport && (
                        <Button
                          variant="outline"
                          size="sm"
                          title="Imprimer la fiche mission"
                          onClick={() => handlePrint(mission)}
                          disabled={isPrinting === mission.id}
                        >
                          {isPrinting === mission.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Printer className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                      {canExport && (
                        <Button
                          variant="outline"
                          size="sm"
                          title="Exporter la fiche mission en PDF"
                          onClick={() => handleDownloadPdf(mission)}
                          disabled={isPrinting === mission.id}
                        >
                          {isPrinting === mission.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                      {canExport && (
                        <Button
                          variant="outline"
                          size="sm"
                          title="Générer un ordre de mission"
                          onClick={() => handleMissionOrderPrint(mission)}
                          disabled={isPrinting === mission.id}
                        >
                          <FileText className="w-3 h-3" />
                        </Button>
                      )}
                      {canUpdate && (
                        <Button
                          variant="outline"
                          size="sm"
                          title="Resynchroniser depuis le CRM"
                          onClick={() => handleResyncMission(mission)}
                          disabled={resyncMutation.isPending}
                        >
                          <RefreshCw className={`w-3 h-3 ${resyncMutation.isPending ? 'animate-spin' : ''}`} />
                        </Button>
                      )}
                      {canEditMission && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex items-center gap-1"
                          onClick={() => handleEdit(mission)}
                        >
                          <Edit className="w-3 h-3" />
                          Modifier
                        </Button>
                      )}
                      {canDeleteMission && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(mission.id, isAdmin)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    {/* Sélecteur de statut rapide */}
                    {canChangeStatus && (
                      <div className="mt-2">
                        <select
                          value={mission.status}
                          onChange={(e) => handleStatusChange(mission.id, e.target.value)}
                          className="text-xs border rounded px-2 py-1 bg-transparent border-gray-300 dark:border-gray-600"
                        >
                          <option value="PLANIFIEE">Planifiée</option>
                          <option value="EN_COURS">En cours</option>
                          <option value="TERMINEE">Terminée</option>
                          <option value="ANNULEE">Annulée</option>
                        </select>
                      </div>
                    )}
                    {missionHasInterventions && !missionLocked && (
                      <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                        Suppression bloquée: cette mission a déjà des interventions.
                      </div>
                    )}
                    {missionLocked && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Mission verrouillée: une intervention terminée est liée à cette mission.
                      </div>
                    )}
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>

          {filteredMissions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {search || statusFilter ? 'Aucune mission ne correspond à votre recherche' : 'Aucune mission trouvée'}
              </p>
              {canCreate && (
                <Button onClick={handleCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer la première mission
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Résumé */}
        {filteredMissions.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Affichage de {filteredMissions.length} mission{filteredMissions.length > 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Planifiée</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">En cours</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Terminée</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Annulée</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {canUpdate && showForm && selectedMission && (
        <CreateMissionModal
          isOpen={true}
          item={selectedMission}
          onCreated={() => refetch()}
          onClose={() => {
            setShowForm(false);
            setSelectedMission(undefined);
          }}
        />
      )}
    </div>
  );
}
