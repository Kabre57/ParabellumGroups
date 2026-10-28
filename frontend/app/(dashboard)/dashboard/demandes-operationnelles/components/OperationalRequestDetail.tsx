'use client';

import { Check, Paperclip, RefreshCw, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OperationalRequest } from '@/shared/api/operationalRequests.service';
import {
  formatDate,
  formatMoney,
  statusColors,
  statusLabels,
  typeDetails,
  typeLabels,
} from '../constants';

interface OperationalRequestDetailProps {
  request: OperationalRequest | null;
  currentUserId: string;
  canReview: boolean;
  canReturn: boolean;
  canReject: boolean;
  canFinance: boolean;
  canAttach: boolean;
  decisionComment: string;
  isActionPending: boolean;
  isAttachmentPending: boolean;
  onClose: () => void;
  onEdit: (request: OperationalRequest) => void;
  onAction: (action: string, id: string, comment?: string) => void;
  onAttachFile: (file: File) => void;
  onOpenPayment: () => void;
  onDecisionCommentChange: (comment: string) => void;
}

export function OperationalRequestDetail({
  request,
  currentUserId,
  canReview,
  canReturn,
  canReject,
  canFinance,
  canAttach,
  decisionComment,
  isActionPending,
  isAttachmentPending,
  onClose,
  onEdit,
  onAction,
  onAttachFile,
  onOpenPayment,
  onDecisionCommentChange,
}: OperationalRequestDetailProps) {
  if (!request) {
    return (
      <div className="hidden rounded-xl border border-dashed bg-white p-8 text-center text-sm text-slate-500 lg:block">
        Sélectionnez une demande pour voir son détail et ses actions.
      </div>
    );
  }

  const isOwner = request.requesterId === currentUserId;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {request.requestNumber}
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">
            {typeLabels[request.type] || request.type}
          </h2>
        </div>
        <button
          type="button"
          aria-label="Fermer le détail"
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColors[request.status]}`}>
          {statusLabels[request.status]}
        </span>
        <span className="text-xs text-slate-500">Entreprise : {request.enterpriseName}</span>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-2">
        <div>
          <span className="text-slate-500">Demandeur</span>
          <p className="font-medium text-slate-900">{request.requesterName}</p>
        </div>
        <div>
          <span className="text-slate-500">Bénéficiaire</span>
          <p className="font-medium text-slate-900">{request.beneficiaryName}</p>
        </div>
        <div>
          <span className="text-slate-500">Montant demandé</span>
          <p className="font-semibold text-slate-900">{formatMoney(request.amountRequested)}</p>
        </div>
        <div>
          <span className="text-slate-500">Date souhaitée</span>
          <p className="font-medium text-slate-900">{formatDate(request.desiredDate)}</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-900">Motif</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{request.reason}</p>
      </div>

      {Object.keys(request.details || {}).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Détails</h3>
          <dl className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Object.entries(request.details)
              .filter(([, value]) => value)
              .map(([key, value]) => (
                <div key={key} className="rounded-lg border p-3">
                  <dt className="text-xs text-slate-500">
                    {typeDetails[request.type]?.find((field) => field.key === key)?.label || key}
                  </dt>
                  <dd className="mt-1 text-sm font-medium text-slate-900">{String(value)}</dd>
                </div>
              ))}
          </dl>
        </div>
      )}

      {request.cashVoucherNumber && (
        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm">
          <span className="font-medium text-indigo-700">Bon de caisse lié :</span>{' '}
          <a
            href={`/dashboard/comptabilite/depenses?id=${request.cashVoucherId}`}
            className="font-semibold text-indigo-900 underline hover:text-indigo-700"
          >
            {request.cashVoucherNumber}
          </a>
        </div>
      )}

      {request.decisionComment && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Commentaire de décision :</strong> {request.decisionComment}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Pièces jointes</h3>
          {canAttach &&
            ['DRAFT', 'NEEDS_INFO', 'APPROVED', 'IN_FINANCIAL_PROCESS', 'CASH_VOUCHER_CREATED', 'DISBURSED'].includes(
              request.status
            ) && (
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <Paperclip className="h-4 w-4" />
                Ajouter
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  className="sr-only"
                  disabled={isAttachmentPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) onAttachFile(file);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            )}
        </div>
        {(request.attachments ?? []).length ? (
          <ul className="space-y-2">
            {(request.attachments ?? []).map((attachment) => (
              <li key={attachment.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <a
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 truncate font-medium text-blue-700 hover:underline"
                >
                  {attachment.fileName}
                </a>
                <span className="shrink-0 text-xs text-slate-500">
                  {(attachment.size / 1024 / 1024).toFixed(1)} Mo
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Aucun justificatif ajouté.</p>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-900">Historique</h3>
        <ol className="space-y-3 border-l border-slate-200 pl-4">
          {(request.approvalLogs ?? []).map((log) => (
            <li key={log.id} className="relative text-sm">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500 ring-1 ring-blue-300" />
              <p className="font-medium text-slate-800">
                {log.action === 'CREATED'
                  ? 'Brouillon créé'
                  : log.action === 'SUBMITTED'
                    ? 'Demande soumise'
                    : log.action === 'APPROVED'
                      ? 'Demande approuvée'
                      : log.action === 'REJECTED'
                        ? 'Demande rejetée'
                        : log.action === 'RETURNED' || log.action === 'NEEDS_INFO'
                          ? 'Retournée pour complément'
                          : log.action === 'CASH_VOUCHER_LINKED'
                            ? 'Bon de caisse lié'
                            : log.action === 'CASH_VOUCHER_CANCELLED'
                              ? 'Bon de caisse annulé'
                              : log.action === 'CASH_VOUCHER_SYNCED'
                                ? 'Statut bon synchronisé'
                                : log.action === 'FINANCIAL_PROCESSING_STARTED'
                                  ? 'Traitement financier démarré'
                                  : log.action === 'DISBURSED'
                                    ? 'Décaissement confirmé'
                                    : log.action === 'CLOSED'
                                      ? 'Demande clôturée'
                                      : log.action === 'UPDATED'
                                        ? 'Demande modifiée'
                                        : log.action.replaceAll('_', ' ')}
              </p>
              <p className="text-xs text-slate-500">
                {log.actorName} ·{' '}
                {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(
                  new Date(log.createdAt)
                )}
              </p>
              {log.comment && <p className="mt-1 text-slate-600">{log.comment}</p>}
            </li>
          ))}
        </ol>
      </div>

      {request.status === 'DRAFT' || request.status === 'NEEDS_INFO' ? (
        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row">
          {isOwner && (
            <>
              <Button variant="outline" className="min-h-11 flex-1" onClick={() => onEdit(request)}>
                Modifier
              </Button>
              <Button
                className="min-h-11 flex-1"
                disabled={isActionPending}
                onClick={() => onAction('submit', request.id)}
              >
                <Send className="mr-2 h-4 w-4" />
                Soumettre
              </Button>
            </>
          )}
        </div>
      ) : null}

      {request.status === 'SUBMITTED' && canReview && !isOwner && (
        <div className="space-y-3 border-t pt-4">
          <label className="block text-sm font-medium text-slate-800">
            Commentaire de décision
            <textarea
              value={decisionComment}
              onChange={(event) => onDecisionCommentChange(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Obligatoire pour un rejet ou un retour."
            />
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button
              className="min-h-11 bg-emerald-600 hover:bg-emerald-700"
              disabled={isActionPending}
              onClick={() => onAction('approve', request.id, decisionComment)}
            >
              <Check className="mr-2 h-4 w-4" />
              Approuver
            </Button>
            {canReturn && (
              <Button
                variant="outline"
                className="min-h-11"
                disabled={!decisionComment.trim() || isActionPending}
                onClick={() => onAction('return', request.id, decisionComment)}
              >
                À compléter
              </Button>
            )}
            {canReject && (
              <Button
                variant="destructive"
                className="min-h-11"
                disabled={!decisionComment.trim() || isActionPending}
                onClick={() => onAction('reject', request.id, decisionComment)}
              >
                Rejeter
              </Button>
            )}
          </div>
        </div>
      )}

      {canFinance && (request.status === 'APPROVED' || request.status === 'IN_FINANCIAL_PROCESS') && (
        <div className="border-t pt-4">
          {request.status === 'APPROVED' && (
            <p className="mb-3 text-sm text-slate-600">
              Montant approuvé :{' '}
              <strong>{formatMoney(request.amountApproved ?? request.amountRequested)}</strong>
            </p>
          )}
          <Button className="min-h-11 w-full" onClick={onOpenPayment}>
            Créer le bon de caisse
          </Button>
        </div>
      )}

      {canFinance && request.status === 'CASH_VOUCHER_CREATED' && (
        <div className="space-y-2 border-t pt-4">
          <p className="text-sm text-slate-700">
            Bon de caisse lié : <strong>{request.cashVoucherNumber || request.cashVoucherId}</strong>
          </p>
          <Button
            variant="outline"
            className="min-h-11 w-full"
            disabled={isActionPending}
            onClick={() => onAction('sync', request.id)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Vérifier le statut du bon
          </Button>
        </div>
      )}

      {canFinance && request.status === 'DISBURSED' && (
        <div className="space-y-2 border-t pt-4">
          <Button
            variant="outline"
            className="min-h-11 w-full"
            disabled={isActionPending}
            onClick={() => onAction('sync', request.id)}
          >
            Vérifier le décaissement
          </Button>
          <Button
            className="min-h-11 w-full"
            disabled={isActionPending}
            onClick={() => onAction('close', request.id, decisionComment)}
          >
            Clôturer le dossier
          </Button>
        </div>
      )}
    </div>
  );
}
