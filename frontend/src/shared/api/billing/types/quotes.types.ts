// Types de devis, factures et réponses client.
export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  imageUrl?: string | null;
  quantite?: number;
  prixUnitaire?: number;
  tauxTVA?: number;
  total?: number;
  totalHT?: number;
  totalTVA?: number;
  totalTTC?: number;
  montantHT?: number;
  montantTVA?: number;
  montantTTC?: number;
}

export interface Invoice {
  id: string;
  numeroFacture: string;
  clientId: string;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  serviceId?: string;
  serviceName?: string;
  serviceLogoUrl?: string;
  commercialId?: string | null;
  commercialName?: string | null;
  commercialEmail?: string | null;
  client?: {
    nom: string;
    email?: string;
    telephone?: string;
    adresse?: string;
  };
  dateFacture: string;
  dateEcheance?: string;
  lignes: InvoiceItem[];
  notes?: string;
  status: 'BROUILLON' | 'ENVOYEE' | 'EMISE' | 'PAYEE' | 'PARTIELLEMENT_PAYEE' | 'EN_RETARD' | 'ANNULEE';
  montantHT: number;
  montantTTC: number;
  montantTVA: number;
  montantPaye?: number;
  avoirs?: CreditNote[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Quote {
  id: string;
  numeroDevis: string;
  clientId?: string | null;
  prospectId?: string | null;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  objet?: string | null;
  notes?: string | null;
  modeLivraison?: string | null;
  modalitePaiement?: string | null;
  serviceId?: string;
  serviceName?: string;
  serviceLogoUrl?: string;
  client?: {
    nom: string;
    email?: string;
    telephone?: string;
    adresse?: string;
  };
  dateDevis: string;
  dateValidite?: string;
  lignes: InvoiceItem[];
  status:
    | 'BROUILLON'
    | 'ENVOYE'
    | 'MODIFICATION_DEMANDEE'
    | 'ACCEPTE'
    | 'REFUSE'
    | 'EXPIRE'
    | 'TRANSMIS_FACTURATION'
    | 'FACTURE';
  montantHT: number;
  montantTTC: number;
  montantTVA: number;
  sentAt?: string | null;
  clientRespondedAt?: string | null;
  clientComment?: string | null;
  revisionNumber?: number;
  approvalUrl?: string;
  forwardedToBillingAt?: string | null;
  forwardedToBillingBy?: string | null;
  convertedInvoiceId?: string | null;
  convertedInvoiceNumber?: string | null;
  acceptedAt?: string | null;
  refusedAt?: string | null;
  evenements?: QuoteEvent[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicQuoteResponsePayload {
  action: 'ACCEPT' | 'REQUEST_MODIFICATION' | 'REFUSE';
  comment?: string;
}

export interface QuoteEvent {
  id: string;
  devisId: string;
  type: string;
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  note?: string | null;
  payload?: Record<string, unknown> | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  factureId: string;
  facture?: Invoice;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  montant: number;
  datePaiement: string;
  modePaiement: 'VIREMENT' | 'CHEQUE' | 'ESPECES' | 'CARTE' | 'PRELEVEMENT';
  reference?: string;
  notes?: string;
  treasuryAccountId?: string | null;
  treasuryAccountName?: string | null;
  createdAt?: string;
}

export interface CreditNoteLine {
  id?: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
  tauxTVA: number;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
}

export interface CreditNote {
  id: string;
  numeroAvoir: string;
  factureId: string;
  factureNumero: string;
  clientId: string;
  enterpriseId?: number | null;
  enterpriseName?: string | null;
  serviceId?: string | null;
  serviceName?: string | null;
  serviceLogoUrl?: string | null;
  motif: string;
  notes?: string | null;
  montantHT: number;
  montantTVA: number;
  montantTTC: number;
  status: 'BROUILLON' | 'EMISE' | 'APPLIQUE' | 'ANNULE';
  lignes: CreditNoteLine[];
  createdAt?: string;
  updatedAt?: string;
}

export interface InvoiceStats {
  totalFactures?: number;
  chiffreAffaires: number;
  montantEnAttente: number;
  montantEnRetard: number;
  facturesPayees: number;
  facturesEnRetard: number;
  brouillon?: number;
  emises?: number;
  annulees?: number;
}

export interface QuoteStats {
  totalDevis: number;
  montantTotal: number;
  devisAcceptes: number;
  devisEnAttente: number;
  tauxConversion: number;
}
