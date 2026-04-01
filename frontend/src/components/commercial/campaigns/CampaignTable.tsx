import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye, Loader2 } from 'lucide-react';
import type { CampagneMail } from '@/shared/api/communication';
import { calculateRate, formatDate, getStatusBadge } from '@/utils/campaigns/helpers';

interface CampaignTableProps {
  campaigns: CampagneMail[];
  isLoading: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  onEdit?: (campaign: CampagneMail) => void;
  onDelete?: (campaign: CampagneMail) => void;
  deletePending?: boolean;
}

export function CampaignTable({
  campaigns,
  isLoading,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
  deletePending,
}: CampaignTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Chargement des campagnes...
        </div>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return <div className="text-center py-12 text-muted-foreground">Aucune campagne trouvée</div>;
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full min-w-[860px]">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-4 font-medium">Nom de la campagne</th>
            <th className="text-left p-4 font-medium">Sujet</th>
            <th className="text-left p-4 font-medium">Date d'envoi</th>
            <th className="text-left p-4 font-medium">Destinataires</th>
            <th className="text-left p-4 font-medium">Ouvertures</th>
            <th className="text-left p-4 font-medium">Rebonds</th>
            <th className="text-left p-4 font-medium">Statut</th>
            {(canUpdate || canDelete) && <th className="text-left p-4 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => {
            const statusBadge = getStatusBadge(campaign.status);
            const recipients = Array.isArray(campaign.destinataires)
              ? campaign.destinataires.length
              : 0;
            const openRate = calculateRate(campaign.nbLus || 0, recipients);

            return (
              <tr key={campaign.id} className="border-t hover:bg-muted/50">
                <td className="p-4 font-medium">{campaign.nom}</td>
                <td className="p-4 text-sm max-w-xs truncate" title={campaign.template?.sujet || ''}>
                  {campaign.template?.sujet || '-'}
                </td>
                <td className="p-4 text-sm text-muted-foreground">{formatDate(campaign.dateEnvoi)}</td>
                <td className="p-4 text-sm">{recipients.toLocaleString()}</td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{campaign.nbLus || 0}</span>
                    <span className="text-xs text-muted-foreground">{openRate}%</span>
                  </div>
                </td>
                <td className="p-4 text-sm">
                  {campaign.nbErreurs > 0 ? (
                    <span className="text-red-600">{campaign.nbErreurs}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
                <td className="p-4">
                  <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                </td>
                {(canUpdate || canDelete) && (
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" title="Voir">
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canUpdate && onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEdit(campaign)}
                          title="Modifier"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && onDelete && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600"
                          onClick={() => onDelete(campaign)}
                          disabled={deletePending}
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
