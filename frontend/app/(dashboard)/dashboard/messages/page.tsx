'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, 
  Mail, 
  Paperclip, 
  Send,
  Search,
  Filter
} from 'lucide-react'

interface Message {
  id: string
  from: string
  to: string
  subject: string
  preview: string
  timestamp: string
  isRead: boolean
  hasAttachment: boolean
  priority: 'normal' | 'high' | 'urgent'
}

export default function MessagesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('all')

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['messages'],
    queryFn: async () => [
      {
        id: '1',
        from: 'Sophie Martin',
        to: 'Vous',
        subject: 'Réunion projet Q1 2026',
        preview: 'Bonjour, je souhaiterais planifier une réunion pour discuter des objectifs...',
        timestamp: '2026-01-21T10:30:00',
        isRead: false,
        hasAttachment: true,
        priority: 'high'
      },
      {
        id: '2',
        from: 'Jean Dupont',
        to: 'Vous',
        subject: 'Validation budget',
        preview: 'Le budget pour le département a été validé. Merci de consulter...',
        timestamp: '2026-01-21T09:15:00',
        isRead: false,
        hasAttachment: false,
        priority: 'urgent'
      },
      {
        id: '3',
        from: 'Marie Lambert',
        to: 'Vous',
        subject: 'Rapport mensuel',
        preview: 'Veuillez trouver ci-joint le rapport mensuel de janvier...',
        timestamp: '2026-01-20T16:45:00',
        isRead: true,
        hasAttachment: true,
        priority: 'normal'
      },
      {
        id: '4',
        from: 'Pierre Rousseau',
        to: 'Vous',
        subject: 'Demande de congés',
        preview: 'Je souhaiterais poser des congés du 15 au 20 février...',
        timestamp: '2026-01-20T14:20:00',
        isRead: true,
        hasAttachment: false,
        priority: 'normal'
      },
      {
        id: '5',
        from: 'Vous',
        to: 'Équipe Support',
        subject: 'Nouvelle procédure support client',
        preview: 'Suite à notre réunion, voici la nouvelle procédure à suivre...',
        timestamp: '2026-01-20T11:00:00',
        isRead: true,
        hasAttachment: true,
        priority: 'normal'
      },
      {
        id: '6',
        from: 'Alice Bernard',
        to: 'Vous',
        subject: 'Mise à jour système',
        preview: 'Une mise à jour importante du système est prévue ce week-end...',
        timestamp: '2026-01-19T17:30:00',
        isRead: true,
        hasAttachment: false,
        priority: 'high'
      }
    ]
  })

  const filteredMessages = messages.filter(message => {
    const matchesSearch = message.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.preview.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPriority = priorityFilter === 'all' || message.priority === priorityFilter
    return matchesSearch && matchesPriority
  })

  const stats = {
    total: messages.length,
    unread: messages.filter(m => !m.isRead).length,
    sentToday: messages.filter(m => m.from === 'Vous' && m.timestamp.startsWith('2026-01-21')).length,
    withAttachments: messages.filter(m => m.hasAttachment).length
  }

  const getPriorityBadge = (priority: string) => {
    const variants = {
      normal: 'secondary',
      high: 'default',
      urgent: 'destructive'
    }
    return variants[priority as keyof typeof variants] || 'secondary'
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Il y a moins d\'une heure'
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffHours < 48) return 'Hier'
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Messagerie Interne</h1>
        <p className="text-muted-foreground">Gérez vos messages et communications internes</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Dans votre boîte de réception</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Non Lus</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unread}</div>
            <p className="text-xs text-muted-foreground">Messages à consulter</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Envoyés Aujourd'hui</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sentToday}</div>
            <p className="text-xs text-muted-foreground">Messages envoyés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pièces Jointes</CardTitle>
            <Paperclip className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withAttachments}</div>
            <p className="text-xs text-muted-foreground">Fichiers attachés</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
          <CardDescription>Liste de vos messages récents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par sujet, expéditeur ou contenu..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Toutes priorités</option>
                <option value="urgent">Urgent</option>
                <option value="high">Important</option>
                <option value="normal">Normal</option>
              </select>
            </div>
            <Button>
              <Send className="mr-2 h-4 w-4" />
              Nouveau Message
            </Button>
          </div>

          <div className="space-y-2">
            {filteredMessages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-4 p-4 rounded-lg border transition-colors hover:bg-accent cursor-pointer ${
                  !message.isRead ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900' : ''
                }`}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${!message.isRead ? 'font-semibold' : ''}`}>
                      {message.from}
                    </span>
                    {!message.isRead && (
                      <Badge variant="default" className="bg-blue-500">Non lu</Badge>
                    )}
                    {message.priority === 'urgent' && (
                      <Badge variant="destructive">Urgent</Badge>
                    )}
                    {message.priority === 'high' && (
                      <Badge variant="default">Important</Badge>
                    )}
                    {message.hasAttachment && (
                      <Paperclip className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className={`text-sm ${!message.isRead ? 'font-semibold' : ''}`}>
                    {message.subject}
                  </div>
                  <div className="text-sm text-muted-foreground line-clamp-1">
                    {message.preview}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>
            ))}
          </div>

          {filteredMessages.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Aucun message trouvé
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
