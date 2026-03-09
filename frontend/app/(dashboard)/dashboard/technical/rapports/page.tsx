'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { technicalService } from '@/shared/api/technical';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Calendar, X, FileText, AlertCircle, CheckCircle, Printer, Plus } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import RapportPrint from '@/components/printComponents/RapportPrint';
import { SearchParams } from '@/shared/api/types';
import RapportInterventionForm from '@/components/technical/RapportInterventionForm';

export default function RapportsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRapportId, setSelectedRapportId] = useState<string | null>(null);
  const [printingRapport, setPrintingRapport] = useState<any | null>(null);
  const [isPrinting, setIsPrinting] = useState<string | null>(null);
  const [showCreateRapport, setShowCreateRapport] = useState(false);

  // Créer des params de recherche corrects
  const searchParams: SearchParams = {};
  if (searchTerm) {
    // On peut passer le terme de recherche via un paramètre personnalisé ou filtrer côté client
    // Pour l'instant, on laisse le filtrage côté client
  }

  const { data: rapportsResponse, isLoading, error } = useQuery<Awaited<ReturnType<typeof technicalService.getRapports>>>({
    queryKey: ['rapports'],
    queryFn: () => technicalService.getRapports(),
  });
  const rapports = rapportsResponse?.data ?? [];

  // Filtrer les résultats côté client
  const filteredRapports = rapports.filter((rapport: any) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      rapport.titre?.toLowerCase().includes(searchLower) ||
      rapport.contenu?.toLowerCase().includes(searchLower) ||
      rapport.redacteur?.nom?.toLowerCase().includes(searchLower) ||
      rapport.redacteur?.prenom?.toLowerCase().includes(searchLower) ||
      rapport.intervention?.titre?.toLowerCase().includes(searchLower)
    );
  });

  const loadAndPrintRapport = async (rapportId: string) => {
    setIsPrinting(rapportId);
    try {
      const rapportResponse = await technicalService.getRapport(rapportId);
      const fullRapport = (rapportResponse as any)?.data ?? rapportResponse;
      setPrintingRapport(fullRapport?.data ?? fullRapport);
    } catch (error) {
      console.error('Erreur chargement rapport pour impression:', error);
      const fallback = rapports.find((item: any) => item.id === rapportId);
      if (fallback) {
        setPrintingRapport(fallback);
      }
    } finally {
      setIsPrinting(null);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg text-red-600 mb-2">Erreur lors du chargement des rapports</p>
          <p className="text-sm text-gray-600">{error instanceof Error ? error.message : 'Erreur inconnue'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {printingRapport && (
        <RapportPrint 
          rapport={printingRapport} 
          onClose={() => setPrintingRapport(null)} 
        />
      )}

      <div className="no-print flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Rapports d&apos;Intervention</h1>
          <p className="text-muted-foreground mt-2">
            Consulter les rapports d&apos;intervention et leurs photos
          </p>
        </div>
        <Button onClick={() => setShowCreateRapport(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouveau rapport
        </Button>
      </div>

      <Card className="no-print">
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
        <div className="flex justify-center p-12 no-print">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 no-print">
          {filteredRapports.map((rapport: any) => (
            <Card key={rapport.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">
                      Rapport #{rapport.id.slice(0, 8)}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(rapport.dateCreation).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <Badge variant="outline">
                    {rapport.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Titre</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {rapport.titre}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium">Rédacteur</p>
                    <p className="text-sm text-muted-foreground">
                      {rapport.redacteur?.prenom} {rapport.redacteur?.nom}
                    </p>
                  </div>

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
                      onClick={() => loadAndPrintRapport(rapport.id)}
                      disabled={isPrinting === rapport.id}
                    >
                      {isPrinting === rapport.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      ) : (
                        <Printer className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && filteredRapports.length === 0 && (
        <Card className="no-print">
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">Aucun rapport d&apos;intervention trouvé</p>
            <Button onClick={() => setShowCreateRapport(true)} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Créer un rapport
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={!!selectedRapportId} onOpenChange={() => setSelectedRapportId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedRapportId && (
            <RapportDetailView
              rapportId={selectedRapportId}
              onClose={() => setSelectedRapportId(null)}
              onPrint={(rapport) => setPrintingRapport(rapport)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateRapport} onOpenChange={setShowCreateRapport}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <RapportInterventionForm
            onSuccess={() => setShowCreateRapport(false)}
            onCancel={() => setShowCreateRapport(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RapportDetailView({ rapportId, onClose, onPrint }: { rapportId: string; onClose: () => void; onPrint: (rapport: any) => void }) {
  const queryClient = useQueryClient();
  const [showPdf, setShowPdf] = useState(false);
  const [deletingPhotoUrl, setDeletingPhotoUrl] = useState<string | null>(null);
  const { data: rapportResponse, isLoading, error } = useQuery<Awaited<ReturnType<typeof technicalService.getRapport>>>({
    queryKey: ['rapport', rapportId],
    queryFn: () => technicalService.getRapport(rapportId),
    enabled: !!rapportId,
  });
  const rapport = rapportResponse?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !rapport) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        <span>Erreur lors du chargement du rapport</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6" />
            {rapport.titre}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {new Date(rapport.dateCreation).toLocaleDateString('fr-FR', {
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

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <h3 className="text-lg font-semibold">Contenu</h3>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
          <p className="whitespace-pre-wrap">{rapport.contenu}</p>
        </div>
      </div>

      {rapport.conclusions && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold">Conclusions</h3>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
            <p className="whitespace-pre-wrap">{rapport.conclusions}</p>
          </div>
        </div>
      )}

      {rapport.recommandations && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Recommandations</h3>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="whitespace-pre-wrap">{rapport.recommandations}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="font-semibold text-muted-foreground">Statut</p>
          <Badge variant="outline" className="mt-1">
            {rapport.status}
          </Badge>
        </div>
        <div>
          <p className="font-semibold text-muted-foreground">Rédacteur</p>
          <p className="mt-1">
            {rapport.redacteur?.prenom} {rapport.redacteur?.nom}
          </p>
        </div>
        {rapport.intervention && (
          <>
            <div>
              <p className="font-semibold text-muted-foreground">Intervention</p>
              <p className="mt-1">{rapport.intervention?.titre}</p>
            </div>
            <div>
              <p className="font-semibold text-muted-foreground">Mission</p>
              <p className="mt-1">{rapport.intervention?.mission?.titre}</p>
            </div>
          </>
        )}
      </div>

      {rapport.photos && rapport.photos.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold">Photos</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rapport.photos.map((photo: string) => (
              <div key={photo} className="group relative">
                <img
                  src={photo}
                  alt="Photo rapport"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-800"
                  onClick={() => window.open(photo, '_blank')}
                />
                <button
                  type="button"
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  disabled={deletingPhotoUrl === photo}
                  onClick={async () => {
                    if (!confirm('Supprimer cette photo ?')) return;
                    setDeletingPhotoUrl(photo);
                    try {
                      await technicalService.deleteRapportPhoto(rapportId, photo);
                      queryClient.invalidateQueries({ queryKey: ['rapport', rapportId] });
                    } catch (err) {
                      console.error('Erreur suppression photo:', err);
                      alert('Erreur lors de la suppression de la photo');
                    } finally {
                      setDeletingPhotoUrl(null);
                    }
                  }}
                  title="Supprimer la photo"
                >
                  {deletingPhotoUrl === photo ? '…' : '×'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t">
        <Button className="flex-1" onClick={() => onPrint(rapport)}>
          <Printer className="h-4 w-4 mr-2" />
          Imprimer le Rapport
        </Button>
        <Button variant="outline" onClick={() => setShowPdf((v) => !v)}>
          {showPdf ? 'Masquer PDF' : 'Aperçu PDF'}
        </Button>
        <Button variant="outline" onClick={onClose}>
          Fermer
        </Button>
      </div>

      {showPdf && (
        <div className="border rounded-lg overflow-hidden">
          <iframe
            src={`/api/technical/rapports/${rapportId}/pdf`}
            width="100%"
            height="600"
            title="Aperçu PDF"
          />
        </div>
      )}
    </div>
  );
}
