'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  PhoneCall, 
  Users, 
  Mail, 
  Building2,
  Search,
  Filter,
  UserPlus
} from 'lucide-react'

interface Contact {
  id: string
  name: string
  company: string
  email: string
  phone: string
  position: string
  category: 'client' | 'prospect' | 'partner' | 'supplier'
  lastContact: string
  status: 'active' | 'inactive'
}

export default function ContactsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const { data: contacts = [] } = useQuery<Contact[]>({
    queryKey: ['contacts'],
    queryFn: async () => [
      {
        id: '1',
        name: 'Marie Dubois',
        company: 'TechCorp Solutions',
        email: 'marie.dubois@techcorp.fr',
        phone: '+33 1 23 45 67 89',
        position: 'Directrice Achats',
        category: 'client',
        lastContact: '2026-01-20',
        status: 'active'
      },
      {
        id: '2',
        name: 'Pierre Lambert',
        company: 'Innovation Partners',
        email: 'p.lambert@innovpart.com',
        phone: '+33 1 98 76 54 32',
        position: 'CEO',
        category: 'partner',
        lastContact: '2026-01-19',
        status: 'active'
      },
      {
        id: '3',
        name: 'Sophie Martin',
        company: 'Global Supplies Inc',
        email: 'sophie.martin@globalsupplies.com',
        phone: '+33 2 34 56 78 90',
        position: 'Responsable Commercial',
        category: 'supplier',
        lastContact: '2026-01-18',
        status: 'active'
      },
      {
        id: '4',
        name: 'Jean Rousseau',
        company: 'StartUp Innovante',
        email: 'j.rousseau@startup-innov.fr',
        phone: '+33 6 12 34 56 78',
        position: 'Fondateur',
        category: 'prospect',
        lastContact: '2026-01-15',
        status: 'active'
      },
      {
        id: '5',
        name: 'Alice Bernard',
        company: 'Consulting Group',
        email: 'alice.b@consultinggroup.fr',
        phone: '+33 1 45 67 89 01',
        position: 'Consultante Senior',
        category: 'client',
        lastContact: '2026-01-10',
        status: 'active'
      },
      {
        id: '6',
        name: 'Thomas Petit',
        company: 'Digital Agency',
        email: 'thomas.petit@digitalagency.com',
        phone: '+33 3 56 78 90 12',
        position: 'Directeur Marketing',
        category: 'prospect',
        lastContact: '2026-01-05',
        status: 'active'
      },
      {
        id: '7',
        name: 'Claire Moreau',
        company: 'Services Pro',
        email: 'c.moreau@servicespro.fr',
        phone: '+33 4 67 89 01 23',
        position: 'Chef de Projet',
        category: 'client',
        lastContact: '2025-12-20',
        status: 'inactive'
      },
      {
        id: '8',
        name: 'Luc Durand',
        company: 'Tech Partners',
        email: 'luc.durand@techpartners.com',
        phone: '+33 5 78 90 12 34',
        position: 'CTO',
        category: 'partner',
        lastContact: '2026-01-12',
        status: 'active'
      }
    ]
  })

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         contact.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || contact.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const stats = {
    total: contacts.length,
    clients: contacts.filter(c => c.category === 'client').length,
    prospects: contacts.filter(c => c.category === 'prospect').length,
    partners: contacts.filter(c => c.category === 'partner').length
  }

  const getCategoryBadge = (category: string) => {
    const config = {
      client: { label: 'Client', variant: 'default' as const },
      prospect: { label: 'Prospect', variant: 'secondary' as const },
      partner: { label: 'Partenaire', variant: 'default' as const },
      supplier: { label: 'Fournisseur', variant: 'secondary' as const }
    }
    return config[category as keyof typeof config] || { label: category, variant: 'secondary' as const }
  }

  const getStatusBadge = (status: string) => {
    return status === 'active' 
      ? { label: 'Actif', className: 'bg-green-500' }
      : { label: 'Inactif', className: 'bg-gray-500' }
  }

  const formatLastContact = (date: string) => {
    const contactDate = new Date(date)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - contactDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Aujourd\'hui'
    if (diffDays === 1) return 'Hier'
    if (diffDays < 7) return `Il y a ${diffDays} jours`
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`
    return contactDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contacts Clients</h1>
        <p className="text-muted-foreground">Gérez votre annuaire de contacts professionnels</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Dans votre annuaire</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.clients}</div>
            <p className="text-xs text-muted-foreground">Clients actifs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prospects</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.prospects}</div>
            <p className="text-xs text-muted-foreground">En cours de conversion</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partenaires</CardTitle>
            <PhoneCall className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.partners}</div>
            <p className="text-xs text-muted-foreground">Partenaires stratégiques</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Annuaire de Contacts</CardTitle>
          <CardDescription>Liste complète de vos contacts professionnels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, entreprise ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border rounded-md px-3 py-2 text-sm"
              >
                <option value="all">Toutes catégories</option>
                <option value="client">Clients</option>
                <option value="prospect">Prospects</option>
                <option value="partner">Partenaires</option>
                <option value="supplier">Fournisseurs</option>
              </select>
            </div>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Nouveau Contact
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium">Nom</th>
                  <th className="text-left p-4 font-medium">Entreprise</th>
                  <th className="text-left p-4 font-medium">Position</th>
                  <th className="text-left p-4 font-medium">Contact</th>
                  <th className="text-left p-4 font-medium">Catégorie</th>
                  <th className="text-left p-4 font-medium">Dernier Contact</th>
                  <th className="text-left p-4 font-medium">Statut</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.map((contact) => {
                  const categoryBadge = getCategoryBadge(contact.category)
                  const statusBadge = getStatusBadge(contact.status)
                  
                  return (
                    <tr key={contact.id} className="border-t hover:bg-muted/50">
                      <td className="p-4 font-medium">{contact.name}</td>
                      <td className="p-4">{contact.company}</td>
                      <td className="p-4 text-sm text-muted-foreground">{contact.position}</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1 text-sm">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </span>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <PhoneCall className="h-3 w-3" />
                            {contact.phone}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <Badge variant={categoryBadge.variant}>
                          {categoryBadge.label}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {formatLastContact(contact.lastContact)}
                      </td>
                      <td className="p-4">
                        <Badge className={statusBadge.className}>
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

          {filteredContacts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Aucun contact trouvé
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
