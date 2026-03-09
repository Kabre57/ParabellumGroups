// Permission Change Request Types
export type PermissionChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PermissionChangeRequest {
  id: number;
  roleId: number;
  permissionId: number;
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canApprove?: boolean;
  status: PermissionChangeStatus;
  requestedBy: number;
  requestedAt: string;
  reviewedBy?: number;
  reviewedAt?: string;
  reason?: string;
  role?: {
    id: number;
    name: string;
    code: string;
  };
  permission?: {
    id: number;
    name: string;
    description?: string;
    category: string;
  };
  requester?: {
    id: number;
    email: string;
  };
  reviewer?: {
    id: number;
    email: string;
  };
}

export interface CreatePermissionChangeRequest {
  roleId: number;
  permissionId: number;
  canView?: boolean;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canApprove?: boolean;
  reason?: string;
}

export interface RoleTemplate {
  name: string;
  code: string;
  template: string;
}
