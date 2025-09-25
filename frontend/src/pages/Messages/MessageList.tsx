import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Filter, 
  Plus, 
  Eye, 
  Reply,
  Archive,
  Star,
  Clock,
  User,
  Paperclip
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { createCrudService } from '../../services/api';
import { CreateMessageModal } from '../../components/Modals/Create/CreateMessageModal';

const messageService = createCrudService('messages');

const priorityConfig = {
  low: { label: 'Basse', color: 'bg-gray-100 text-gray-800' },
  normal: { label: 'Normale', color: 'bg-blue-100 text-blue-800' },
  high: { label: 'Haute', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-800' }
};

const statusConfig = {
  unread: { label: 'Non lu', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  read: { label: 'Lu', color: 'bg-blue-100 text-blue-800', icon: Eye },
  replied: { label: 'Répondu', color: 'bg-green-100 text-green-800', icon: Reply },
  archived: { label: 'Archivé', color: 'bg-gray-100 text-gray-800', icon: Archive }
};

export const MessageList: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showMessageDetail, setShowMessageDetail] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['messages', page, search, statusFilter, priorityFilter],
    queryFn: () => messageService.getAll({ 
      page, 
      limit: 10, 
      search, 
      status: statusFilter,
      priority: priorityFilter
    })
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => 
      fetch(`/api/v1/messages/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  const archiveMessageMutation = useMutation({
    mutationFn: (id: number) => 
      fetch(`/api/v1/messages/${id}/archive`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      }).then(res => res.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded">
        Erreur lors du chargement des messages
      </div>
    );
  }

  const messages = data?.data?.messages || [];
  const pagination = data?.data?.pagination;

  const handleViewMessage = (message: any) => {
    setSelectedMessage(message);
    setShowMessageDetail(true);
    
    // Marquer comme lu si non lu
    if (message.status === 'unread') {
      markAsReadMutation.mutate(message.id);
    }
  };

  const handleArchiveMessage = async (message: any) => {
    try {
      await archiveMessageMutation.mutateAsync(message.id);
    } catch (error) {
      console.error('Erreur lors de l\'archivage:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
          <p className="text-gray-600 dark:text-gray-300">Gérez vos communications internes et externes</p>
        </div>
        {hasPermission('messages.create') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau Message</span>
          </button>
        )}
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MessageSquare className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Messages</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {messages.length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Non lus</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {messages.filter((m: any) => m.status === 'unread').length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Reply className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Répondus</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {messages.filter((m: any) => m.status === 'replied').length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Star className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Prioritaires</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {messages.filter((m: any) => ['high', 'urgent'].includes(m.priority)).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Rechercher un message..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(statusConfig).map(([status, config]) => (
              <option key={status} value={status}>{config.label}</option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Toutes les priorités</option>
            {Object.entries(priorityConfig).map(([priority, config]) => (
              <option key={priority} value={priority}>{config.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Liste des messages */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {messages.map((message: any) => {
            const statusInfo = statusConfig[message.status as keyof typeof statusConfig];
            const priorityInfo = priorityConfig[message.priority as keyof typeof priorityConfig];
            const StatusIcon = statusInfo?.icon || Clock;
            
            return (
              <div 
                key={message.id} 
                className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                  message.status === 'unread' ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
                onClick={() => handleViewMessage(message)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                        <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className={`text-sm font-medium text-gray-900 dark:text-white ${
                          message.status === 'unread' ? 'font-bold' : ''
                        }`}>
                          {message.sender?.firstName} {message.sender?.lastName}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${priorityInfo?.color}`}>
                          {priorityInfo?.label}
                        </span>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${statusInfo?.color}`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo?.label}
                        </span>
                      </div>
                      <p className={`text-sm text-gray-900 dark:text-white mt-1 ${
                        message.status === 'unread' ? 'font-semibold' : ''
                      }`}>
                        {message.subject}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {message.content?.substring(0, 100)}...
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{new Date(message.createdAt).toLocaleString()}</span>
                        {message.attachments?.length > 0 && (
                          <span className="flex items-center">
                            <Paperclip className="h-3 w-3 mr-1" />
                            {message.attachments.length} pièce(s) jointe(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleArchiveMessage(message);
                      }}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Archiver"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Logique pour marquer comme favori
                      }}
                      className="text-gray-400 hover:text-yellow-500"
                      title="Marquer comme favori"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Précédent
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                Suivant
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Affichage de{' '}
                  <span className="font-medium">{(page - 1) * 10 + 1}</span>
                  {' '}à{' '}
                  <span className="font-medium">
                    {Math.min(page * 10, pagination.total)}
                  </span>
                  {' '}sur{' '}
                  <span className="font-medium">{pagination.total}</span>
                  {' '}résultats
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pageNum === page
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900 dark:border-blue-400 dark:text-blue-300'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-600'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Message vide */}
      {messages.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">Aucun message</h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Vous n'avez aucun message pour le moment.
          </p>
          {hasPermission('messages.create') && (
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Envoyer un message
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      <CreateMessageModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />

      {/* Détail du message */}
      {showMessageDetail && selectedMessage && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {selectedMessage.subject}
              </h3>
              <button 
                onClick={() => setShowMessageDetail(false)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="px-6 py-4">
              <div className="mb-4">
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>De: {selectedMessage.sender?.firstName} {selectedMessage.sender?.lastName}</span>
                  <span>•</span>
                  <span>{new Date(selectedMessage.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                  {selectedMessage.content}
                </p>
              </div>
              {selectedMessage.attachments?.length > 0 && (
                <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Pièces jointes:</h4>
                  <div className="space-y-2">
                    {selectedMessage.attachments.map((attachment: any, index: number) => (
                      <div key={index} className="flex items-center space-x-2 text-sm">
                        <Paperclip className="h-4 w-4 text-gray-400" />
                        <a 
                          href={attachment.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {attachment.name}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
              <button
                onClick={() => setShowMessageDetail(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Fermer
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                Répondre
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};