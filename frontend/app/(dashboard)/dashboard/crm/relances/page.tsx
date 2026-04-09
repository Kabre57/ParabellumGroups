'use client';

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Mail, 
  MessageSquare, 
  Calendar, 
  Play, 
  Pause, 
  Trash2, 
  Edit,
  AlertCircle
} from 'lucide-react';
import { useRelances, useToggleRelance, useDeleteRelance, useSegments } from '@/hooks/useCrm';
import type { RelanceAutomatique, CanalRelance, DeclencheurRelance } from '@/shared/api/crm/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

const canalIcons: Record<string, any> = {
  EMAIL_RELANCE: Mail,
  SMS: MessageSquare,
  WHATSAPP: MessageSquare,
};

const declencheurLabels: Record<string, string> = {
  TICKET_OUVERT: 'Ticket Ouvert',
  ECHEANCE_CONTRAT: 'Échéance Contrat',
  SANS_INTERACTION: 'Sans Interaction',
  SONDAGE_NON_REPONDU: 'Sondage Non Répondu',
  COTISATION: 'Cotisation',
  ANNIVERSAIRE: 'Anniversaire',
  MANUEL: 'Manuel',
};

export default function RelancesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const { data: relances, isLoading, refetch } = useRelances();
  const toggleMutation = useToggleRelance();
  const deleteMutation = useDeleteRelance();

  const filteredRelances = useMemo(() => {
    if (!relances) return [];
    return relances.filter((r: RelanceAutomatique) => 
      r.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [relances, searchTerm]);

  const handleToggle = async (id: string) => {
    try {
      await toggleMutation.mutateAsync(id);
      toast.success('État changé avec succès');
    } catch (error) {
      toast.error('Erreur lors du changement d\'état');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous supprimer cette relance automatique ?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Relance supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Relances Automatiques</h1>
          <p className="text-muted-foreground">
            Configurez des automatisations pour rester en contact avec vos prospects et clients.
          </p>
        </div>
        <Button onClick={() => toast.info('Création bientôt disponible')}>
          <Plus className="mr-2 h-4 w-4" /> Nouvelle Relance
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une relance..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {filteredRelances.map((relance: RelanceAutomatique) => {
          const CanalIcon = canalIcons[relance.canal] || AlertCircle;
          return (
            <Card key={relance.id} className={!relance.estActif ? 'opacity-70 bg-muted/20' : ''}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{relance.nom}</CardTitle>
                    <Badge variant={relance.estActif ? "success" : "secondary"}>
                      {relance.estActif ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{relance.description}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleToggle(relance.id)} disabled={toggleMutation.isPending}>
                    {relance.estActif ? (
                      <Pause className="h-4 w-4 text-amber-500" />
                    ) : (
                      <Play className="h-4 w-4 text-emerald-500" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => toast.info('Édition bientôt disponible')}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(relance.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <CanalIcon className="h-4 w-4" />
                    <span>{relance.canal === 'EMAIL_RELANCE' ? 'E-mail' : relance.canal}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Délai: {relance.delaiJours} jours</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    <span>{declencheurLabels[relance.declencheur] || relance.declencheur}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-4 w-4" />
                    <span>{relance.nombreExecutions} envois</span>
                  </div>
                </div>
                {relance.segment && (
                  <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Segments ciblés</span>
                    <Badge variant="outline">{relance.segment.nom}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
        {filteredRelances.length === 0 && (
          <div className="col-span-full py-12 text-center rounded-lg border border-dashed">
            <p className="text-muted-foreground">Aucune relance automatique trouvée.</p>
          </div>
        )}
      </div>
    </div>
  );
}
