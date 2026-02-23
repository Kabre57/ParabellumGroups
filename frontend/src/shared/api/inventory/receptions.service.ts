
import { apiClient } from "../shared/client";
import { ApiResponse } from "../shared/types";
import { Reception, ReceptionStatus } from "./types";

export const inventoryReceptionsService = {
  async list(params?: {
    status?: ReceptionStatus;
    search?: string;
    limit?: number;
    page?: number;
  }): Promise<ApiResponse<Reception[]>> {
    const response = await apiClient.get("/inventory/receptions", {
      params: { ...params, _ts: Date.now() },
    });
    return response.data;
  },

  async get(id: string): Promise<ApiResponse<Reception>> {
    const response = await apiClient.get(`/inventory/receptions/${id}`, {
      params: { _ts: Date.now() },
    });
    return response.data;
  },

  async create(data: {
    bonCommandeId: string;
    fournisseurId?: string;
    notes?: string;
    lignes: {
      articleId: string | null;
      designation?: string;
      quantitePrev: number;
      quantiteRecue: number;
      prixUnitaire: number;
      tva?: number;
    }[];
  }): Promise<ApiResponse<Reception>> {
    const response = await apiClient.post("/inventory/receptions", data);
    return response.data;
  },

  async validate(id: string, payload?: { notes?: string }): Promise<ApiResponse<Reception>> {
    const response = await apiClient.patch(`/inventory/receptions/${id}/validate`, payload ?? {});
    return response.data;
  },
};
