'use client'

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { adminUsersService, type AdminUser } from '@/shared/api/admin/admin.service'
import { communicationService, type CommunicationMessage, type MessageStatus } from '@/shared/api/communication'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { hasPermission, isAdminRole } from '@/shared/permissions'
import {
  Archive,
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  RefreshCw,
  Reply,
  Search,
  Send,
} from 'lucide-react'

type Conversation = {
  id: string
  participantId: string
  participantLabel: string
  messages: CommunicationMessage[]
  latestMessage: CommunicationMessage
  unreadCount: number
}

const normalizeIdentifier = (value?: string | null) => String(value || '').trim().toLowerCase()

const formatTimestamp = (timestamp?: string | null) => {
  if (!timestamp) return 'Non envoye'
  const date = new Date(timestamp)
  const now = new Date()
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffHours < 1) return 'Il y a moins d\'une heure'
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffHours < 48) return 'Hier'
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getStatusBadgeVariant = (status: MessageStatus) => {
  switch (status) {
    case 'LU':
      return 'secondary'
    case 'ARCHIVE':
      return 'outline'
    case 'ENVOYE':
      return 'default'
    default:
      return 'secondary'
  }
}

const buildQuotedBody = (message: CommunicationMessage) =>
  (message.contenu || '')
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')

export default function MessagesPage() {
  const { user, isAuthenticated } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | MessageStatus>('all')
  const [showComposer, setShowComposer] = useState(false)
  const [composeError, setComposeError] = useState<string | null>(null)
  const [selectedConversationId, setSelectedConversationId] = useState<string>('')
  const [composeForm, setComposeForm] = useState({
    destinataireId: '',
    sujet: '',
    contenu: '',
  })

  const currentUserId = user?.id != null ? String(user.id) : ''
  const currentUserEmail = user?.email ? String(user.email).trim().toLowerCase() : ''
  const currentUserLabel = user?.email || currentUserId || 'Vous'
  const canSendMessages = hasPermission(user, 'messages.send')
  const canLoadRecipients = isAdminRole(user) || hasPermission(user, 'users.read')

  const isCurrentUserIdentifier = (value?: string | null) => {
    const normalized = normalizeIdentifier(value)
    return normalized === normalizeIdentifier(currentUserId) || (!!currentUserEmail && normalized === currentUserEmail)
  }

  const {
    data: messages = [],
    isLoading,
    refetch,
  } = useQuery<CommunicationMessage[]>({
    queryKey: ['communication-messages', currentUserId, currentUserEmail],
    enabled: isAuthenticated && Boolean(currentUserId || currentUserEmail),
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const identifiers = [currentUserId, currentUserEmail].filter(Boolean)
      const requests = identifiers.flatMap((identifier) => [
        communicationService.getMessages({ destinataireId: identifier }),
        communicationService.getMessages({ expediteurId: identifier }),
      ])

      const responses = await Promise.all(requests)
      const deduped = new Map<string, CommunicationMessage>()

      responses.flat().forEach((message) => {
        deduped.set(message.id, message)
      })

      return Array.from(deduped.values()).sort((a, b) => {
        const aTime = new Date(a.dateEnvoi || a.createdAt || 0).getTime()
        const bTime = new Date(b.dateEnvoi || b.createdAt || 0).getTime()
        return bTime - aTime
      })
    },
  })

  const { data: recipients = [] } = useQuery<AdminUser[]>({
    queryKey: ['communication-recipients', currentUserId],
    enabled: isAuthenticated && canLoadRecipients,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const response = await adminUsersService.getUsers({ limit: 500, isActive: true })
      return response.data || []
    },
  })

  const userDirectory = useMemo(() => {
    const directory = new Map<string, string>()
    recipients.forEach((recipient) => {
      const label = `${recipient.firstName} ${recipient.lastName}`.trim() || recipient.email || String(recipient.id)
      directory.set(normalizeIdentifier(String(recipient.id)), recipient.email ? `${label} (${recipient.email})` : label)
      if (recipient.email) {
        directory.set(normalizeIdentifier(recipient.email), `${label} (${recipient.email})`)
      }
    })
    if (currentUserId) {
      directory.set(normalizeIdentifier(currentUserId), `${currentUserLabel} (vous)`)
    }
    if (currentUserEmail) {
      directory.set(currentUserEmail, `${currentUserLabel} (vous)`)
    }
    return directory
  }, [currentUserEmail, currentUserId, currentUserLabel, recipients])

  const conversations = useMemo<Conversation[]>(() => {
    const byParticipant = new Map<string, CommunicationMessage[]>()

    messages.forEach((message) => {
      const participantId = isCurrentUserIdentifier(message.expediteurId)
        ? String(message.destinataireId || '').trim()
        : String(message.expediteurId || '').trim()

      if (!participantId) return
      const key = normalizeIdentifier(participantId)
      const existing = byParticipant.get(key) || []
      existing.push(message)
      byParticipant.set(key, existing)
    })

    return Array.from(byParticipant.entries())
      .map(([participantKey, participantMessages]) => {
        const ordered = [...participantMessages].sort((a, b) => {
          const aTime = new Date(a.dateEnvoi || a.createdAt || 0).getTime()
          const bTime = new Date(b.dateEnvoi || b.createdAt || 0).getTime()
          return aTime - bTime
        })
        const latestMessage = ordered[ordered.length - 1]
        const participantLabel = userDirectory.get(participantKey) || ordered.find((message) => !isCurrentUserIdentifier(message.expediteurId))?.expediteurId || ordered[0]?.destinataireId || participantKey
        const unreadCount = ordered.filter(
          (message) => isCurrentUserIdentifier(message.destinataireId) && message.status !== 'LU' && message.status !== 'ARCHIVE'
        ).length

        return {
          id: participantKey,
          participantId:
            ordered.find((message) => !isCurrentUserIdentifier(message.expediteurId))?.expediteurId ||
            ordered[ordered.length - 1]?.destinataireId ||
            participantKey,
          participantLabel,
          messages: ordered,
          latestMessage,
          unreadCount,
        }
      })
      .sort((a, b) => {
        const aTime = new Date(a.latestMessage.dateEnvoi || a.latestMessage.createdAt || 0).getTime()
        const bTime = new Date(b.latestMessage.dateEnvoi || b.latestMessage.createdAt || 0).getTime()
        return bTime - aTime
      })
  }, [isCurrentUserIdentifier, messages, userDirectory])

  const filteredConversations = useMemo(() => {
    return conversations.filter((conversation) => {
      const matchesSearch =
        !searchTerm ||
        [
          conversation.participantLabel,
          ...conversation.messages.map((message) =>
            [message.sujet, message.contenu, message.expediteurId, message.destinataireId].join(' ')
          ),
        ]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' ||
        conversation.messages.some((message) => message.status === statusFilter)

      return matchesSearch && matchesStatus
    })
  }, [conversations, searchTerm, statusFilter])

  useEffect(() => {
    if (!filteredConversations.length) {
      setSelectedConversationId('')
      return
    }

    if (!selectedConversationId || !filteredConversations.some((conversation) => conversation.id === selectedConversationId)) {
      setSelectedConversationId(filteredConversations[0].id)
    }
  }, [filteredConversations, selectedConversationId])

  const selectedConversation = useMemo(
    () => filteredConversations.find((conversation) => conversation.id === selectedConversationId) || filteredConversations[0] || null,
    [filteredConversations, selectedConversationId]
  )

  const stats = useMemo(() => {
    const inboxMessages = messages.filter((message) => isCurrentUserIdentifier(message.destinataireId))
    const sentMessages = messages.filter((message) => isCurrentUserIdentifier(message.expediteurId))
    const today = new Date().toISOString().slice(0, 10)

    return {
      total: messages.length,
      unread: inboxMessages.filter((message) => message.status !== 'LU' && message.status !== 'ARCHIVE').length,
      sentToday: sentMessages.filter((message) => (message.dateEnvoi || message.createdAt || '').startsWith(today)).length,
      withAttachments: messages.filter((message) => Array.isArray(message.pieceJointe) && message.pieceJointe.length > 0).length,
    }
  }, [isCurrentUserIdentifier, messages])

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => communicationService.markMessageAsRead(id),
    onSuccess: () => refetch(),
  })

  const archiveMutation = useMutation({
    mutationFn: (id: string) => communicationService.archiveMessage(id),
    onSuccess: () => refetch(),
  })

  const sendMutation = useMutation({
    mutationFn: async () => {
      setComposeError(null)
      const message = await communicationService.createMessage({
        expediteurId: currentUserId,
        destinataireId: composeForm.destinataireId.trim(),
        sujet: composeForm.sujet.trim(),
        contenu: composeForm.contenu.trim(),
        type: 'NOTIFICATION',
      })
      return communicationService.sendMessage(message.id)
    },
    onSuccess: () => {
      const nextConversationId = normalizeIdentifier(composeForm.destinataireId)
      setComposeForm({
        destinataireId: '',
        sujet: '',
        contenu: '',
      })
      setShowComposer(false)
      setSelectedConversationId(nextConversationId)
      refetch()
    },
    onError: (error: any) => {
      setComposeError(error?.response?.data?.error || error?.message || 'Envoi impossible')
    },
  })

  const openComposerForConversation = (conversation?: Conversation, seedMessage?: CommunicationMessage) => {
    const baseSubject = seedMessage?.sujet?.trim() || conversation?.latestMessage.sujet?.trim() || ''
    const subject = baseSubject ? (/^re\s*:/i.test(baseSubject) ? baseSubject : `Re: ${baseSubject}`) : ''
    const quotedBody = seedMessage ? `\n\n--- Message original ---\n${buildQuotedBody(seedMessage)}` : ''

    setComposeError(null)
    setComposeForm({
      destinataireId: conversation?.participantId || '',
      sujet: subject,
      contenu: quotedBody.trim(),
    })
    setShowComposer(true)
  }

  const canSend =
    canSendMessages &&
    composeForm.destinataireId.trim() &&
    composeForm.sujet.trim() &&
    composeForm.contenu.trim()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Messagerie Interne</h1>
          <p className="text-muted-foreground">Gérez vos messages et communications internes par conversation</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualiser
          </Button>
          {canSendMessages && (
            <Button
              onClick={() => {
                setComposeError(null)
                setComposeForm({ destinataireId: '', sujet: '', contenu: '' })
                setShowComposer((value) => !value)
              }}
            >
              <Send className="mr-2 h-4 w-4" />
              {showComposer ? 'Fermer' : 'Nouveau Message'}
            </Button>
          )}
        </div>
      </div>

      {showComposer && canSendMessages && (
        <Card>
          <CardHeader>
            <CardTitle>{composeForm.destinataireId ? 'Répondre' : 'Nouveau message'}</CardTitle>
            <CardDescription>Envoi depuis votre compte courant: {currentUserLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Destinataire</label>
                {recipients.length > 0 ? (
                  <select
                    value={composeForm.destinataireId}
                    onChange={(event) =>
                      setComposeForm((state) => ({ ...state, destinataireId: event.target.value }))
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selectionner un destinataire</option>
                    {recipients
                      .filter((recipient) => String(recipient.id) !== currentUserId)
                      .map((recipient) => (
                        <option key={recipient.id} value={String(recipient.id)}>
                          {recipient.firstName} {recipient.lastName} ({recipient.email})
                        </option>
                      ))}
                  </select>
                ) : (
                  <Input
                    value={composeForm.destinataireId}
                    onChange={(event) =>
                      setComposeForm((state) => ({ ...state, destinataireId: event.target.value }))
                    }
                    placeholder="Identifiant ou email du destinataire"
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sujet</label>
                <Input
                  value={composeForm.sujet}
                  onChange={(event) => setComposeForm((state) => ({ ...state, sujet: event.target.value }))}
                  placeholder="Objet du message"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                rows={6}
                value={composeForm.contenu}
                onChange={(event) => setComposeForm((state) => ({ ...state, contenu: event.target.value }))}
                placeholder="Votre message..."
              />
            </div>

            {composeError && <p className="text-sm text-red-600">{composeError}</p>}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowComposer(false)}>
                Annuler
              </Button>
              <Button type="button" onClick={() => sendMutation.mutate()} disabled={!canSend || sendMutation.isPending}>
                {sendMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Envoyer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Conversations</p>
              <p className="mt-2 text-3xl font-bold">{filteredConversations.length}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Messages non lus</p>
              <p className="mt-2 text-3xl font-bold">{stats.unread}</p>
            </div>
            <Inbox className="h-8 w-8 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Envoyés aujourd&apos;hui</p>
              <p className="mt-2 text-3xl font-bold">{stats.sentToday}</p>
            </div>
            <Send className="h-8 w-8 text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm text-muted-foreground">Pièces jointes</p>
              <p className="mt-2 text-3xl font-bold">{stats.withAttachments}</p>
            </div>
            <Paperclip className="h-8 w-8 text-primary" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="xl:sticky xl:top-6">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <CardDescription>Une conversation par utilisateur</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Rechercher un interlocuteur ou un sujet"
                className="pl-9"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | MessageStatus)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Tous les statuts</option>
              <option value="ENVOYE">Envoyés</option>
              <option value="LU">Lus</option>
              <option value="ARCHIVE">Archivés</option>
            </select>

            <div className="space-y-2">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={`w-full rounded-lg border p-3 text-left transition ${
                    selectedConversation?.id === conversation.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{conversation.participantLabel}</p>
                      <p className="truncate text-sm text-muted-foreground">{conversation.latestMessage.sujet || 'Sans sujet'}</p>
                    </div>
                    {conversation.unreadCount > 0 && <Badge>{conversation.unreadCount}</Badge>}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{conversation.latestMessage.contenu}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatTimestamp(conversation.latestMessage.dateEnvoi || conversation.latestMessage.createdAt)}
                  </p>
                </button>
              ))}

              {!isLoading && filteredConversations.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Aucune conversation pour les filtres actuels.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>
                  {selectedConversation ? `Conversation avec ${selectedConversation.participantLabel}` : 'Conversation'}
                </CardTitle>
                <CardDescription>
                  {selectedConversation
                    ? `${selectedConversation.messages.length} message(s) dans ce fil`
                    : 'Sélectionnez une conversation'}
                </CardDescription>
              </div>
              {selectedConversation && canSendMessages && (
                <Button variant="outline" onClick={() => openComposerForConversation(selectedConversation)}>
                  <Reply className="mr-2 h-4 w-4" />
                  Répondre
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {selectedConversation ? (
              <div className="space-y-4">
                {selectedConversation.messages.map((message) => {
                  const isInboxMessage = isCurrentUserIdentifier(message.destinataireId)
                  const canMarkAsRead = isInboxMessage && message.status !== 'LU' && message.status !== 'ARCHIVE'
                  const alignment = isInboxMessage ? 'items-start' : 'items-end'
                  const bubbleStyle = isInboxMessage
                    ? 'bg-muted text-foreground'
                    : 'bg-primary text-primary-foreground'

                  return (
                    <div key={message.id} className={`flex flex-col ${alignment}`}>
                      <div className={`w-full max-w-3xl rounded-lg p-4 ${bubbleStyle}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium">
                              {isInboxMessage ? selectedConversation.participantLabel : 'Vous'}
                            </p>
                            <p className="text-xs opacity-80">
                              {formatTimestamp(message.dateEnvoi || message.createdAt)}
                            </p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(message.status)}>{message.status}</Badge>
                        </div>

                        <p className="mt-3 font-semibold">{message.sujet || 'Sans sujet'}</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.contenu}</p>

                        {message.pieceJointe?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {message.pieceJointe.map((piece) => (
                              <Badge key={piece} variant="outline" className="bg-background/80">
                                <Paperclip className="mr-1 h-3 w-3" />
                                {piece}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-2 flex gap-2">
                        {canMarkAsRead && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsReadMutation.mutate(message.id)}
                            disabled={markAsReadMutation.isPending}
                          >
                            Marquer lu
                          </Button>
                        )}
                        {message.status !== 'ARCHIVE' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => archiveMutation.mutate(message.id)}
                            disabled={archiveMutation.isPending}
                          >
                            <Archive className="mr-2 h-4 w-4" />
                            Archiver
                          </Button>
                        )}
                        {canSendMessages && (
                          <Button variant="ghost" size="sm" onClick={() => openComposerForConversation(selectedConversation, message)}>
                            <Reply className="mr-2 h-4 w-4" />
                            Répondre
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
                Sélectionnez une conversation pour afficher le fil.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
