import { apiClient } from '../client';

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total?: number;
  totalHT?: number;
  totalTVA?: number;
  totalTTC?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoice_number?: string;
  invoice_num?: string;
  customerId: string;
  customer_id?: string;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  date: string;
  issueDate?: string;
  issue_date?: string;
  dueDate?: string;
  due_date?: string;
  items: InvoiceItem[];
  line_items?: InvoiceItem[];
  notes?: string;
  status: string;
  totalHT?: number;
  totalTTC?: number;
  totalTVA?: number;
  total_ht?: number;
  total_ttc?: number;
  tax_amount?: number;
  tax_rate?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  quote_number?: string;
  customerId: string;
  customer_id?: string;
  customer?: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  date: string;
  validUntil?: string;
  valid_until?: string;
  items: InvoiceItem[];
  notes?: string;
  status: string;
  totalHT?: number;
  totalTTC?: number;
  totalTVA?: number;
  total_ht?: number;
  total_ttc?: number;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface Payment {
  id: string;
  payment_id?: string;
  invoiceId?: string;
  invoice_id?: string;
  invoiceNumber?: string;
  invoice_num?: string;
  payment_date?: string;
  amount: number;
  method: string;
  reference?: string;
  notes?: string;
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

const toNumber = (value: any) => {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const isUuid = (value?: string) => {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
};

const mapInvoiceStatus = (status?: string) => {
  switch (status) {
    case 'BROUILLON':
      return 'DRAFT';
    case 'EMISE':
      return 'SENT';
    case 'PAYEE':
      return 'PAID';
    case 'EN_RETARD':
      return 'OVERDUE';
    case 'ANNULEE':
      return 'CANCELLED';
    default:
      return status || 'DRAFT';
  }
};

const mapInvoiceStatusToApi = (status?: string) => {
  switch (status) {
    case 'DRAFT':
      return 'BROUILLON';
    case 'SENT':
    case 'PENDING':
    case 'PARTIALLY_PAID':
      return 'EMISE';
    case 'PAID':
      return 'PAYEE';
    case 'OVERDUE':
      return 'EN_RETARD';
    case 'CANCELLED':
      return 'ANNULEE';
    default:
      return status;
  }
};

const mapQuoteStatus = (status?: string) => {
  switch (status) {
    case 'BROUILLON':
      return 'DRAFT';
    case 'ENVOYE':
      return 'SENT';
    case 'ACCEPTE':
      return 'ACCEPTED';
    case 'REFUSE':
      return 'REJECTED';
    case 'EXPIRE':
      return 'EXPIRED';
    default:
      return status || 'DRAFT';
  }
};

const mapQuoteStatusToApi = (status?: string) => {
  switch (status) {
    case 'DRAFT':
      return 'BROUILLON';
    case 'SENT':
      return 'ENVOYE';
    case 'ACCEPTED':
      return 'ACCEPTE';
    case 'REJECTED':
      return 'REFUSE';
    case 'EXPIRED':
      return 'EXPIRE';
    default:
      return status;
  }
};

const normalizeLineItems = (data: any): InvoiceItem[] => {
  const items = Array.isArray(data?.line_items)
    ? data.line_items
    : Array.isArray(data?.items)
    ? data.items
    : [];

  return items.map((item: any) => ({
    description: item.description,
    quantity: item.quantity ?? item.quantite ?? 0,
    unitPrice: toNumber(item.unitPrice ?? item.unit_price ?? item.prixUnitaire),
    vatRate: toNumber(item.vatRate ?? item.vat_rate ?? item.tauxTVA ?? data?.tax_rate ?? 0),
  }));
};

const mapInvoiceItem = (line: any): InvoiceItem => {
  const quantity = line.quantite ?? line.quantity ?? 0;
  const unitPrice = toNumber(line.prixUnitaire ?? line.unitPrice ?? line.unit_price);
  const vatRate = toNumber(line.tauxTVA ?? line.vatRate ?? line.vat_rate ?? 0);
  const total = toNumber(line.montantTTC ?? line.total);
  return {
    id: line.id,
    description: line.description,
    quantity,
    unitPrice,
    vatRate,
    total,
    totalHT: toNumber(line.montantHT ?? line.totalHT),
    totalTVA: toNumber(line.montantTVA ?? line.totalTVA),
    totalTTC: total,
  };
};

const mapInvoice = (invoice: any): Invoice => {
  const items = Array.isArray(invoice?.lignes)
    ? invoice.lignes.map(mapInvoiceItem)
    : Array.isArray(invoice?.items)
    ? invoice.items.map(mapInvoiceItem)
    : [];

  const issueDate = invoice.dateEmission || invoice.issue_date || invoice.issueDate || invoice.date;
  const dueDate = invoice.dateEcheance || invoice.due_date || invoice.dueDate;
  const totalHT = toNumber(invoice.montantHT ?? invoice.totalHT ?? invoice.total_ht);
  const totalTVA = toNumber(invoice.montantTVA ?? invoice.totalTVA ?? invoice.tax_amount);
  const totalTTC = toNumber(invoice.montantTTC ?? invoice.totalTTC ?? invoice.total_ttc);

  return {
    id: invoice.id,
    invoiceNumber: invoice.numeroFacture || invoice.invoiceNumber || invoice.invoice_number || invoice.invoice_num,
    invoice_number: invoice.numeroFacture || invoice.invoiceNumber || invoice.invoice_number,
    invoice_num: invoice.id,
    customerId: invoice.clientId || invoice.customerId || invoice.customer_id,
    customer_id: invoice.clientId || invoice.customerId || invoice.customer_id,
    customer: invoice.client || invoice.customer || undefined,
    date: issueDate,
    issueDate,
    issue_date: issueDate,
    dueDate,
    due_date: dueDate,
    items,
    line_items: items,
    notes: invoice.notes || undefined,
    status: mapInvoiceStatus(invoice.status),
    totalHT,
    totalTVA,
    totalTTC,
    total_ht: totalHT,
    total_ttc: totalTTC,
    tax_amount: totalTVA,
    tax_rate: invoice.tauxTVA ?? invoice.tax_rate ?? undefined,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt,
  };
};

const mapQuoteItem = (line: any): InvoiceItem => {
  const quantity = line.quantite ?? line.quantity ?? 0;
  const unitPrice = toNumber(line.prixUnitaire ?? line.unitPrice ?? line.unit_price);
  const vatRate = toNumber(line.tauxTVA ?? line.vatRate ?? line.vat_rate ?? 0);
  const total = toNumber(line.montantTTC ?? line.total);
  return {
    id: line.id,
    description: line.description,
    quantity,
    unitPrice,
    vatRate,
    total,
    totalHT: toNumber(line.montantHT ?? line.totalHT),
    totalTVA: toNumber(line.montantTVA ?? line.totalTVA),
    totalTTC: total,
  };
};

const mapQuote = (quote: any): Quote => {
  const items = Array.isArray(quote?.lignes)
    ? quote.lignes.map(mapQuoteItem)
    : Array.isArray(quote?.items)
    ? quote.items.map(mapQuoteItem)
    : [];

  const issueDate = quote.dateEmission || quote.date || quote.issue_date || quote.issueDate;
  const validUntil = quote.dateValidite || quote.validUntil || quote.valid_until;
  const totalHT = toNumber(quote.montantHT ?? quote.totalHT ?? quote.total_ht);
  const totalTVA = toNumber(quote.montantTVA ?? quote.totalTVA ?? quote.tax_amount);
  const totalTTC = toNumber(quote.montantTTC ?? quote.totalTTC ?? quote.total_ttc);

  return {
    id: quote.id,
    quoteNumber: quote.numeroDevis || quote.quoteNumber || quote.quote_number,
    quote_number: quote.numeroDevis || quote.quoteNumber || quote.quote_number,
    customerId: quote.clientId || quote.customerId || quote.customer_id,
    customer_id: quote.clientId || quote.customerId || quote.customer_id,
    customer: quote.client || quote.customer || undefined,
    date: issueDate,
    validUntil,
    valid_until: validUntil,
    items,
    notes: quote.notes || undefined,
    status: mapQuoteStatus(quote.status),
    totalHT,
    totalTVA,
    totalTTC,
    total_ht: totalHT,
    total_ttc: totalTTC,
    createdAt: quote.createdAt,
    updatedAt: quote.updatedAt,
  };
};

const mapPayment = (payment: any): Payment => {
  return {
    id: payment.id,
    payment_id: payment.id,
    invoiceId: payment.factureId || payment.invoiceId || payment.invoice_id,
    invoice_id: payment.factureId || payment.invoiceId || payment.invoice_id,
    invoiceNumber: payment.facture?.numeroFacture || payment.invoiceNumber || payment.invoice_num,
    invoice_num: payment.facture?.numeroFacture || payment.invoice_num,
    payment_date: payment.datePaiement || payment.payment_date || payment.date,
    amount: toNumber(payment.montant ?? payment.amount),
    method: payment.methodePaiement || payment.method,
    reference: payment.reference || undefined,
    notes: payment.notes || undefined,
    facture: payment.facture,
  };
};

export const billingService = {
  // Quotes
  async getQuotes(params?: Record<string, any>): Promise<Quote[]> {
    const mappedParams = { ...params };
    if (mappedParams?.status && Array.isArray(mappedParams.status)) {
      mappedParams.status = mappedParams.status[0];
    }
    if (mappedParams?.status) {
      mappedParams.status = mapQuoteStatusToApi(mappedParams.status);
    }
    if (mappedParams?.customerId && !mappedParams.clientId) {
      mappedParams.clientId = mappedParams.customerId;
      delete mappedParams.customerId;
    }
    const response = await apiClient.get('/billing/quotes', { params: mappedParams });
    return (response.data || []).map(mapQuote);
  },

  async getQuote(id: string): Promise<Quote> {
    const response = await apiClient.get(`/billing/quotes/${id}`);
    return mapQuote(response.data);
  },

  async createQuote(data: Partial<Quote>): Promise<Quote> {
    const payload = {
      clientId: data.customerId || data.customer_id,
      dateValidite: data.validUntil || data.valid_until,
      status: mapQuoteStatusToApi(data.status),
    };
    const response = await apiClient.post('/billing/quotes', payload);
    const created = mapQuote(response.data);

    const lineItems = normalizeLineItems(data);
    for (const item of lineItems) {
      await apiClient.post(`/billing/quotes/${created.id}/lignes`, {
        description: item.description,
        quantite: item.quantity,
        prixUnitaire: item.unitPrice,
        tauxTVA: item.vatRate ?? 0,
      });
    }

    return this.getQuote(created.id);
  },

  async updateQuote(id: string, data: Partial<Quote>): Promise<Quote> {
    const payload = {
      clientId: data.customerId || data.customer_id,
      dateValidite: data.validUntil || data.valid_until,
      status: mapQuoteStatusToApi(data.status),
    };
    const response = await apiClient.put(`/billing/quotes/${id}`, payload);
    const updated = mapQuote(response.data);

    const lineItems = normalizeLineItems(data);
    for (const item of lineItems) {
      await apiClient.post(`/billing/quotes/${updated.id}/lignes`, {
        description: item.description,
        quantite: item.quantity,
        prixUnitaire: item.unitPrice,
        tauxTVA: item.vatRate ?? 0,
      });
    }

    return this.getQuote(updated.id);
  },

  async deleteQuote(id: string): Promise<void> {
    await apiClient.delete(`/billing/quotes/${id}`);
  },

  async convertQuoteToInvoice(quoteId: string): Promise<Invoice> {
    const response = await apiClient.post(`/billing/quotes/${quoteId}/convert-to-facture`, {});
    return mapInvoice(response.data);
  },

  // Invoices
  async getInvoices(params?: Record<string, any>): Promise<Invoice[]> {
    const mappedParams = { ...params };
    if (mappedParams?.status && Array.isArray(mappedParams.status)) {
      mappedParams.status = mappedParams.status[0];
    }
    if (mappedParams?.status) {
      mappedParams.status = mapInvoiceStatusToApi(mappedParams.status);
    }
    if (mappedParams?.customerId && !mappedParams.clientId) {
      mappedParams.clientId = mappedParams.customerId;
      delete mappedParams.customerId;
    }
    const response = await apiClient.get('/billing/invoices', { params: mappedParams });
    return (response.data || []).map(mapInvoice);
  },

  async getInvoice(id: string): Promise<Invoice> {
    const response = await apiClient.get(`/billing/invoices/${id}`);
    return mapInvoice(response.data);
  },

  async createInvoice(data: Partial<Invoice>): Promise<Invoice> {
    const payload = {
      clientId: data.customerId || data.customer_id,
      dateEcheance: data.dueDate || data.due_date,
      status: mapInvoiceStatusToApi(data.status),
      notes: data.notes,
    };
    const response = await apiClient.post('/billing/invoices', payload);
    const created = mapInvoice(response.data);

    const lineItems = normalizeLineItems(data);
    for (const item of lineItems) {
      await apiClient.post(`/billing/invoices/${created.id}/lignes`, {
        description: item.description,
        quantite: item.quantity,
        prixUnitaire: item.unitPrice,
        tauxTVA: item.vatRate ?? data.tax_rate ?? 0,
      });
    }

    return this.getInvoice(created.id);
  },

  async updateInvoice(id: string, data: Partial<Invoice>): Promise<Invoice> {
    const payload = {
      clientId: data.customerId || data.customer_id,
      dateEcheance: data.dueDate || data.due_date,
      status: mapInvoiceStatusToApi(data.status),
      notes: data.notes,
    };
    const response = await apiClient.put(`/billing/invoices/${id}`, payload);
    const updated = mapInvoice(response.data);

    const lineItems = normalizeLineItems(data);
    for (const item of lineItems) {
      await apiClient.post(`/billing/invoices/${updated.id}/lignes`, {
        description: item.description,
        quantite: item.quantity,
        prixUnitaire: item.unitPrice,
        tauxTVA: item.vatRate ?? data.tax_rate ?? 0,
      });
    }

    return this.getInvoice(updated.id);
  },

  async deleteInvoice(id: string): Promise<void> {
    await apiClient.delete(`/billing/invoices/${id}`);
  },

  // Payments
  async getPayments(params?: Record<string, any>): Promise<Payment[]> {
    const mappedParams = { ...params };
    const invoiceRef = mappedParams.invoiceId || mappedParams.invoice_id || mappedParams.invoice_num;
    if (invoiceRef) {
      let invoiceId = invoiceRef;
      if (!isUuid(invoiceRef)) {
        const invoices = await this.getInvoices();
        const match = invoices.find((inv) => inv.invoiceNumber === invoiceRef || inv.invoice_number === invoiceRef);
        invoiceId = match?.id;
      }
      if (invoiceId) {
        const response = await apiClient.get(`/billing/payments/facture/${invoiceId}`);
        return (response.data || []).map(mapPayment);
      }
    }

    if (mappedParams?.method) {
      mappedParams.methodePaiement = mappedParams.method;
      delete mappedParams.method;
    }
    const response = await apiClient.get('/billing/payments', { params: mappedParams });
    return (response.data || []).map(mapPayment);
  },

  async createPayment(data: Partial<Payment>): Promise<Payment> {
    const payload = {
      factureId: data.invoiceId || data.invoice_id,
      montant: data.amount,
      datePaiement: data.payment_date,
      methodePaiement: data.method,
      reference: data.reference,
      notes: data.notes,
    };
    const response = await apiClient.post('/billing/payments', payload);
    return mapPayment(response.data);
  },

  async allocatePayment(): Promise<void> {
    throw new Error('Not implemented');
  },

  // Reminders
  async getReminders(): Promise<Reminder[]> {
    throw new Error('Not implemented');
  },

  async sendReminder(): Promise<void> {
    throw new Error('Not implemented');
  },

  // Expenses
  async getExpenses(): Promise<Expense[]> {
    throw new Error('Not implemented');
  },

  async createExpense(): Promise<Expense> {
    throw new Error('Not implemented');
  },

  // Stats
  async getInvoiceStats(): Promise<InvoiceStats> {
    const response = await apiClient.get('/billing/invoices/stats');
    const stats = response.data || {};

    let overdueAmount = 0;
    try {
      const overdueInvoices = await this.getInvoices({ status: 'OVERDUE' });
      overdueAmount = overdueInvoices.reduce((sum, invoice) => sum + (invoice.totalTTC || 0), 0);
    } catch (error) {
      overdueAmount = 0;
    }

    return {
      total_invoices: stats.total ?? 0,
      total_revenue: stats.montantTotalTTC ?? 0,
      pending_amount: stats.montantEnAttente ?? 0,
      overdue_amount: overdueAmount,
      ...stats,
    };
  },
};
