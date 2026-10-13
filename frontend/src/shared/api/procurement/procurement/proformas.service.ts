// Appels API pour les proformas et leur évaluation.
import { apiClient } from '../../shared/client';
import type { PurchaseRequest, PurchaseProforma, PurchaseOrderStatus } from '../types';
import { normalizePurchaseProforma, normalizePurchaseRequest, normalizeDetailResponse } from '../shared';
import type { DetailResponse } from '../shared';

export const proformasMethods = {
  async createProforma(
    requestId: string,
    data: {
      titre?: string;
      fournisseurId: string;
      devise?: string;
      notes?: string;
      delaiLivraisonJours?: number;
      disponibilite?: string;
      observationsAchat?: string;
      lignes: Array<{
        articleId?: string | null;
        referenceArticle?: string | null;
        designation: string;
        categorie?: string | null;
        unite?: string | null;
        quantite: number;
        prixUnitaire: number;
        tva?: number;
      }>;
    }
  ): Promise<DetailResponse<PurchaseProforma>> {
    const response = await apiClient.post(`/procurement/devis-achat/${requestId}/proformas`, data);
    const normalized = normalizeDetailResponse<PurchaseProforma>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseProforma(normalized.data),
    };
  },

  async submitProforma(
    requestId: string,
    proformaId: string,
    commentaire?: string
  ): Promise<DetailResponse<PurchaseProforma>> {
    const response = await apiClient.post(
      `/procurement/devis-achat/${requestId}/proformas/${proformaId}/submit`,
      { commentaire }
    );
    const normalized = normalizeDetailResponse<PurchaseProforma>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseProforma(normalized.data),
    };
  },

  async approveProforma(
    requestId: string,
    proformaId: string,
    commentaire?: string
  ): Promise<DetailResponse<PurchaseProforma>> {
    const response = await apiClient.post(
      `/procurement/devis-achat/${requestId}/proformas/${proformaId}/approve`,
      { commentaire }
    );
    const normalized = normalizeDetailResponse<PurchaseProforma>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseProforma(normalized.data),
    };
  },

  async rejectProforma(
    requestId: string,
    proformaId: string,
    raison?: string
  ): Promise<DetailResponse<PurchaseProforma>> {
    const response = await apiClient.post(
      `/procurement/devis-achat/${requestId}/proformas/${proformaId}/reject`,
      { commentaire: raison }
    );
    const normalized = normalizeDetailResponse<PurchaseProforma>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseProforma(normalized.data),
    };
  },

  async recommendProforma(
    requestId: string,
    proformaId: string
  ): Promise<DetailResponse<PurchaseProforma>> {
    const response = await apiClient.post(
      `/procurement/devis-achat/${requestId}/proformas/${proformaId}/recommend`
    );
    const normalized = normalizeDetailResponse<PurchaseProforma>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseProforma(normalized.data),
    };
  },

  async saveProformaCommitteeEvaluation(
    requestId: string,
    proformaId: string,
    data: {
      profileCode?: string;
      eliminatoryChecks?: Array<{
        criterionIndex: number;
        label: string;
        requiredDocument?: string | null;
        passed: boolean | null;
        notes?: string | null;
      }>;
      technicalScores?: Array<{
        criterionIndex: number;
        label: string;
        maxPoints: number;
        points: number;
        notes?: string | null;
      }>;
      financialCriterion?: {
        criterionIndex: number;
        label: string;
        maxPoints: number;
        notes?: string | null;
      } | null;
      decision?: string | null;
      decisionNote?: string | null;
      signDecision?: boolean;
    }
  ): Promise<DetailResponse<PurchaseProforma>> {
    const response = await apiClient.post(
      `/procurement/devis-achat/${requestId}/proformas/${proformaId}/committee-evaluation`,
      data
    );
    const normalized = normalizeDetailResponse<PurchaseProforma>(response.data);
    return {
      ...normalized,
      data: normalizePurchaseProforma(normalized.data),
    };
  },

  async generateOrderFromRequest(
    id: string,
    commentaire?: string,
    proformaId?: string
  ): Promise<
    DetailResponse<{
      purchaseQuote: PurchaseRequest;
      purchaseOrder: { id: string; numeroBon: string; status: PurchaseOrderStatus };
    }>
  > {
    const response = await apiClient.post(`/procurement/devis-achat/${id}/generate-order`, {
      commentaire,
      proformaId,
    });
    const normalized = normalizeDetailResponse<any>(response.data);
    return {
      success: normalized.success,
      message: normalized.message,
      data: {
        purchaseQuote: normalizePurchaseRequest(normalized.data?.purchaseQuote),
        purchaseOrder: normalized.data?.purchaseOrder,
      },
    };
  },

  async deleteRequest(id: string): Promise<{ success: boolean; message?: string }> {
    const response = await apiClient.delete(`/procurement/devis-achat/${id}`);
    return response.data;
  },
};
