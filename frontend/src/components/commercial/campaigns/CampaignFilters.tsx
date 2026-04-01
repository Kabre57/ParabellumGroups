import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Filter, Plus } from 'lucide-react';
import type { CampagneStatus } from '@/shared/api/communication';
import { STATUS_OPTIONS } from '@/types/campaigns';

interface CampaignFiltersProps {
  searchTerm: string;
  statusFilter: 'all' | CampagneStatus;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: 'all' | CampagneStatus) => void;
  onCreate?: () => void;
  canCreate?: boolean;
}

export function CampaignFilters({
  searchTerm,
  statusFilter,
  onSearchChange,
  onStatusChange,
  onCreate,
  canCreate,
}: CampaignFiltersProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou sujet..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <select
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value as CampagneStatus | 'all')}
          className="border rounded-md px-3 py-2 text-sm"
        >
          <option value="all">Tous statuts</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </div>
      {canCreate && onCreate && (
        <Button onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle campagne
        </Button>
      )}
    </div>
  );
}
