'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { technicalService } from '@/shared/api/services/technical';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Download, Calendar, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export default function RapportsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRapportId, setSelectedRapportId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['rapports', searchTerm],
    queryFn: () => technicalService.getRapports({ search: searchTerm }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Chargement des rapports...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-2">Erreur lors du chargement des rapports</p>
          <p className="text-sm text-gray-600">{error instanceof Error ? error.message : 'Erreur inconnue'}</p>
          <p className="text-xs text-gray-500 mt-2">Vérifiez que le service Technical backend est démarré</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Rapports d&apos;Intervention</h1>
        <p className="text-muted-foreground mt-2">
          Consulter les rapports d&apos;intervention et leurs photos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rechercher un rapport</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par intervention, technicien..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.data?.map((rapport) => (
            <Card key={rapport.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      Rapport #{rapport.id.slice(0, 8)}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(rapport.createdAt).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  {rapport.photos && rapport.photos.length > 0 && (
                    <Badge variant="secondary">
                      {rapport.photos.length} photo{rapport.photos.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Travaux effectués</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {rapport.workDone}
                    </p>
                  </div>

                  {rapport.issuesFound && (
                    <div>
                      <p className="text-sm font-medium text-orange-600">Problèmes rencontrés</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {rapport.issuesFound}
                      </p>
                    </div>
                  )}

                  {rapport.recommendations && (
                    <div>
                      <p className="text-sm font-medium text-blue-600">Recommandations</p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {rapport.recommendations}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedRapportId(rapport.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Voir
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // TODO: Implémenter le téléchargement PDF
                        console.log('Télécharger PDF rapport', rapport.id);
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && data?.data?.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Aucun rapport d&apos;intervention trouvé</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedRapportId} onOpenChange={() => setSelectedRapportId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedRapportId && (
            <RapportDetailView
              rapportId={selectedRapportId}
              onClose={() => setSelectedRapportId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Composant inline pour afficher les détails du rapport
function RapportDetailView({ rapportId, onClose }: { rapportId: string; onClose: () => void }) {
  const { data: rapport, isLoading, error } = useQuery({
    queryKey: ['rapport', rapportId],
    queryFn: () => technicalService.getRapport(rapportId),
    enabled: !!rapportId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error || !rapport) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <span className="ml-2">Erreur lors du chargement du rapport</span>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Rapport d&apos;Intervention #{rapport.id.slice(0, 8)}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {new Date(rapport.createdAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Travaux effectués */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold">Travaux Effectués</h3>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <p className="whitespace-pre-wrap">{rapport.workDone || 'Non renseigné'}</p>
        </div>
      </div>

      {/* Problèmes rencontrés */}
      {rapport.issuesFound && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold">Problèmes Rencontrés</h3>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <p className="whitespace-pre-wrap">{rapport.issuesFound}</p>
          </div>
        </div>
      )}

      {/* Recommandations */}
      {rapport.recommendations && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Recommandations</h3>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="whitespace-pre-wrap">{rapport.recommendations}</p>
          </div>
        </div>
      )}

      {/* Photos */}
      {rapport.photos && rapport.photos.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Photos ({rapport.photos.length})</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {rapport.photos.map((photo: any, index: number) => (
              <div key={index} className="relative aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                {typeof photo === 'string' ? (
                  <img 
                    src={photo} 
                    alt={`Photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    Photo {index + 1}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t">
        <Button className="flex-1" onClick={() => {
          // TODO: Implémenter impression PDF
          console.log('Imprimer rapport', rapportId);
        }}>
          <Download className="h-4 w-4 mr-2" />
          Télécharger PDF
        </Button>
        <Button variant="outline" onClick={onClose}>
          Fermer
        </Button>
      </div>
    </div>
  );
}
