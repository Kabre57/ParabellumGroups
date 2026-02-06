'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Target, 
  Search, 
  Phone, 
  Calendar, 
  FileText, 
  CheckCircle, 
  XCircle,
  Plus,
  Filter,
  Users,
  TrendingUp,
  Activity,
  Eye,
  Edit,
  Trash2,
  Mail,
  PhoneCall,
  Calendar as CalendarIcon,
  StickyNote
} from 'lucide-react';
import { toast } from 'sonner';
import { commercialService } from '@/shared/api/commercial';
import type { Prospect, ProspectStage, ProspectionStats } from '@/shared/api/types';
import CreateProspectModal from '@/components/commercial/CreateProspectModal';
import EditProspectModal from '@/components/commercial/EditProspectModal';
import ViewProspectModal from '@/components/commercial/ViewProspectModal';

const workflowStages = [
  {
    id: 'preparation' as ProspectStage,
    name: 'Préparation',
    description: 'Définition de la cible & préparation des outils',
    color: 'bg-blue-100 text-blue-800',
    borderColor: 'border-blue-300',
    icon: Target
  },
  {
    id: 'research' as ProspectStage,
    name: 'Recherche & Qualification',
    description: 'Identification, qualification et priorisation',
    color: 'bg-yellow-100 text-yellow-800',
    borderColor: 'border-yellow-300',
    icon: Search
  },
  {
    id: 'contact' as ProspectStage,
    name: 'Prise de Contact',
    description: 'Email & phoning - Objectif: Fixer un RDV',
    color: 'bg-purple-100 text-purple-800',
    borderColor: 'border-purple-300',
    icon: Phone
  },
  {
    id: 'discovery' as ProspectStage,
    name: 'Entretien Découverte',
    description: 'Écoute active & diagnostic - Comprendre le besoin',
    color: 'bg-indigo-100 text-indigo-800',
    borderColor: 'border-indigo-300',
    icon: Calendar
  },
  {
    id: 'proposal' as ProspectStage,
    name: 'Proposition & Conclusion',
    description: 'Présentation offre & réponse objections',
    color: 'bg-green-100 text-green-800',
    borderColor: 'border-green-300',
    icon: FileText
  },
  {
    id: 'won' as ProspectStage,
    name: 'Client Converti',
    description: 'Prospect converti en client',
    color: 'bg-green-100 text-green-800',
    borderColor: 'border-green-300',
    icon: CheckCircle
  },
  {
    id: 'lost' as ProspectStage,
    name: 'Perdu/Nurturing',
    description: 'Analyse échec & nurturing futur',
    color: 'bg-red-100 text-red-800',
    borderColor: 'border-red-300',
    icon: XCircle
  }
];

interface StageNavigationProps {
  selectedStage: ProspectStage | 'all';
  setSelectedStage: (stage: ProspectStage | 'all') => void;
  statistics: ProspectionStats | undefined;
}

const StageNavigation = ({ selectedStage, setSelectedStage, statistics }: StageNavigationProps) => {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto">
        <button
          onClick={() => setSelectedStage('all')}
          className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
            selectedStage === 'all'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Tous ({statistics?.totalProspects || 0})
        </button>
        {workflowStages.map((stage) => {
          const Icon = stage.icon;
          const isActive = selectedStage === stage.id;
          const stageCount = statistics?.byStage?.[stage.id] || 0;

          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage.id)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                isActive
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{stage.name}</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${stage.color}`}>
                {stageCount}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

interface StatisticsDashboardProps {
  statistics: ProspectionStats | undefined;
}

const StatisticsDashboard = ({ statistics }: StatisticsDashboardProps) => {
  if (!statistics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-500">Total Prospects</div>
            <div className="text-2xl font-bold text-gray-900">
              {statistics.totalProspects || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-500">Convertis</div>
            <div className="text-2xl font-bold text-gray-900">
              {statistics.convertedProspects || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <TrendingUp className="h-8 w-8 text-purple-600" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-500">Taux de Conversion</div>
            <div className="text-2xl font-bold text-gray-900">
              {statistics.conversionRate?.toFixed(1) || 0}%
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Activity className="h-8 w-8 text-orange-600" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-500">Activités (7j)</div>
            <div className="text-2xl font-bold text-gray-900">
              {statistics.recentActivities || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProspectItemProps {
  prospect: Prospect;
  selectedStage: ProspectStage | 'all';
  onMoveProspect: (id: string, newStage: ProspectStage) => void;
  onEdit: (prospect: Prospect) => void;
  onView: (prospect: Prospect) => void;
  onDelete: (prospect: Prospect) => void;
}

const ProspectItem = ({ 
  prospect, 
  selectedStage, 
  onMoveProspect, 
  onEdit, 
  onView, 
  onDelete 
}: ProspectItemProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  const priorityColors = {
    A: 'bg-red-500',
    B: 'bg-yellow-500',
    C: 'bg-green-500'
  };

  const priorityLabels = {
    A: 'Priorité haute',
    B: 'Priorité moyenne',
    C: 'Priorité basse'
  };

  const currentStage = workflowStages.find(s => s.id === prospect.stage);
  const availableStages = workflowStages.filter(s => s.id !== prospect.stage);

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div 
                className={`h-3 w-3 rounded-full ${priorityColors[prospect.priority]}`} 
                title={priorityLabels[prospect.priority]} 
              />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-medium text-gray-900 truncate">{prospect.companyName}</h4>
              <p className="text-sm text-gray-500 truncate">
                {prospect.contactName} - {prospect.position || 'Poste non spécifié'}
              </p>
            </div>
          </div>

          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
            {prospect.email && (
              <div className="flex items-center">
                <Mail className="h-3 w-3 mr-1" />
                <span className="truncate max-w-[150px]">{prospect.email}</span>
              </div>
            )}
            {prospect.phone && (
              <div className="flex items-center">
                <PhoneCall className="h-3 w-3 mr-1" />
                <span>{prospect.phone}</span>
              </div>
            )}
            {prospect.sector && (
              <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{prospect.sector}</span>
            )}
          </div>

          {prospect.potentialValue && (
            <div className="mt-2 text-sm font-semibold text-green-600">
              Valeur potentielle: {prospect.potentialValue.toLocaleString('fr-FR')} €
            </div>
          )}

          {showDetails && (
            <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600 space-y-1">
              {prospect.notes && <p><strong>Notes:</strong> {prospect.notes}</p>}
              {prospect.activities && prospect.activities.length > 0 && (
                <p><strong>Dernière activité:</strong> {prospect.activities[0].subject}</p>
              )}
            </div>
          )}
        </div>

        <div className="ml-4 flex items-center space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Voir les détails"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => onView(prospect)}
            className="text-blue-600 hover:text-blue-900 transition-colors"
            title="Voir la fiche complète"
          >
            <FileText className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(prospect)}
            className="text-indigo-600 hover:text-indigo-900 transition-colors"
            title="Modifier"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(prospect)}
            className="text-red-600 hover:text-red-900 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowMoveMenu(!showMoveMenu)}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs font-medium"
            >
              Déplacer
            </button>
            {showMoveMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                <div className="p-2">
                  {availableStages.map((stage) => {
                    const Icon = stage.icon;
                    return (
                      <button
                        key={stage.id}
                        onClick={() => {
                          onMoveProspect(prospect.id, stage.id);
                          setShowMoveMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <Icon className="h-4 w-4" />
                        <div>
                          <div className="text-sm font-medium">{stage.name}</div>
                          <div className="text-xs text-gray-500">{stage.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {currentStage && (
        <div className="mt-2">
          <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${currentStage.color}`}>
            {currentStage.name}
          </span>
        </div>
      )}
    </div>
  );
};

export default function ProspectionWorkflowPage() {
  const [selectedStage, setSelectedStage] = useState<ProspectStage | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const queryClient = useQueryClient();

  const { data: prospectsData, isLoading: prospectsLoading } = useQuery({
    queryKey: ['prospects', selectedStage, searchQuery],
    queryFn: () => commercialService.getProspects({
      stage: selectedStage !== 'all' ? selectedStage : undefined,
      search: searchQuery || undefined,
      limit: 50
    })
  });

  const { data: statsData } = useQuery({
    queryKey: ['prospection-stats'],
    queryFn: () => commercialService.getStats()
  });

  const moveProspectMutation = useMutation({
    mutationFn: ({ id, newStage }: { id: string; newStage: ProspectStage }) =>
      commercialService.moveProspect(id, { stage: newStage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['prospection-stats'] });
      toast.success('Prospect déplacé avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors du déplacement du prospect');
    }
  });

  const deleteProspectMutation = useMutation({
    mutationFn: (id: string) => commercialService.deleteProspect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['prospection-stats'] });
      toast.success('Prospect supprimé avec succès');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Erreur lors de la suppression du prospect');
    }
  });

  const handleMoveProspect = (id: string, newStage: ProspectStage) => {
    moveProspectMutation.mutate({ id, newStage });
  };

  const handleEditProspect = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setShowEditModal(true);
  };

  const handleViewProspect = (prospect: Prospect) => {
    setSelectedProspect(prospect);
    setShowViewModal(true);
  };

  const handleDeleteProspect = (prospect: Prospect) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le prospect "${prospect.companyName}" ?`)) {
      deleteProspectMutation.mutate(prospect.id);
    }
  };

  const prospects = prospectsData?.data || [];
  const statistics = statsData?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflow de Prospection</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gérez votre pipeline de prospection du premier contact à la conversion
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Prospect
        </button>
      </div>

      <StatisticsDashboard statistics={statistics} />

      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Rechercher un prospect (nom, email, entreprise...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </button>
          </div>
        </div>

        <StageNavigation 
          selectedStage={selectedStage} 
          setSelectedStage={setSelectedStage} 
          statistics={statistics} 
        />

        <div className="p-6">
          {prospectsLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-sm text-gray-500">Chargement des prospects...</p>
            </div>
          ) : prospects.length === 0 ? (
            <div className="text-center py-8">
              <Target className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun prospect</h3>
              <p className="mt-1 text-sm text-gray-500">
                Commencez par créer votre premier prospect
              </p>
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau Prospect
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {prospects.map((prospect) => (
                <ProspectItem
                  key={prospect.id}
                  prospect={prospect}
                  selectedStage={selectedStage}
                  onMoveProspect={handleMoveProspect}
                  onEdit={handleEditProspect}
                  onView={handleViewProspect}
                  onDelete={handleDeleteProspect}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Guide des bonnes pratiques */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Guide des Bonnes Pratiques</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Target className="h-5 w-5 text-blue-600 mr-2" />
              <h4 className="font-medium text-blue-900">Phase 1 : Préparation</h4>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Définir le profil client idéal (ICP)</li>
              <li>• Préparer les outils (CRM, scripts, supports)</li>
              <li>• Fixer les objectifs quantitatifs</li>
            </ul>
          </div>

          <div className="border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Search className="h-5 w-5 text-yellow-600 mr-2" />
              <h4 className="font-medium text-yellow-900">Phase 2 : Recherche</h4>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Utiliser LinkedIn Sales Navigator</li>
              <li>• Qualifier selon critères BANT</li>
              <li>• Scorer et prioriser (A/B/C)</li>
            </ul>
          </div>

          <div className="border border-purple-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Phone className="h-5 w-5 text-purple-600 mr-2" />
              <h4 className="font-medium text-purple-900">Phase 3 : Contact</h4>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Personnaliser chaque approche</li>
              <li>• Relancer max 3 fois</li>
              <li>• Objectif: fixer un RDV qualifié</li>
            </ul>
          </div>

          <div className="border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <CalendarIcon className="h-5 w-5 text-indigo-600 mr-2" />
              <h4 className="font-medium text-indigo-900">Phase 4 : Découverte</h4>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Écoute active (80/20)</li>
              <li>• Méthode SPIN Selling</li>
              <li>• Identifier les pain points</li>
            </ul>
          </div>

          <div className="border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <FileText className="h-5 w-5 text-green-600 mr-2" />
              <h4 className="font-medium text-green-900">Phase 5 : Proposition</h4>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Proposition sur-mesure</li>
              <li>• Anticiper les objections</li>
              <li>• Closing en 2-3 étapes max</li>
            </ul>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Activity className="h-5 w-5 text-gray-600 mr-2" />
              <h4 className="font-medium text-gray-900">Suivi Post-Deal</h4>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Analyser chaque échec</li>
              <li>• Nurturing des perdus</li>
              <li>• Onboarding des gagnés</li>
            </ul>
          </div>
        </div>
      </div>

      <CreateProspectModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />

      <EditProspectModal 
        isOpen={showEditModal} 
        onClose={() => {
          setShowEditModal(false);
          setSelectedProspect(null);
        }}
        prospect={selectedProspect}
      />

      <ViewProspectModal 
        isOpen={showViewModal} 
        onClose={() => {
          setShowViewModal(false);
          setSelectedProspect(null);
        }}
        prospect={selectedProspect}
      />
    </div>
  );
}
