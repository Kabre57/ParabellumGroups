'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { communicationService, type CommunicationMessage, type MessageStatus, type MessageType } from '@/shared/api/communication'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Archive,
  Inbox,
  Loader2,
  Mail,
  MessageSquare,
  Paperclip,
  RefreshCw,
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
    type: 'NOTIFICATION' as MessageType,
  })

  const currentUserId = user?.id || user?.email || ''
  const currentUserLabel = user?.email || currentUserId || 'Vous'

  const {
    data: messages = [],
    isLoading,
    refetch,
  } = useQuery<CommunicationMessage[]>({
    queryKey: ['communication-messages', currentUserId],
    enabled: isAuthenticated && Boolean(currentUserId),
    queryFn: async () => {
      const [inbox, sent] = await Promise.all([
        communicationService.getMessages({ destinataireId: currentUserId }),
        communicationService.getMessages({ expediteurId: currentUserId }),
      ])

      const deduped = new Map<string, CommunicationMessage>()
      ;[...sent, ...inbox].forEach((message) => deduped.set(message.id, message))

      return Array.from(deduped.values()).sort((a, b) => {
        const aTime = new Date(a.dateEnvoi || a.createdAt || 0).getTime()
        const bTime = new Date(b.dateEnvoi || b.createdAt || 0).getTime()
        return bTime - aTime
      })
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
        type: composeForm.type,
      })
      return communicationService.sendMessage(message.id)
    },
    onSuccess: () => {
      setComposeForm({
        destinataireId: '',
        sujet: '',
        contenu: '',
        type: 'NOTIFICATION',
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
    const inboxMessages = messages.filter((message) => message.destinataireId === currentUserId)
    const sentMessages = messages.filter((message) => message.expediteurId === currentUserId)
    const today = new Date().toISOString().slice(0, 10)

    return {
      total: messages.length,
      unread: inboxMessages.filter((message) => message.status !== 'LU' && message.status !== 'ARCHIVE').length,
      inbox: inboxMessages.length,
      sentToday: sentMessages.filter((message) => (message.dateEnvoi || message.createdAt || '').startsWith(today)).length,
      withAttachments: messages.filter((message) => Array.isArray(message.pieceJointe) && message.pieceJointe.length > 0).length,
    }
  }, [currentUserId, messages])

  const canSend = composeForm.destinataireId.trim() && composeForm.sujet.trim() && composeForm.contenu.trim()

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
          <Button onClick={() => setShowComposer((value) => !value)}>
            <Send className="mr-2 h-4 w-4" />
            {showComposer ? 'Fermer' : 'Nouveau Message'}
          </Button>
        </div>
      </div>

      {showComposer && (
        <Card>
          <CardHeader>
            <CardTitle>Nouveau message</CardTitle>
            <CardDescription>Envoi simple depuis votre compte courant: {currentUserLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Destinataire</label>
                <Input
                  value={composeForm.destinataireId}
                  onChange={(e) => setComposeForm((state) => ({ ...state, destinataireId: e.target.value }))}
                  placeholder="email ou identifiant destinataire"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <select
                  value={composeForm.type}
                  onChange={(e) => setComposeForm((state) => ({ ...state, type: e.target.value as MessageType }))}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="NOTIFICATION">Notification</option>
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                </select>
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
                const isInbox = message.destinataireId === currentUserId
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
