'use client';

import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useCommunicationMessageStream } from '@/hooks/useCommunicationMessageStream'
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

// État, chargement et actions du parcours d'interface.


export type Conversation = {
  id: string
  participantId: string
  participantLabel: string
  messages: CommunicationMessage[]
  latestMessage: CommunicationMessage
  unreadCount: number
}



export const normalizeIdentifier = (value?: string | null) => String(value || '').trim().toLowerCase()



export const formatTimestamp = (timestamp?: string | null) => {
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



export const getStatusBadgeVariant = (status: MessageStatus) => {
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



export const buildQuotedBody = (message: CommunicationMessage) =>
  (message.contenu || '')
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n')

export function useMessagesPageModel() {

  const { user, isAuthenticated } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | MessageStatus>('all')
  const [showComposer, setShowComposer] = useState(false)
  const [composeError, setComposeError] = useState<string | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [draftMessageId, setDraftMessageId] = useState<string | null>(null)
  const [draftFiles, setDraftFiles] = useState<File[]>([])
  const [draftFilesUploaded, setDraftFilesUploaded] = useState(false)
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
  useCommunicationMessageStream(isAdminRole(user) || hasPermission(user, 'messages.read'))

  const isCurrentUserIdentifier = (value?: string | null) => {
    const normalized = normalizeIdentifier(value)
    return normalized === normalizeIdentifier(currentUserId) || (!!currentUserEmail && normalized === currentUserEmail)
  }

  const {
    data: messages = [],
    isLoading,
    isError,
    error: messagesError,
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
      let messageId = draftMessageId
      if (!messageId) {
        const message = await communicationService.createMessage({
          expediteurId: currentUserId,
          destinataireId: composeForm.destinataireId.trim(),
          sujet: composeForm.sujet.trim(),
          contenu: composeForm.contenu.trim(),
          type: 'NOTIFICATION',
        })
        messageId = message.id
        setDraftMessageId(messageId)
      }
      if (draftFiles.length && !draftFilesUploaded) {
        await communicationService.uploadMessageAttachments(messageId, draftFiles)
        setDraftFilesUploaded(true)
      }
      return communicationService.sendMessage(messageId)
    },
    onSuccess: () => {
      const nextConversationId = normalizeIdentifier(composeForm.destinataireId)
      setDraftMessageId(null)
      setDraftFiles([])
      setDraftFilesUploaded(false)
      setAttachmentError(null)
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
      setComposeError(`${error?.response?.data?.error || error?.message || 'Envoi impossible'} Le brouillon est conservé : vous pouvez réessayer.`)
    },
  })

  const openComposerForConversation = (conversation?: Conversation, seedMessage?: CommunicationMessage) => {
    const baseSubject = seedMessage?.sujet?.trim() || conversation?.latestMessage.sujet?.trim() || ''
    const subject = baseSubject ? (/^re\s*:/i.test(baseSubject) ? baseSubject : `Re: ${baseSubject}`) : ''
    const quotedBody = seedMessage ? `\n\n--- Message original ---\n${buildQuotedBody(seedMessage)}` : ''

    setComposeError(null)
    setDraftMessageId(null)
    setDraftFiles([])
    setDraftFilesUploaded(false)
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

  const downloadAttachment = async (messageId: string, key: string) => {
    setAttachmentError(null)
    try {
      const { blob, filename } = await communicationService.downloadMessageAttachment(messageId, key)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      setAttachmentError('Impossible de télécharger cette pièce jointe.')
    }
  }
  return {
    user,
    isAuthenticated,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    showComposer,
    setShowComposer,
    composeError,
    setComposeError,
    attachmentError,
    setAttachmentError,
    draftMessageId,
    setDraftMessageId,
    draftFiles,
    setDraftFiles,
    draftFilesUploaded,
    setDraftFilesUploaded,
    selectedConversationId,
    setSelectedConversationId,
    composeForm,
    setComposeForm,
    currentUserId,
    currentUserEmail,
    currentUserLabel,
    canSendMessages,
    canLoadRecipients,
    isCurrentUserIdentifier,
    messages,
    isLoading,
    isError,
    messagesError,
    refetch,
    recipients,
    userDirectory,
    conversations,
    filteredConversations,
    selectedConversation,
    stats,
    markAsReadMutation,
    archiveMutation,
    sendMutation,
    openComposerForConversation,
    canSend,
    downloadAttachment,
  };
}
