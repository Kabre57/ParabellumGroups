import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Target, Search, Phone, Calendar, CheckCircle, XCircle, 
  ArrowRight, Users, TrendingUp, FileText, Plus, Edit, Eye,
  ChevronLeft, ChevronRight, Filter, RefreshCw, AlertCircle,
  MoreVertical, MessageSquare, Clock, Star, MapPin
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateProspectModal } from '../../components/Modals/Create/CreateProspectModal';
import { ProspectionFlowChart } from '../../components/Commercial/ProspectionFlowChart';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const prospectService = createCrudService('prospects');

const workflowStages = [
  {
    id: 'preparation',
    name: 'Préparation',
    description: 'Définition de la cible & préparation des outils',
    color: 'bg-blue-100 text-blue-800',
    icon: Target
  },
  {
    id: 'research',
    name: 'Recherche & Qualification',
    description: 'Identification, qualification et priorisation',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Search
  },
  {
    id: 'contact',
    name: 'Prise de Contact',
    description: 'Email & phoning - Objectif: Fixer un RDV',
    color: 'bg-purple-100 text-purple-800',
    icon: Phone
  },
  {
    id: 'discovery',
    name: 'Entretien Découverte',
    description: 'Écoute active & diagnostic - Comprendre le besoin',
    color: 'bg-indigo-100 text-indigo-800',
    icon: Calendar
  },
  {
    id: 'proposal',
    name: 'Proposition & Conclusion',
    description: 'Présentation offre & réponse objections',
    color: 'bg-green-100 text-green-800',
    icon: FileText
  },
  {
    id: 'won',
    name: 'Client Converti',
    description: 'Prospect converti en client',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle
  },
  {
    id: 'lost',
    name: 'Perdu/Nurturing',
    description: 'Analyse échec & nurturing futur',
    color: 'bg-red-100 text-red-800',
    icon: XCircle
  }
];

// Nouveau composant pour les actions contextuelles
const ProspectActionsMenu = ({ prospect, onMoveProspect, selectedStage, workflowStages }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const getAvailableActions = () => {
    const actions = [];
    
    switch(selectedStage) {
      case 'research':
        actions.push({
          label: 'Contacter',
          stage: 'contact',
          icon: Phone,
          color: 'text-purple-600'
        });
        break;
        
      case 'contact':
        actions.push({
          label: 'RDV Fixé',
          stage: 'discovery',
          icon: Calendar,
          color: 'text-indigo-600'
        }, {
          label: 'Rappeler plus tard',
          stage: 'research',
          icon: Clock,
          color: 'text-gray-600'
        });
        break;
        
      case 'discovery':
        actions.push({
          label: 'Proposer',
          stage: 'proposal',
          icon: FileText,
          color: 'text-green-600'
        }, {
          label: 'Non qualifié',
          stage: 'lost',
          icon: XCircle,
          color: 'text-red-600'
        });
        break;
        
      case 'proposal':
        actions.push({
          label: 'Signé',
          stage: 'won',
          icon: CheckCircle,
          color: 'text-green-600'
        }, {
          label: 'Refusé',
          stage: 'lost',
          icon: XCircle,
          color: 'text-red-600'
        });
        break;
        
      default:
        // Actions pour les autres étapes
        workflowStages.forEach(stage => {
          if (stage.id !== selectedStage) {
            actions.push({
              label: `Déplacer vers ${stage.name}`,
              stage: stage.id,
              icon: ArrowRight,
              color: 'text-gray-600'
            });
          }
        });
    }
    
    return actions;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 text-gray-400 hover:text-gray-600"
        aria-label="Actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-20 mt-1 w-48 bg-white rounded-md shadow-lg py-1 border border-gray-200">
            {getAvailableActions().map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.stage}
                  onClick={() => {
                    onMoveProspect(prospect, action.stage);
                    setIsOpen(false);
                  }}
                  className={`flex items-center px-4 py-2 text-sm w-full text-left hover:bg-gray-100 ${action.color}`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

// Nouveau composant pour l'élément prospect
const ProspectItem = ({ prospect, selectedStage, onMoveProspect, workflowStages }) => {
  const [showDetails, setShowDetails] = useState(false);
  
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {prospect.priority === 'A' ? (
                <div className="h-3 w-3 rounded-full bg-red-500" title="Priorité haute" />
              ) : prospect.priority === 'B' ? (
                <div className="h-3 w-3 rounded-full bg-yellow-500" title="Priorité moyenne" />
              ) : (
                <div className="h-3 w-3 rounded-full bg-green-500" title="Priorité basse" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-medium text-gray-900 truncate">{prospect.companyName}</h4>
              <p className="text-sm text-gray-500 truncate">{prospect.contactName} - {prospect.position}</p>
            </div>
            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
              prospect.priority === 'A' ? 'bg-red-100 text-red-800' :
              prospect.priority === 'B' ? 'bg-yellow-100 text-yellow-800' :
              'bg-green-100 text-green-800'
            }`}>
              Priorité {prospect.priority}
            </span>
          </div>
          
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center">
              <MapPin className="h-3 w-3 mr-1" />
              {prospect.address ? `${prospect.address.split(',')[0]}` : 'Adresse non renseignée'}
            </span>
            <span className="flex items-center">
              <Phone className="h-3 w-3 mr-1" />
              {prospect.phone || 'N/A'}
            </span>
            <span className="flex items-center">
              <MessageSquare className="h-3 w-3 mr-1" />
              {prospect.email || 'N/A'}
            </span>
            {prospect.estimatedValue && (
              <span className="flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                {prospect.estimatedValue.toLocaleString()} FCFA
              </span>
            )}
          </div>
          
          {showDetails && prospect.notes && (
            <div className="mt-3 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-600">{prospect.notes}</p>
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2 ml-4">
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="text-gray-400 hover:text-gray-600"
            title={showDetails ? "Masquer les détails" : "Voir les détails"}
          >
            <Eye className="h-4 w-4" />
          </button>
          
          <ProspectActionsMenu 
            prospect={prospect}
            onMoveProspect={onMoveProspect}
            selectedStage={selectedStage}
            workflowStages={workflowStages}
          />
        </div>
      </div>
    </div>
  );
};

// Nouveau composant pour la navigation entre les étapes
const StageNavigation = ({ workflowStages, selectedStage, setSelectedStage, statistics }) => {
  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto">
        {workflowStages.map((stage) => {
          const Icon = stage.icon;
          const isActive = selectedStage === stage.id;
          const stageCount = statistics.byStage?.[stage.id] || 0;
          
          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 whitespace-nowrap ${
                isActive
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{stage.name}</span>
              <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${stage.color}`}>
                {stageCount}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

// Nouveau composant pour le tableau de bord des statistiques
const StatisticsDashboard = ({ statistics }) => {
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
            <Target className="h-8 w-8 text-yellow-600" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-gray-500">En Cours</div>
            <div className="text-2xl font-bold text-gray-900">
              {statistics.activeProspects || 0}
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
            <div className="text-sm font-medium text-gray-500">Taux Conversion</div>
            <div className="text-2xl font-bold text-gray-900">
              {statistics.conversionRate || 0}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProspectionWorkflow: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [selectedStage, setSelectedStage] = useState('preparation');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFlowChart, setShowFlowChart] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const itemsPerPage = 10;

  const { data: prospects, isLoading, error: prospectsError } = useQuery({
    queryKey: ['prospects', selectedStage, currentPage, searchTerm, priorityFilter],
    queryFn: () => prospectService.getAll({ 
      stage: selectedStage, 
      limit: itemsPerPage, 
      offset: (currentPage - 1) * itemsPerPage,
      search: searchTerm,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined
    }),
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: stats, error: statsError } = useQuery({
    queryKey: ['prospection-stats'],
    queryFn: () => prospectService.getAll({ endpoint: 'stats' }),
    retry: 2,
  });

  const moveProspectMutation = useMutation({
    mutationFn: ({ id, newStage, notes }: { id: number; newStage: string; notes?: string }) =>
      fetch(`/api/v1/prospects/${id}/move`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ stage: newStage, notes })
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['prospection-stats'] });
      toast.success('Prospect déplacé avec succès');
    },
    onError: (error: Error) => {
      toast.error(`Erreur lors du déplacement: ${error.message}`);
    }
  });

  const handleMoveProspect = async (prospect: any, newStage: string) => {
    // Remplacer le prompt natif par un modal dédié
    const notes = await new Promise<string | null>((resolve) => {
      // Ici vous devriez implémenter un modal personnalisé
      // Pour cet exemple, nous utilisons encore prompt mais c'est à remplacer
      const note = prompt(`Notes pour le passage à l'étape "${workflowStages.find(s => s.id === newStage)?.name}" :`);
      resolve(note);
    });
    
    if (notes !== null) {
      try {
        await moveProspectMutation.mutateAsync({ 
          id: prospect.id, 
          newStage, 
          notes 
        });
      } catch (error) {
        // Géré par onError
      }
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset à la première page lors d'une nouvelle recherche
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['prospects'] });
    queryClient.invalidateQueries({ queryKey: ['prospection-stats'] });
    toast.info('Données actualisées');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (prospectsError || statsError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">Erreur de chargement</h3>
          <p className="mt-2 text-sm text-gray-500">
            Impossible de charger les données. Veuillez réessayer.
          </p>
          <button
            onClick={handleRefresh}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const prospectsList = prospects?.data?.prospects || [];
  const totalProspects = prospects?.data?.totalCount || 0;
  const totalPages = Math.ceil(totalProspects / itemsPerPage);
  const statistics = stats?.data || {};

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />
      
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prospection Commerciale</h1>
          <p className="text-gray-600">Gérez votre pipeline de prospection étape par étape</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowFlowChart(!showFlowChart)}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center space-x-2"
          >
            <TrendingUp className="h-4 w-4" />
            <span>{showFlowChart ? 'Masquer' : 'Afficher'} Diagramme</span>
          </button>
          {hasPermission('prospects.create') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Nouveau Prospect</span>
            </button>
          )}
          <button
            onClick={handleRefresh}
            className="bg-gray-200 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-300"
            aria-label="Actualiser les données"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Statistiques globales */}
      <StatisticsDashboard statistics={statistics} />

      {/* Filtres et recherche */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative rounded-md shadow-sm">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Rechercher un prospect..."
                aria-label="Rechercher un prospect"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </form>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              aria-label="Filtrer par priorité"
            >
              <option value="all">Toutes les priorités</option>
              <option value="A">Priorité A</option>
              <option value="B">Priorité B</option>
              <option value="C">Priorité C</option>
            </select>
          </div>
        </div>
      </div>

      {/* Diagramme de flux */}
      {showFlowChart && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Diagramme du Processus</h3>
          <ProspectionFlowChart />
        </div>
      )}

      {/* Étapes du workflow */}
      <div className="bg-white shadow rounded-lg">
        <StageNavigation 
          workflowStages={workflowStages}
          selectedStage={selectedStage}
          setSelectedStage={setSelectedStage}
          statistics={statistics}
        />

        {/* Contenu de l'étape sélectionnée */}
        <div className="p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              {workflowStages.find(s => s.id === selectedStage)?.name}
            </h3>
            <p className="text-gray-600">
              {workflowStages.find(s => s.id === selectedStage)?.description}
            </p>
          </div>

          {/* Liste des prospects pour cette étape */}
          <div className="space-y-4">
            {prospectsList.length > 0 ? (
              <>
                {prospectsList.map((prospect: any) => (
                  <ProspectItem
                    key={prospect.id}
                    prospect={prospect}
                    selectedStage={selectedStage}
                    onMoveProspect={handleMoveProspect}
                    workflowStages={workflowStages}
                  />
                ))}
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 border-t border-gray-200 pt-4">
                    <div className="text-sm text-gray-700">
                      Affichage de <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> à <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, totalProspects)}
                      </span> sur <span className="font-medium">{totalProspects}</span> prospects
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Précédent
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Suivant
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Target className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  Aucun prospect à cette étape
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {selectedStage === 'preparation' 
                    ? 'Commencez par ajouter des prospects à qualifier'
                    : 'Les prospects apparaîtront ici quand ils atteindront cette étape'
                  }
                </p>
                {selectedStage === 'preparation' && hasPermission('prospects.create') && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un prospect
                  </button>
                )}
              </div>
            )}
          </div>
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
              <li>• Identifier les prospects (LinkedIn, annuaires)</li>
              <li>• Qualifier : BANT (Budget, Authority, Need, Timeline)</li>
              <li>• Prioriser : A (chaud), B (tiède), C (froid)</li>
            </ul>
          </div>

          <div className="border border-purple-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Phone className="h-5 w-5 text-purple-600 mr-2" />
              <h4 className="font-medium text-purple-900">Phase 3 : Contact</h4>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Email d'approche personnalisé</li>
              <li>• Appel de suivi sous 48h</li>
              <li>• Objectif : Fixer un RDV découverte</li>
            </ul>
          </div>

          <div className="border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Calendar className="h-5 w-5 text-indigo-600 mr-2" />
              <h4 className="font-medium text-indigo-900">Phase 4 : Découverte</h4>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Écoute active (80% écoute, 20% parole)</li>
              <li>• Diagnostic des besoins et enjeux</li>
              <li>• Qualification du budget et timing</li>
            </ul>
          </div>

          <div className="border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <FileText className="h-5 w-5 text-green-600 mr-2" />
              <h4 className="font-medium text-green-900">Phase 5 : Proposition</h4>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Présentation solution adaptée</li>
              <li>• Traitement des objections</li>
              <li>• Techniques de closing</li>
            </ul>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center mb-3">
              <TrendingUp className="h-5 w-5 text-gray-600 mr-2" />
              <h4 className="font-medium text-gray-900">Suivi & Nurturing</h4>
            </div>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Relances programmées</li>
              <li>• Contenu de valeur (newsletters)</li>
              <li>• Maintien de la relation</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modales */}
      <CreateProspectModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['prospects'] });
          queryClient.invalidateQueries({ queryKey: ['prospection-stats'] });
        }}
      />
    </div>
  );
};