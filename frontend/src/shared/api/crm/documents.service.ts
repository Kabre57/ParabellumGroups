import apiClient from '../shared/client';
import { Document } from './types';

export const documentsService = {
  async getDocuments(params?: Record<string, any>): Promise<Document[]> {
    const response = await apiClient.get('/documents', { params });
    return response.data;
  },

  async getDocument(id: string): Promise<Document> {
    const response = await apiClient.get(`/documents/${id}`);
    return response.data;
  },

  async createDocument(data: any): Promise<Document> {
    const response = await apiClient.post('/documents/upload', data);
    return response.data;
  },

  async updateDocument(id: string, data: Partial<Document>): Promise<Document> {
    const response = await apiClient.put(`/documents/${id}`, data);
    return response.data;
  },

  async updateDocumentValidity(id: string, data: { estValide: boolean; raison?: string }): Promise<Document> {
    const response = await apiClient.patch(`/documents/${id}/validity`, data);
    return response.data;
  },

  async deleteDocument(id: string): Promise<void> {
    await apiClient.delete(`/documents/${id}`);
  },

  async getDocumentsExpiring(params?: Record<string, any>): Promise<Document[]> {
    const response = await apiClient.get('/documents/expiring', { params });
    return response.data;
  },
};
