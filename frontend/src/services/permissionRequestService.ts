import {
  PermissionChangeRequest,
  CreatePermissionChangeRequest,
} from '@/types/permissionWorkflow';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api';

export const permissionRequestService = {
  // List all permission change requests
  async listRequests(status?: string): Promise<PermissionChangeRequest[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);

    const url = `${API_BASE}/permission-requests${params.toString() ? `?${params}` : ''}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to fetch requests');
    }

    return res.json().then((data) => data.data || []);
  },

  // Get pending requests only
  async getPendingRequests(): Promise<PermissionChangeRequest[]> {
    return this.listRequests('PENDING');
  },

  // Create a new permission change request
  async createRequest(
    req: CreatePermissionChangeRequest
  ): Promise<PermissionChangeRequest> {
    const res = await fetch(`${API_BASE}/permission-requests`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to create request');
    }

    return res.json().then((data) => data.data);
  },

  // Approve a request
  async approveRequest(id: number): Promise<PermissionChangeRequest> {
    const res = await fetch(`${API_BASE}/permission-requests/${id}/approve`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to approve request');
    }

    return res.json().then((data) => data.data);
  },

  // Reject a request
  async rejectRequest(
    id: number,
    reason?: string
  ): Promise<PermissionChangeRequest> {
    const res = await fetch(`${API_BASE}/permission-requests/${id}/reject`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to reject request');
    }

    return res.json().then((data) => data.data);
  },

  // Get request details
  async getRequest(id: number): Promise<PermissionChangeRequest> {
    const res = await fetch(`${API_BASE}/permission-requests/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Request not found');
    }

    return res.json().then((data) => data.data);
  },

  // Get all roles
  async getRoles(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/roles`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to fetch roles');
    }

    return res.json().then((data) => data.data || []);
  },

  // Get all permissions
  async getPermissions(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/permissions`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to fetch permissions');
    }

    return res.json().then((data) => data.data || []);
  },
};
