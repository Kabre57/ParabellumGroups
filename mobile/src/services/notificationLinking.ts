import { authService } from '@/api/auth';
import { operationalRequestsService } from '@/api/operationalRequests';
import type { OperationalRequest } from '@/types/operationalRequest';
import { useAuthStore } from '@/stores/authStore';
import { useEnterpriseStore, type Enterprise } from '@/stores/enterpriseStore';

export class NotificationLinkingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotificationLinkingError';
  }
}

export type NotificationRequestTarget = { requestId: string; enterpriseId?: number };

export function parseNotificationRequestTarget(data: unknown): NotificationRequestTarget | null {
  if (!data || typeof data !== 'object') return null;
  const payload = data as Record<string, unknown>;
  let requestId = typeof payload.requestId === 'string' ? payload.requestId.trim() : '';
  if (!requestId && typeof payload.link === 'string') {
    try {
      const link = new URL(payload.link, 'https://parabellum.invalid');
      requestId = link.searchParams.get('request') || '';
      if (!requestId) {
        const match = link.pathname.match(/\/demandes\/([^/]+)/);
        requestId = match?.[1] ? decodeURIComponent(match[1]) : '';
      }
    } catch {
      return null;
    }
  }
  if (!requestId) return null;
  const rawEnterpriseId = payload.enterpriseId;
  const enterpriseId = rawEnterpriseId === undefined || rawEnterpriseId === null
    ? undefined
    : Number(rawEnterpriseId);
  if (enterpriseId !== undefined && (!Number.isInteger(enterpriseId) || enterpriseId < 1)) return null;
  return { requestId, ...(enterpriseId !== undefined ? { enterpriseId } : {}) };
}

export async function resolveNotificationRequestTarget(
  target: NotificationRequestTarget,
  userId: string,
): Promise<{ enterprise: Enterprise; request: OperationalRequest }> {
  const currentUser = useAuthStore.getState().user;
  if (!currentUser || currentUser.id !== userId || currentUser.mustChangePassword) {
    throw new NotificationLinkingError('Reconnectez-vous pour ouvrir cette demande.');
  }

  const enterprises = await authService.enterprises();
  const currentEnterpriseId = useEnterpriseStore.getState().activeEnterpriseId;
  const enterprise = target.enterpriseId !== undefined
    ? enterprises.find((item) => item.id === target.enterpriseId)
    : enterprises.find((item) => item.id === currentEnterpriseId) ?? (enterprises.length === 1 ? enterprises[0] : undefined);
  if (!enterprise) {
    throw new NotificationLinkingError('Cette demande ne correspond pas à une entreprise accessible à votre compte.');
  }

  const previous = enterprises.find((item) => item.id === currentEnterpriseId);
  useEnterpriseStore.getState().setActive(enterprise);
  try {
    const request = await operationalRequestsService.get(target.requestId);
    if (useAuthStore.getState().user?.id !== userId) {
      throw new NotificationLinkingError('Votre session a changé. Reconnectez-vous puis réessayez.');
    }
    if (request.enterpriseId !== enterprise.id) {
      throw new NotificationLinkingError('Cette demande n’appartient pas à l’entreprise indiquée.');
    }
    return { enterprise, request };
  } catch (error: unknown) {
    if (previous && useEnterpriseStore.getState().activeEnterpriseId === enterprise.id) {
      useEnterpriseStore.getState().setActive(previous);
    }
    if (error instanceof NotificationLinkingError) throw error;
    throw new NotificationLinkingError('Impossible de vérifier cette demande. Actualisez votre session puis réessayez.');
  }
}
