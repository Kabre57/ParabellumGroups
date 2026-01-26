import { apiClient } from '../client';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  date: string;
  dueDate?: string;
  items: InvoiceItem[];
  notes?: string;
  status: string;
  totalHT?: number;
  totalTTC?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  customerId: string;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  date: string;
  validUntil?: string;
  items: InvoiceItem[];
  notes?: string;
  status: string;
  totalHT?: number;
  totalTTC?: number;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface Payment {
  payment_id: number;
  payment_date: string;
  amount: number;
  method: string;
  [key: string]: any;
}

export interface Reminder {
  reminder_id: number;
  invoice_num: string;
  reminder_date: string;
  reminder_level: number;
  [key: string]: any;
}

export interface Expense {
  expense_id: number;
  expense_date: string;
  amount: number;
  category: string;
  [key: string]: any;
}

export interface InvoiceStats {
  total_invoices: number;
  total_revenue: number;
  pending_amount: number;
  overdue_amount: number;
  [key: string]: any;
}

export const billingService = {
  // Gestion des devis
  async getQuotes(params?: Record<string, any>): Promise<Quote[]> {
    const response = await apiClient.get('/billing/quotes', { params });
    return response.data;
  },

  async getQuote(id: string): Promise<Quote> {
    const response = await apiClient.get(`/billing/quotes/${id}`);
    return response.data;
  },

  async createQuote(data: Partial<Quote>): Promise<Quote> {
    const response = await apiClient.post('/billing/quotes', data);
    return response.data;
  },

  async updateQuote(id: string, data: Partial<Quote>): Promise<Quote> {
    const response = await apiClient.put(`/billing/quotes/${id}`, data);
    return response.data;
  },

  async deleteQuote(id: string): Promise<void> {
    await apiClient.delete(`/billing/quotes/${id}`);
  },

  async convertQuoteToInvoice(quoteId: string): Promise<Invoice> {
    const response = await apiClient.post(`/billing/quotes/${quoteId}/convert`);
    return response.data;
  },

  // Gestion des factures
  async getInvoices(params?: Record<string, any>): Promise<Invoice[]> {
    const response = await apiClient.get('/billing/invoices', { params });
    return response.data;
  },

  async getInvoice(id: string): Promise<Invoice> {
    const response = await apiClient.get(`/billing/invoices/${id}`);
    return response.data;
  },

  async createInvoice(data: Partial<Invoice>): Promise<Invoice> {
    const response = await apiClient.post('/billing/invoices', data);
    return response.data;
  },

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice> {
    const response = await apiClient.put(`/billing/invoices/${id}`, data);
    return response.data;
  },

  async deleteInvoice(id: string): Promise<void> {
    await apiClient.delete(`/billing/invoices/${id}`);
  },

  // Gestion des paiements
  async getPayments(params?: Record<string, any>): Promise<Payment[]> {
    const response = await apiClient.get('/billing/payments', { params });
    return response.data;
  },

  async createPayment(data: Partial<Payment>): Promise<Payment> {
    const response = await apiClient.post('/billing/payments', data);
    return response.data;
  },

  async allocatePayment(paymentId: number, invoiceId: string, amount: number): Promise<void> {
    await apiClient.post(`/billing/payments/${paymentId}/allocate`, {
      invoice_id: invoiceId,
      amount,
    });
  },

  // Relances
  async getReminders(params?: Record<string, any>): Promise<Reminder[]> {
    const response = await apiClient.get('/billing/reminders', { params });
    return response.data;
  },

  async sendReminder(invoiceNum: string): Promise<void> {
    await apiClient.post(`/billing/invoices/${invoiceNum}/remind`);
  },

  // Dépenses
  async getExpenses(params?: Record<string, any>): Promise<Expense[]> {
    const response = await apiClient.get('/billing/expenses', { params });
    return response.data;
  },

  async createExpense(data: Partial<Expense>): Promise<Expense> {
    const response = await apiClient.post('/billing/expenses', data);
    return response.data;
  },

  // Statistiques
  async getInvoiceStats(): Promise<InvoiceStats> {
    const response = await apiClient.get('/billing/invoices/stats');
    return response.data;
  },
};
