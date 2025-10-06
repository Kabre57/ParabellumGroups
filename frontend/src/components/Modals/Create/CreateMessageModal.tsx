import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Send,
  Paperclip,
  Upload,
  Loader2,
  User as UserIcon,
  AlertCircle,
} from 'lucide-react';
import { createCrudService } from '../../../services/api';
import { useAuth } from '../../../hooks/useAuth';

// ↓ Types conseillés (identiques à ceux proposés dans src/types/messages.ts)
type MessagePriority = 'low' | 'normal' | 'high' | 'urgent';
type MessageType = 'internal' | 'external' | 'system';

interface UsersListResponse {
  success: boolean;
  data: {
    users?: Array<{ id: number; firstName: string; lastName: string; email: string }>;
    items?: Array<{ id: number; firstName: string; lastName: string; email: string }>;
  };
}

interface CreateMessagePayload {
  recipientId: number;
  subject?: string | null;
  content: string; // côté backend, ce champ sera copié dans "body"
  priority?: MessagePriority;
  type?: MessageType;
  attachments?: Array<{
    filename: string;
    url: string;
    size?: number | null;
    mimeType?: string | null;
  }>;
  parentMessageId?: number | null;
}

interface CreateMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Optionnel : forcer un destinataire (ex: depuis une fiche user) */
  defaultRecipientId?: number;
  /** Optionnel : réponse à un message (thread) */
  parentMessageId?: number;
}

/**
 * IMPORTANT :
 * - Le backend attend { content } (qui sera stocké dans Message.body)
 * - Le backend gère attachments?: { filename, url, size, mimeType }
 * - Si tu as un service d'upload, branche-le dans handleFilesUpload()
 */
const messageService = createCrudService('messages');
const userService = createCrudService('users');

// Mise à ON si tu as un endpoint d'upload accessible ici
const UPLOADS_ENABLED = false;

export const CreateMessageModal: React.FC<CreateMessageModalProps> = ({
  isOpen,
  onClose,
  defaultRecipientId,
  parentMessageId,
}) => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // --- État du formulaire ---
  const [recipientId, setRecipientId] = useState<number | ''>(defaultRecipientId ?? '');
  const [subject, setSubject] = useState<string>('');
  const [content, setContent] = useState<string>(''); // => sera mappé vers body côté API
  const [priority, setPriority] = useState<MessagePriority>('normal');
  const [type, setType] = useState<MessageType>('internal');

  // Fichiers sélectionnés dans l'input (avant upload)
  const [files, setFiles] = useState<File[]>([]);
  // Attachements prêts à l’envoi (URL + metadata)
  const [attachments, setAttachments] = useState<CreateMessagePayload['attachments']>([]);

  // --- Chargement des utilisateurs (sélecteur destinataire) ---
  const { data: usersResp, isLoading: isUsersLoading } = useQuery<UsersListResponse>({
    queryKey: ['users', 'list-for-messages'],
    queryFn: () => userService.getAll({ limit: 100 }),
    enabled: isOpen, // on charge seulement si la modale est ouverte
  });

  // On s'adapte à la réponse (parfois data.users, parfois data.items)
  const users = useMemo(() => {
    const list = usersResp?.data?.users ?? usersResp?.data?.items ?? [];
    // Tri simple par nom pour UX
    return [...list].sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'fr'),
    );
  }, [usersResp]);

  // Focus auto sur le sujet à l’ouverture
  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => {
      dialogRef.current?.querySelector<HTMLInputElement>('input[name="subject"]')?.focus();
    }, 50);
  }, [isOpen]);

  // Fermer avec ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // --- Upload de fichiers (optionnel) ---
  /**
   * Si tu as un endpoint d’upload (ex: /api/v1/uploads), implémente-le ici :
   * - Uploade chaque File, récupère { url, filename, size, mimeType }
   * - setAttachments([...])
   * Dans l’immédiat, si UPLOADS_ENABLED=false, on ne tente pas d’upload :
   * - On ignore les fichiers sélectionnés et n’envoie pas d’attachements,
   *   ou on peut créer des data URLs (pas idéal en prod).
   */
  const handleFilesUpload = async (selected: File[]) => {
    if (!UPLOADS_ENABLED) {
      // Option 1 : ignorer (pas d’attachments)
      setAttachments([]);
      return;

      // Option 2 (démo) : fabriquer des data URLs (souvent non souhaité côté backend)
      // const dataUrls = await Promise.all(
      //   selected.map((file) => fileToDataURL(file).then((url) => ({
      //     filename: file.name,
      //     url, // data URL
      //     size: file.size,
      //     mimeType: file.type || null,
      //   })))
      // );
      // setAttachments(dataUrls);
      // return;
    }

    // EXEMPLE pour brancher un uploadService :
    // const uploaded = await Promise.all(
    //   selected.map(async (file) => {
    //     const res = await uploadService.create({ file });
    //     return {
    //       filename: file.name,
    //       url: res.data.url,
    //       size: file.size,
    //       mimeType: file.type || null,
    //     };
    //   })
    // );
    // setAttachments(uploaded);
  };

  const onSelectFiles: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles(selected);
    await handleFilesUpload(selected);
  };

  // --- Mutation: créer le message ---
  const { mutate: createMessage, isPending, error: createError } = useMutation({
    mutationFn: async (payload: CreateMessagePayload) => {
      return messageService.create(payload);
    },
    onSuccess: () => {
      // Invalider la liste → refresh
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      // Reset du formulaire
      setSubject('');
      setContent('');
      setPriority('normal');
      setType('internal');
      setFiles([]);
      setAttachments([]);
      // Fermer
      onClose();
    },
  });

  const onSubmit: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!recipientId || !content.trim()) return;

    const payload: CreateMessagePayload = {
      recipientId: Number(recipientId),
      subject: subject?.trim() || null,
      content: content.trim(), // ← côté API, mappé vers "body"
      priority,
      type,
      // On n’envoie des attachments que si on a bien des URLs prêtes
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
      parentMessageId: parentMessageId ?? null,
    };

    createMessage(payload);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="create-message-title"
      ref={dialogRef}
      onMouseDown={(e) => {
        // fermer au clic sur l’overlay
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 id="create-message-title" className="text-lg font-semibold">
            Nouveau message
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit}>
          <div className="px-5 py-4 space-y-4">
            {/* Destinataire */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destinataire</label>
              <div className="relative">
                <UserIcon className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  className="w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={recipientId}
                  onChange={(e) => setRecipientId(Number(e.target.value))}
                  required
                  disabled={!!defaultRecipientId || isUsersLoading}
                >
                  {!defaultRecipientId && <option value="">— Choisir un utilisateur —</option>}
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.firstName} {u.lastName} — {u.email}
                    </option>
                  ))}
                </select>
              </div>
              {isUsersLoading && (
                <div className="mt-2 text-sm text-gray-500 flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Chargement des utilisateurs…
                </div>
              )}
            </div>

            {/* Sujet */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sujet (optionnel)</label>
              <input
                name="subject"
                type="text"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Compte rendu de réunion"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {/* Contenu */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea
                className="w-full px-3 py-2 border rounded-md h-32 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tape ton message ici…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Astuce : <code>Ctrl+Enter</code> pour envoyer.
              </p>
            </div>

            {/* Métadonnées (priorité/type) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
                <select
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as MessagePriority)}
                >
                  <option value="low">Basse</option>
                  <option value="normal">Normale</option>
                  <option value="high">Haute</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={type}
                  onChange={(e) => setType(e.target.value as MessageType)}
                >
                  <option value="internal">Interne</option>
                  <option value="external">Externe</option>
                  <option value="system">Système</option>
                </select>
              </div>
            </div>

            {/* Pièces jointes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pièces jointes</label>

              <div className="flex items-center gap-3">
                <label className="inline-flex items-center px-3 py-2 border rounded-md cursor-pointer hover:bg-gray-50">
                  <Upload className="h-4 w-4 mr-2" />
                  <span>Sélectionner des fichiers</span>
                  <input
                    type="file"
                    className="sr-only"
                    multiple
                    onChange={onSelectFiles}
                  />
                </label>

                {files.length > 0 && (
                  <span className="text-sm text-gray-600">
                    {files.length} fichier{files.length > 1 ? 's' : ''} sélectionné{files.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {/* Aperçu simple */}
              {files.length > 0 && (
                <div className="mt-2 bg-gray-50 border rounded-md p-2 max-h-40 overflow-auto">
                  <ul className="space-y-1">
                    {files.map((f, idx) => (
                      <li key={`${f.name}-${idx}`} className="text-sm text-gray-700 flex items-center">
                        <Paperclip className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="truncate">{f.name}</span>
                        <span className="ml-2 text-xs text-gray-500">({Math.round(f.size / 1024)} Ko)</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!UPLOADS_ENABLED && (
                <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 flex items-start">
                  <AlertCircle className="h-4 w-4 mr-2 mt-0.5" />
                  <div>
                    Les uploads ne sont pas activés dans cette modale. Branche un service d’upload dans
                    <code className="mx-1">handleFilesUpload()</code> si tu veux envoyer de vraies pièces jointes.
                  </div>
                </div>
              )}
            </div>

            {/* Erreur mutation */}
            {createError && (
              <div className="bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2 text-sm">
                Échec de l’envoi. Vérifie ta connexion ou réessaie plus tard.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md border hover:bg-gray-50"
              disabled={isPending}
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 inline-flex items-center gap-2 disabled:opacity-60"
              disabled={!recipientId || !content.trim() || isPending || !hasPermission('messages.create')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  (e.currentTarget.form as HTMLFormElement)?.requestSubmit();
                }
              }}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Envoyer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

