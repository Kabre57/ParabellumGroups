'use client';

import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Filter, 
  RefreshCw, 
  MoreHorizontal, 
  Trash2, 
  Edit, 
  Users,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { useSegments, useCreateSegment, useUpdateSegment, useDeleteSegment, useRefreshSegment } from '@/hooks/useCrm';
import type { SegmentClient, TypeSegmentCRM } from '@/shared/api/crm/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';

export default function SegmentsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  
  const { data: segments, isLoading, refetch } = useSegments();
  const refreshMutation = useRefreshSegment();
  const deleteMutation = useDeleteSegment();

  const filteredSegments = useMemo(() => {
    if (!segments) return [];
    return segments.filter((s: SegmentClient) => {
      const matchSearch = s.nom.toLowerCase().includes(searchTerm.toLowerCase());
      const matchFilter = filterType === 'ALL' || s.typeSegment === filterType;
      return matchSearch && matchFilter;
    });
  }, [segments, searchTerm, filterType]);

  const handleRefresh = async (id: string) => {
    try {
      await refreshMutation.mutateAsync(id);
      toast.success('Segment mis à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce segment ?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Segment supprimé');
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
          <h1 className="text-3xl font-bold tracking-tight">Segments Clients</h1>
          <p className="text-muted-foreground">
            Gérez votre segmentation dynamique pour des campagnes ciblées.
          </p>
        </div>
        <Button onClick={() => toast.info('Fonctionnalité de création bientôt disponible')}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau Segment
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un segment..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">Tous les types</option>
            <option value="DYNAMIQUE">Dynamique</option>
            <option value="STATIQUE">Statique</option>
            <option value="HYBRIDE">Hybride</option>
          </select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredSegments.map((segment: SegmentClient) => (
          <Card key={segment.id} className="overflow-hidden border-l-4" style={{ borderLeftColor: segment.couleur || '#3B82F6' }}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg font-bold">{segment.nom}</CardTitle>
                <Badge variant={segment.isActive ? "success" : "secondary"}>
                  {segment.isActive ? "Actif" : "Inactif"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 min-h-[40px]">
                {segment.description || 'Aucune description'}
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-2 border-y my-2 text-sm italic">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" /> {segment.compte} membres
                </span>
                <span className="text-xs text-muted-foreground">
                  Type: {segment.typeSegment}
                </span>
              </div>
              
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleRefresh(segment.id)} disabled={refreshMutation.isPending}>
                  <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending && 'animate-spin'}`} />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toast.info('Édition bientôt disponible')}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDelete(segment.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredSegments.length === 0 && (
          <div className="col-span-full flex h-40 flex-col items-center justify-center rounded-lg border border-dashed text-muted-foreground">
            <p>Aucun segment trouvé.</p>
          </div>
        )}
      </div>
    </div>
  );
}
