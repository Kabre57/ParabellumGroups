// src/pages/Messages/MessageList.tsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createCrudService } from '../../services/api';
import { Search, Plus, Send, Filter, Mail, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import type { PaginatedMessagesResponse, Message } from '../../types/messages';

const messageService = createCrudService('messages');

export const MessageList: React.FC = () => {
  const { hasPermission } = useAuth();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [type, setType] = useState('');

  const { data, isLoading, error } = useQuery<PaginatedMessagesResponse>({
    queryKey: ['messages', page, limit, search, status, priority, type],
    queryFn: () =>
      messageService.getAll({
        page,
        limit,
        search: search || undefined,
        status: status || undefined,
        priority: priority || undefined,
        type: type || undefined,
      }),
  });

  if (isLoading) return <div className="p-6">Chargement…</div>;
  if (error) return <div className="p-6 text-red-600">Erreur de chargement</div>;

  const messages: Message[] = data?.data?.messages ?? [];
  const pagination = data?.data?.pagination;

  return (
    <div className="space-y-4">
      {/* Header + filtres */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Messagerie</h1>
        {hasPermission('messages.create') && (
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md flex items-center space-x-2">
            <Plus className="h-4 w-4" />
            <span>Nouveau</span>
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 border rounded-md px-3 py-2"
              placeholder="Rechercher (sujet, contenu)…"
            />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="border rounded-md px-3 py-2">
            <option value="">Tous statuts</option>
            <option value="unread">Non lu</option>
            <option value="read">Lu</option>
            <option value="replied">Répondu</option>
            <option value="archived">Archivé</option>
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="border rounded-md px-3 py-2">
            <option value="">Toutes priorités</option>
            <option value="low">Basse</option>
            <option value="normal">Normale</option>
            <option value="high">Haute</option>
            <option value="urgent">Urgente</option>
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className="border rounded-md px-3 py-2">
            <option value="">Tous types</option>
            <option value="internal">Interne</option>
            <option value="external">Externe</option>
            <option value="system">Système</option>
          </select>
        </div>
      </div>

      {/* Liste */}
      <div className="bg-white rounded-lg shadow divide-y">
        {messages.map((m) => (
          <div key={m.id} className="p-4 flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-medium">
                  {m.subject ?? '(Sans sujet)'}
                  {m.priority === 'urgent' && (
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Urgent</span>
                  )}
                </div>
                <div className="text-sm text-gray-600 line-clamp-2">{m.body}</div>
                <div className="text-xs text-gray-500 mt-1">
                  De {m.sender?.firstName} {m.sender?.lastName} → {m.recipient?.firstName} {m.recipient?.lastName} •{' '}
                  {new Date(m.createdAt || m.sentAt).toLocaleString('fr-FR')}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {m.status === 'unread' && <span className="text-xs text-indigo-600">non lu</span>}
              <button className="p-2 rounded hover:bg-gray-100" title="Supprimer (exemple)">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {messages.length === 0 && <div className="p-6 text-gray-500">Aucun message</div>}
      </div>

      {/* Pagination simple */}
      {pagination && (
        <div className="flex items-center justify-end space-x-2">
          <button
            disabled={pagination.page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Précédent
          </button>
          <div className="text-sm">
            Page {pagination.page} / {pagination.totalPages}
          </div>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
};
