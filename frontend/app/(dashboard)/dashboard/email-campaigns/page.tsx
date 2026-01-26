'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Mail, 
  Send, 
  BarChart3, 
  Users,
  Search,
  Filter,
  Plus
} from 'lucide-react'

interface Campaign {
  id: string
  name: string
  subject: string
  sentDate: string
  recipients: number
  opened: number
  clicked: number
  bounced: number
  status: 'draft' | 'scheduled' | 'sent' | 'completed'
}

export default function EmailCampaignsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ['campaigns'],
    queryFn: async () => [
      {
        id: '1',
        name: 'Newsletter Janvier 2026',
        subject: 'Nouveautés et offres spéciales du mois',
        sentDate: '2026-01-15T10:00:00',
        recipients: 2450,
        opened: 1568,
        clicked: 456,
        bounced: 12,
        status: 'completed'
      },
      {
        id: '2',
        name: 'Lancement Produit Premium',
        subject: 'Découvrez notre nouvelle gamme Premium',
        sentDate: '2026-01-18T14:30:00',
        recipients: 1200,
        opened: 856,
        clicked: 342,
        bounced: 8,
        status: 'sent'
      },
      {
        id: '3',
        name: 'Invitation Webinar Q1',
        subject: 'Participez à notre webinar exclusif',
        sentDate: '2026-01-25T09:00:00',
        recipients: 850,
        opened: 0,
        clicked: 0,
        bounced: 0,
        status: 'scheduled'
      },
      {
        id: '4',
        name: 'Promotion Saint-Valentin',
        subject: 'Offre spéciale Saint-Valentin - 20% de réduction',
        sentDate: '2026-02-01T08:00:00',
        recipients: 3200,
        opened: 0,
        clicked: 0,
        bounced: 0,
        status: 'scheduled'
      },
      {
        id: '5',
        name: 'Enquête Satisfaction Client',
        subject: 'Votre avis compte - Enquête de satisfaction',
        sentDate: '2026-01-10T11:00:00',
        recipients: 1850,
        opened: 1245,
        clicked: 623,
        bounced: 15,
        status: 'completed'
      },
      {
        id: '6',
        name: 'Rappel Renouvellement',
        subject: 'Votre abonnement arrive à expiration',
        sentDate: '',
        recipients: 450,
        opened: 0,
        clicked: 0,
        bounced: 0,
        status: 'draft'
      },
      {
        id: '7',
        name: 'Newsletter Février 2026',
        subject: 'Les tendances du mois de février',
        sentDate: '',
        recipients: 2600,
        opened: 0,
        clicked: 0,
        bounced: 0,
        status: 'draft'
      },
      {
        id: '8',
        name: 'Événement Networking',
        subject: 'Invitation événement networking - Paris',
        sentDate: '2026-01-20T16:00:00',
        recipients: 680,
        opened: 512,
        clicked: 187,
        bounced: 5,
        status: 'sent'
      }
    ]
  })

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.subject.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const completedCampaigns = campaigns.filter(c => c.status === 'completed' || c.status === 'sent')
  const totalOpened = completedCampaigns.reduce((sum, c) => sum + c.opened, 0)
  const totalRecipients = completedCampaigns.reduce((sum, c) => sum + c.recipients, 0)
  const totalClicked = completedCampaigns.reduce((sum, c) => sum + c.clicked, 0)

  const stats = {
    total: campaigns.length,
    sent: campaigns.filter(c => c.status === 'sent' || c.status === 'completed').length,
    avgOpenRate: totalRecipients > 0 ? ((totalOpened / totalRecipients) * 100).toFixed(1) : '0.0',
    avgClickRate: totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : '0.0'
  }

  const getStatusBadge = (status: string) => {
    const config = {
      draft: { label: 'Brouillon', variant: 'secondary' as const },
      scheduled: { label: 'Planifiée', variant: 'default' as const },
      sent: { label: 'Envoyée', variant: 'default' as const },
      completed: { label: 'Terminée', variant: 'secondary' as const }
    }
    return config[status as keyof typeof config] || { label: status, variant: 'secondary' as const }
  }

  const calculateRate = (value: number, total: number) => {
    if (total === 0) return '0.0'
    return ((value / total) * 100).toFixed(1)
  }

  const formatDate = (date: string) => {
    if (!date) return '-'
    const d = new Date(date)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Campagnes Email Marketing</h1>
        <p className="text-muted-foreground">Créez et gérez vos campagnes d'emailing</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campagnes</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Toutes campagnes confondues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Envoyées</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent}</div>
            <p className="text-xs text-muted-foreground">Campagnes actives</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d'Ouverture Moyen</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgOpenRate}%</div>
            <p className="text-xs text-muted-foreground">Sur campagnes envoyées</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de Clic Moyen</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgClickRate}%</div>
            <p className="text-xs text-muted-foreground">Engagement des lecteurs</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liste des Campagnes</CardTitle>
          <CardDescription>Gérez et suivez vos campagnes email marketing</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou sujet..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Tous statuts</option>
                <option value="draft">Brouillon</option>
                <option value="scheduled">Planifiée</option>
                <option value="sent">Envoyée</option>
                <option value="completed">Terminée</option>
              </select>
            </div>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle Campagne
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Nom de la Campagne</th>
                  <th className="text-left p-4 font-medium">Sujet</th>
                  <th className="text-left p-4 font-medium">Date d'Envoi</th>
                  <th className="text-left p-4 font-medium">Destinataires</th>
                  <th className="text-left p-4 font-medium">Ouvertures</th>
                  <th className="text-left p-4 font-medium">Clics</th>
                  <th className="text-left p-4 font-medium">Rebonds</th>
                  <th className="text-left p-4 font-medium">Statut</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((campaign) => {
                  const statusBadge = getStatusBadge(campaign.status)
                  const openRate = calculateRate(campaign.opened, campaign.recipients)
                  const clickRate = calculateRate(campaign.clicked, campaign.opened)
                  
                  return (
                    <tr key={campaign.id} className="border-t hover:bg-muted/50">
                      <td className="p-4 font-medium">{campaign.name}</td>
                      <td className="p-4 text-sm max-w-xs truncate">{campaign.subject}</td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatDate(campaign.sentDate)}
                      </td>
                      <td className="p-4 text-sm">{campaign.recipients.toLocaleString()}</td>
                      <td className="p-4">
                        {campaign.status === 'draft' || campaign.status === 'scheduled' ? (
                          <span className="text-sm text-muted-foreground">-</span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{campaign.opened.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground">{openRate}%</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {campaign.status === 'draft' || campaign.status === 'scheduled' ? (
                          <span className="text-sm text-muted-foreground">-</span>
                        ) : (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{campaign.clicked.toLocaleString()}</span>
                            <span className="text-xs text-muted-foreground">{clickRate}%</span>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-sm">
                        {campaign.bounced > 0 ? (
                          <span className="text-red-600">{campaign.bounced}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                      </td>
                      <td className="p-4">
                        <Button variant="ghost" size="sm">Voir</Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredCampaigns.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Aucune campagne trouvée
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
