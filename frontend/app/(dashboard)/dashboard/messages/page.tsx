'use client'

import { useMemo, useState } from 'react'
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

const formatTimestamp = (timestamp?: string | null) => {
  if (!timestamp) return 'Non envoye'
  const date = new Date(timestamp)
  const now = new Date()
  const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

  if (diffHours < 1) return 'Il y a moins d\'une heure'
  if (diffHours < 24) return `Il y a ${diffHours}h`
  if (diffHours < 48) return 'Hier'
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
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

export default function MessagesPage() {
  const { user, isAuthenticated } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | MessageStatus>('all')
  const [showComposer, setShowComposer] = useState(false)
  const [composeError, setComposeError] = useState<string | null>(null)
  const [composeForm, setComposeForm] = useState({
    destinataireId: '',
    sujet: '',
    contenu: '',
  })

  const currentUserId = user?.id != null ? String(user.id) : user?.email ? String(user.email) : ''
  const currentUserEmail = user?.email ? String(user.email).trim().toLowerCase() : ''
  const currentUserLabel = user?.email || currentUserId || 'Vous'
  const canSendMessages = hasPermission(user, 'messages.send')
  const canLoadRecipients = isAdminRole(user) || hasPermission(user, 'users.read')

  const {
    data: messages = [],
    isLoading,
    refetch,
  } = useQuery<CommunicationMessage[]>({
    queryKey: ['communication-messages', currentUserId],
    enabled: isAuthenticated && Boolean(currentUserId),
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const requests: Array<Promise<CommunicationMessage[]>> = [
        communicationService.getMessages({ destinataireId: currentUserId }),
        communicationService.getMessages({ expediteurId: currentUserId }),
      ]

      if (currentUserEmail && currentUserEmail !== currentUserId.toLowerCase()) {
        requests.push(communicationService.getMessages({ destinataireId: currentUserEmail }))
        requests.push(communicationService.getMessages({ expediteurId: currentUserEmail }))
      }

      const responses = await Promise.all(requests)

      const deduped = new Map<string, CommunicationMessage>()
      responses.flat().forEach((message) => deduped.set(message.id, message))

      return Array.from(deduped.values()).sort((a, b) => {
        const aTime = new Date(a.dateEnvoi || a.createdAt || 0).getTime()
        const bTime = new Date(b.dateEnvoi || b.createdAt || 0).getTime()
        return bTime - aTime
      })
    },
  })

  const { data: recipients = [] } = useQuery<AdminUser[]>({
    queryKey: ['communication-recipients', currentUserId],
    enabled: showComposer && isAuthenticated && canLoadRecipients,
    retry: false,
    queryFn: async () => {
      const response = await adminUsersService.getUsers({ limit: 200, isActive: true })
      return (response.data || []).filter((candidate) => String(candidate.id) !== currentUserId)
    },
  })

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
      setComposeForm({
        destinataireId: '',
        sujet: '',
        contenu: '',
      })
      setShowComposer(false)
      refetch()
    },
    onError: (error: any) => {
      setComposeError(error?.response?.data?.error || error?.message || 'Envoi impossible')
    },
  })

  const filteredMessages = useMemo(() => {
    return messages.filter((message) => {
      const haystack = [
        message.sujet,
        message.contenu,
        message.expediteurId,
        message.destinataireId,
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch = haystack.includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || message.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [messages, searchTerm, statusFilter])

  const stats = useMemo(() => {
    const isCurrentUserIdentifier = (value?: string | null) => {
      const normalized = String(value || '').trim().toLowerCase()
      return normalized === currentUserId.toLowerCase() || (!!currentUserEmail && normalized === currentUserEmail)
    }

    const inboxMessages = messages.filter((message) => isCurrentUserIdentifier(message.destinataireId))
    const sentMessages = messages.filter((message) => isCurrentUserIdentifier(message.expediteurId))
    const today = new Date().toISOString().slice(0, 10)

    return {
      total: messages.length,
      unread: inboxMessages.filter((message) => message.status !== 'LU' && message.status !== 'ARCHIVE').length,
      inbox: inboxMessages.length,
      sentToday: sentMessages.filter((message) => (message.dateEnvoi || message.createdAt || '').startsWith(today)).length,
      withAttachments: messages.filter((message) => Array.isArray(message.pieceJointe) && message.pieceJointe.length > 0).length,
    }
  }, [currentUserEmail, currentUserId, messages])

  const canSend = composeForm.destinataireId.trim() && composeForm.sujet.trim() && composeForm.contenu.trim()

  const prepareReply = (message: CommunicationMessage, isInbox: boolean) => {
    const replyTarget = (isInbox ? message.expediteurId : message.destinataireId || '').trim()
    if (!replyTarget) {
      setComposeError('Impossible de déterminer le destinataire de la réponse')
      return
    }

    const baseSubject = (message.sujet || '').trim()
    const subject = /^re\s*:/i.test(baseSubject) ? baseSubject : `Re: ${baseSubject || 'Message'}`
    const quotedLines = (message.contenu || '')
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n')

    setComposeError(null)
    setComposeForm({
      destinataireId: replyTarget,
      sujet: subject,
      contenu: `\n\n--- Message original ---\n${quotedLines}`.trim(),
    })
    setShowComposer(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Messagerie Interne</h1>
          <p className="text-muted-foreground">Gérez vos messages et communications internes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualiser
          </Button>
          {canSendMessages && (
            <Button onClick={() => setShowComposer((value) => !value)}>
              <Send className="mr-2 h-4 w-4" />
              {showComposer ? 'Fermer' : 'Nouveau Message'}
            </Button>
          )}
        </div>
      </div>

      {showComposer && canSendMessages && (
        <Card>
          <CardHeader>
            <CardTitle>Nouveau message</CardTitle>
            <CardDescription>Envoi simple depuis votre compte courant: {currentUserLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Destinataire</label>
                {recipients.length > 0 ? (
                  <select
                    value={composeForm.destinataireId}
                    onChange={(e) => setComposeForm((state) => ({ ...state, destinataireId: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Selectionner un destinataire</option>
                    {recipients.map((recipient) => (
                      <option key={recipient.id} value={String(recipient.id)}>
                        {recipient.firstName} {recipient.lastName} ({recipient.email})
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    value={composeForm.destinataireId}
                    onChange={(e) => setComposeForm((state) => ({ ...state, destinataireId: e.target.value }))}
                    placeholder="Identifiant utilisateur destinataire"
                  />
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Canal</label>
                <Input value="Messagerie interne" disabled />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sujet</label>
              <Input
                value={composeForm.sujet}
                onChange={(e) => setComposeForm((state) => ({ ...state, sujet: e.target.value }))}
                placeholder="Objet du message"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={composeForm.contenu}
                onChange={(e) => setComposeForm((state) => ({ ...state, contenu: e.target.value }))}
                placeholder="Rédigez votre message..."
                rows={6}
              />
            </div>

            {composeError && <div className="text-sm text-red-600">{composeError}</div>}

            <div className="flex justify-end">
              <Button onClick={() => sendMutation.mutate()} disabled={!canSend || sendMutation.isPending || !currentUserId}>
                {sendMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Envoyer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Inbox + messages envoyés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non Lus</CardTitle>
            <Inbox className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unread}</div>
            <p className="text-xs text-muted-foreground">Messages recus à traiter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Envoyés Aujourd&apos;hui</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sentToday}</div>
            <p className="text-xs text-muted-foreground">Messages expédiés ce jour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pièces Jointes</CardTitle>
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withAttachments}</div>
            <p className="text-xs text-muted-foreground">Messages avec fichiers liés</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>Liste dynamique de vos messages internes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par sujet, expéditeur, destinataire ou contenu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | MessageStatus)}
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Tous statuts</option>
              <option value="BROUILLON">Brouillon</option>
              <option value="ENVOYE">Envoyé</option>
              <option value="LU">Lu</option>
              <option value="ARCHIVE">Archivé</option>
            </select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Chargement des messages...
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
              Aucun message pour les filtres actuels.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMessages.map((message) => {
                const normalizedRecipient = String(message.destinataireId || '').trim().toLowerCase()
                const isInbox =
                  normalizedRecipient === currentUserId.toLowerCase() ||
                  (!!currentUserEmail && normalizedRecipient === currentUserEmail)
                const displayFrom = isInbox ? message.expediteurId : 'Vous'
                const displayTo = isInbox ? 'Vous' : message.destinataireId
                const canMarkAsRead = isInbox && message.status !== 'LU' && message.status !== 'ARCHIVE'
                const canArchive = message.status !== 'ARCHIVE'

                return (
                  <div
                    key={message.id}
                    className={`rounded-lg border p-4 transition-colors hover:bg-accent ${
                      canMarkAsRead ? 'border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-sm font-medium ${canMarkAsRead ? 'font-semibold' : ''}`}>{displayFrom}</span>
                          <span className="text-xs text-muted-foreground">vers {displayTo}</span>
                          <Badge variant={getStatusBadgeVariant(message.status)}>{message.status}</Badge>
                          <Badge variant="outline">{message.type}</Badge>
                          {Array.isArray(message.pieceJointe) && message.pieceJointe.length > 0 && (
                            <Paperclip className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <div className={`text-sm ${canMarkAsRead ? 'font-semibold' : 'font-medium'}`}>{message.sujet}</div>
                        <div className="line-clamp-2 text-sm text-muted-foreground">{message.contenu}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatTimestamp(message.dateEnvoi || message.createdAt)}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {canSendMessages && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => prepareReply(message, isInbox)}
                          >
                            <Reply className="mr-2 h-4 w-4" />
                            Répondre
                          </Button>
                        )}
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
                        {canArchive && (
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
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
