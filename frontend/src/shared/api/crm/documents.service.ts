import apiClient from '../shared/client';
import { Document } from './types';

export const documentsService = {
  async getDocuments(params?: Record<string, any>): Promise<Document[]> {
    const response = await apiClient.get('/customers/documents', { params });
    return response.data;
  },

  async getDocument(id: string): Promise<Document> {
    const response = await apiClient.get(`/customers/documents/${id}`);
    return response.data;
  },

  async createDocument(data: any): Promise<Document> {
    const response = await apiClient.post('/customers/documents', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async updateDocument(id: string, data: Partial<Document>): Promise<Document> {
    const response = await apiClient.put(`/customers/documents/${id}`, data);
    return response.data;
  },

  async updateDocumentValidity(id: string, data: { estValide: boolean; raison?: string }): Promise<Document> {
    const response = await apiClient.patch(`/customers/documents/${id}/validity`, data);
    return response.data;
  },

  async deleteDocument(id: string): Promise<void> {
    await apiClient.delete(`/customers/documents/${id}`);
  },

  async getDocumentsExpiring(params?: Record<string, any>): Promise<Document[]> {
    const response = await apiClient.get('/customers/documents/expiring', { params });
    return response.data;
  },
};
