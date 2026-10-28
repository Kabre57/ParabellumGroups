'use client';

import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, FilePlus2, FileText } from 'lucide-react';
import { apiClient } from '@/shared/api/shared/client';
import billingService from '@/shared/api/billing';
import {
  operationalRequestsService,
  type OperationalRequest,
  type OperationalRequestType,
} from '@/shared/api/operationalRequests.service';
import { useAuth } from '@/shared/hooks/useAuth';
import { useEnterprise } from '@/shared/providers/EnterpriseProvider';
import { buildPermissionSet, isAdminRole } from '@/shared/permissions';
import { Button } from '@/components/ui/button';
import { emptyForm, getErrorMessage } from './constants';
import type { FormValues, ViewFilter } from './types';
import { SearchParamSync } from './components/SearchParamSync';
import { OperationalRequestCard } from './components/OperationalRequestCard';
import { OperationalRequestFormModal } from './components/OperationalRequestFormModal';
import { CashVoucherModal, type CashVoucherSelection } from './components/CashVoucherModal';
import { OperationalRequestDetail } from './components/OperationalRequestDetail';

export default function OperationalRequestsPage() {
  const { user } = useAuth();
  const { selectedEnterprise } = useEnterprise();
  const queryClient = useQueryClient();
  const permissionSet = useMemo(() => buildPermissionSet(user), [user]);
  const isAdmin = isAdminRole(user);
  const canCreate = isAdmin || permissionSet.has('operational_requests.create');
  const canReadAll = isAdmin || permissionSet.has('operational_requests.read_all');
  const canReview = !isAdmin && permissionSet.has('operational_requests.approve');
  const canReject = !isAdmin && permissionSet.has('operational_requests.reject');
  const canReturn = !isAdmin && permissionSet.has('operational_requests.return');
  const canFinance = permissionSet.has('operational_requests.finance');
  const canAttach = permissionSet.has('operational_requests.manage_attachments');

  // #9 / D6 — Vue par défaut réactive dérivée du profil via useEffect
  const defaultView: ViewFilter = useMemo(
    () => (canReview ? 'review' : canFinance ? 'finance' : canReadAll ? 'all' : 'mine'),
    [canReview, canFinance, canReadAll]
  );
  const [view, setView] = useState<ViewFilter>(defaultView);
  const [hasManuallySelectedView, setHasManuallySelectedView] = useState(false);

  useEffect(() => {
    if (!hasManuallySelectedView) {
      setView(defaultView);
    }
  }, [defaultView, hasManuallySelectedView]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm());
  const [decisionComment, setDecisionComment] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const handleSelectFromUrl = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const openPayment = () => {
    setPaymentOpen(true);
  };

  const closePayment = () => {
    setPaymentOpen(false);
  };

  const listParams =
    view === 'mine'
      ? { mine: true as const, page, limit: LIMIT }
      : view === 'review'
        ? { status: 'SUBMITTED' as const, page, limit: LIMIT }
        : view === 'finance'
          ? { financeQueue: true as const, page, limit: LIMIT }
          : { page, limit: LIMIT };

  // #10 — user?.id inclus dans la queryKey pour isoler le cache par utilisateur
  const requestsQuery = useQuery({
    queryKey: ['operational-requests', selectedEnterprise?.id, user?.id, view, page],
    queryFn: () => operationalRequestsService.list(listParams),
    enabled: Boolean(selectedEnterprise),
  });
  const requests = requestsQuery.data?.data ?? [];
  const meta = requestsQuery.data?.meta;

  // singleRequestQuery est la SEULE source de vérité pour le détail
  const singleRequestQuery = useQuery({
    queryKey: ['operational-request', selectedId],
    queryFn: () => operationalRequestsService.get(selectedId!),
    enabled: Boolean(selectedId),
  });
  const selectedRequest = singleRequestQuery.data?.data ?? null;

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['operational-requests', selectedEnterprise?.id, user?.id] }),
      selectedId
        ? queryClient.invalidateQueries({ queryKey: ['operational-request', selectedId] })
        : Promise.resolve(),
    ]);
    setPage(1);
  };

  const createMutation = useMutation({
    mutationFn: (payload: FormValues) =>
      operationalRequestsService.create({
        ...payload,
        amountRequested: Number(payload.amountRequested),
        desiredDate: payload.desiredDate || undefined,
        details: Object.fromEntries(Object.entries(payload.details).filter(([, value]) => value.trim())),
      }),
    onSuccess: async (response) => {
      setView('mine');
      setSelectedId(response.data.id);
      setShowForm(false);
      setForm(emptyForm());
      setMessage('Brouillon enregistré. Vous pouvez le vérifier puis le soumettre.');
      setError('');
      await invalidate();
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: FormValues }) =>
      operationalRequestsService.update(id, {
        ...payload,
        amountRequested: Number(payload.amountRequested),
        desiredDate: payload.desiredDate || undefined,
        details: Object.fromEntries(Object.entries(payload.details).filter(([, value]) => value.trim())),
      }),
    onSuccess: async (response) => {
      setSelectedId(response.data.id);
      setShowForm(false);
      setEditingId(null);
      setMessage('Modifications enregistrées.');
      setError('');
      await invalidate();
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const actionMutation = useMutation({
    mutationFn: async ({ action, id, comment }: { action: string; id: string; comment?: string }) => {
      if (action === 'submit') return operationalRequestsService.submit(id, comment);
      if (action === 'approve' || action === 'reject' || action === 'return') {
        return operationalRequestsService.decide(id, action, comment);
      }
      if (action === 'financial-processing') return operationalRequestsService.startFinancialProcessing(id, comment);
      if (action === 'sync') return operationalRequestsService.syncCashVoucher(id);
      if (action === 'close') return operationalRequestsService.close(id, comment);
      throw new Error('Action non prise en charge.');
    },
    onSuccess: async (response, variables) => {
      if (view === 'review' && ['approve', 'reject', 'return'].includes(variables.action)) {
        setView(canReadAll ? 'all' : 'mine');
        setSelectedId(canReadAll ? response.data.id : null);
      } else {
        setSelectedId(response.data.id);
      }
      setDecisionComment('');
      setMessage('Action enregistrée.');
      setError('');
      await invalidate();
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const attachmentMutation = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => operationalRequestsService.uploadAttachment(id, file),
    onSuccess: async () => {
      setMessage('Pièce jointe ajoutée.');
      setError('');
      await invalidate();
    },
    onError: (mutationError) => setError(getErrorMessage(mutationError)),
  });

  const cashVoucherMutation = useMutation({
    mutationFn: async ({
      request,
      selection,
    }: {
      request: OperationalRequest;
      selection: CashVoucherSelection;
    }) => {
      if (!selection.treasuryAccountId) throw new Error('Sélectionnez un compte de trésorerie (caisse ou banque).');
      if (!selection.counterpartAccountId) throw new Error('Sélectionnez le compte à débiter (charge, avance, tiers).');
      if (request.status === 'APPROVED') await operationalRequestsService.startFinancialProcessing(request.id);
      const amount = Number(request.amountApproved ?? request.amountRequested);
      try {
        const response = await apiClient.post<{ success?: boolean; message?: string }>('/billing/cash-vouchers', {
          sourceType: 'OPERATIONAL_REQUEST',
          sourceId: request.id,
          sourceNumber: request.requestNumber,
          expenseCategory: request.type,
          enterpriseId: request.enterpriseId,
          enterpriseName: request.enterpriseName,
          serviceId: request.serviceId || undefined,
          serviceName: request.serviceName || undefined,
          beneficiaryName: request.beneficiaryName,
          description: request.reason,
          amountHT: amount,
          amountTVA: 0,
          amountTTC: amount,
          currency: request.currency,
          paymentMethod: selection.paymentMethod,
          flowType: 'DECAISSEMENT',
          treasuryAccountId: selection.treasuryAccountId,
          counterpartAccountId: selection.counterpartAccountId,
          issueDate: new Date().toISOString(),
          status: 'BROUILLON',
          notes: `Created from operational request ${request.requestNumber}`,
        });
        if (!response.data?.success) throw new Error(response.data?.message || "Billing n'a pas créé le bon de caisse.");
      } catch (billingError: unknown) {
        const failure = billingError as { status?: number; response?: { status?: number } };
        if ((failure.status ?? failure.response?.status) !== 409) throw billingError;
        try {
          await operationalRequestsService.linkCashVoucher(request.id);
          return { success: true };
        } catch {
          throw billingError;
        }
      }
      await operationalRequestsService.linkCashVoucher(request.id);

      return { success: true };
    },
    onSuccess: async () => {
      closePayment();
      setMessage('Bon de caisse créé et lié. La comptabilité garde le contrôle de la validation et du décaissement.');
      setError('');
      await invalidate();
    },
    onError: async (mutationError) => {
      setError(getErrorMessage(mutationError));
      await invalidate();
    },
  });

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm());
    setShowForm(true);
    setError('');
  };

  const openEditForm = (request: OperationalRequest) => {
    setEditingId(request.id);
    setForm({
      type: request.type,
      beneficiaryName: request.beneficiaryName,
      reason: request.reason,
      amountRequested: String(request.amountRequested),
      desiredDate: request.desiredDate ? new Date(request.desiredDate).toISOString().slice(0, 10) : '',
      details: Object.fromEntries(
        Object.entries(request.details || {}).map(([key, value]) => [key, String(value ?? '')])
      ),
    });
    setShowForm(true);
    setError('');
  };

  const handleFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (!form.beneficiaryName.trim() || !form.reason.trim() || Number(form.amountRequested) <= 0) {
      setError('Renseignez le bénéficiaire, le motif et un montant supérieur à zéro.');
      return;
    }
    if (editingId) updateMutation.mutate({ id: editingId, payload: form });
    else createMutation.mutate(form);
  };

  const setType = (type: OperationalRequestType) => {
    setForm((current) => ({
      type,
      beneficiaryName: current.beneficiaryName,
      reason: current.reason,
      amountRequested: current.amountRequested,
      desiredDate: current.desiredDate,
      details: {},
    }));
  };

  if (!selectedEnterprise) {
    return (
      <div className="mx-auto max-w-4xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        Choisissez une entreprise active dans le sélecteur général pour consulter ou créer les demandes opérationnelles.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 pb-10 sm:px-6">
      <Suspense fallback={null}>
        <SearchParamSync onSelect={handleSelectFromUrl} />
      </Suspense>
      <div className="rounded-xl border border-blue-100 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
        Entreprise active : <strong className="text-slate-950">{selectedEnterprise.name}</strong>
      </div>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-blue-700">Demandes opérationnelles</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Demandes et approbations</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Créez une demande d’avance, suivez la décision puis le traitement du bon de caisse.
          </p>
        </div>
        {canCreate && (
          <Button className="min-h-11 w-full sm:w-auto" onClick={openCreateForm}>
            <FilePlus2 className="mr-2 h-4 w-4" /> Nouvelle demande
          </Button>
        )}
      </header>

      {message && <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</div>}
      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { key: 'mine', label: 'Mes demandes', visible: true },
          { key: 'review', label: 'À valider', visible: canReview },
          { key: 'finance', label: 'Traitement financier', visible: canFinance },
          { key: 'all', label: 'Toutes du périmètre', visible: canReadAll },
        ]
          .filter((item) => item.visible)
          .map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setHasManuallySelectedView(true);
                setView(item.key as typeof view);
                setSelectedId(null);
                setPage(1);
              }}
              className={`min-h-10 shrink-0 rounded-lg border px-4 text-sm font-medium ${
                view === item.key
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </button>
          ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <section className="space-y-3">
          {requestsQuery.isLoading ? (
            <div className="rounded-xl border bg-white p-8 text-center text-slate-500">Chargement des demandes…</div>
          ) : requests.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-white p-8 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 font-medium text-slate-800">Aucune demande à afficher</p>
              <p className="mt-1 text-sm text-slate-500">Les demandes de cette entreprise apparaîtront ici.</p>
            </div>
          ) : (
            requests.map((request) => (
              <OperationalRequestCard
                key={request.id}
                request={request}
                isSelected={selectedId === request.id}
                canViewRequester={canReadAll || canFinance}
                onSelect={(id) => {
                  setSelectedId(id);
                  setError('');
                }}
              />
            ))
          )}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span className="text-xs text-slate-500">
                {meta.total} demande{meta.total !== 1 ? 's' : ''} · page {meta.page}/{meta.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || requestsQuery.isFetching}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="min-h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  ← Précédent
                </button>
                <button
                  type="button"
                  disabled={page >= meta.totalPages || requestsQuery.isFetching}
                  onClick={() => setPage((p) => p + 1)}
                  className="min-h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Suivant →
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="min-w-0">
          <OperationalRequestDetail
            request={selectedRequest}
            currentUserId={String(user?.id)}
            canReview={canReview}
            canReturn={canReturn}
            canReject={canReject}
            canFinance={canFinance}
            canAttach={canAttach}
            decisionComment={decisionComment}
            isActionPending={actionMutation.isPending}
            isAttachmentPending={attachmentMutation.isPending}
            onClose={() => setSelectedId(null)}
            onEdit={openEditForm}
            onAction={(action, id, comment) => actionMutation.mutate({ action, id, comment })}
            onAttachFile={(file) => selectedRequest && attachmentMutation.mutate({ id: selectedRequest.id, file })}
            onOpenPayment={openPayment}
            onDecisionCommentChange={setDecisionComment}
          />
        </section>
      </div>

      <OperationalRequestFormModal
        isOpen={showForm}
        isEditing={Boolean(editingId)}
        enterpriseName={selectedEnterprise.name}
        form={form}
        error={error}
        isSaving={createMutation.isPending || updateMutation.isPending}
        onClose={() => setShowForm(false)}
        onSubmit={handleFormSubmit}
        onChange={setForm}
        onTypeChange={setType}
      />

      <CashVoucherModal
        isOpen={paymentOpen}
        request={selectedRequest}
        enterpriseId={selectedEnterprise.id}
        isPending={cashVoucherMutation.isPending}
        onClose={closePayment}
        onSubmit={(selection) => selectedRequest && cashVoucherMutation.mutate({ request: selectedRequest, selection })}
      />
    </div>
  );
}
