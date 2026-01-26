# Guide d'Intégration - Fonctionnalités CRUD et Impression

Ce document explique comment utiliser les nouvelles fonctionnalités CRUD et d'impression ajoutées au projet.

## 📁 Composants d'Impression

Les composants d'impression sont situés dans `frontend/src/components/PrintComponents/`:

### 1. ContractPrint.tsx
**Usage:** Impression de contrats de travail (CDI, CDD, STAGE, FREELANCE)

```tsx
import ContractPrint from '@/components/PrintComponents/ContractPrint';

// Dans votre composant
const [showPrint, setShowPrint] = useState(false);

{showPrint && (
  <ContractPrint
    contract={{
      id: "contract-123",
      type: "CDI",
      employee: {
        firstName: "Jean",
        lastName: "Dupont",
        email: "jean.dupont@example.com",
        phone: "+225 01 02 03 04 05",
        address: "Abidjan, Cocody",
        position: "Développeur Senior"
      },
      startDate: "2026-02-01",
      salary: 1500000,
      workingHours: "40 heures par semaine, du lundi au vendredi",
      benefits: "Assurance santé, tickets restaurant",
      createdAt: new Date().toISOString()
    }}
    onClose={() => setShowPrint(false)}
  />
)}
```

### 2. InvoicePrint.tsx
**Usage:** Impression de factures

```tsx
import InvoicePrint from '@/components/PrintComponents/InvoicePrint';

{showPrint && (
  <InvoicePrint
    invoice={{
      id: "inv-123",
      invoiceNumber: "FACT-2026-001",
      date: "2026-01-21",
      dueDate: "2026-02-20",
      customer: {
        name: "Société ACME",
        email: "contact@acme.ci",
        phone: "+225 27 20 30 40 50",
        address: "Abidjan, Plateau"
      },
      items: [
        {
          description: "Développement application web",
          quantity: 1,
          unitPrice: 5000000,
          vatRate: 18
        }
      ],
      notes: "Paiement à 30 jours",
      status: "PENDING"
    }}
    onClose={() => setShowPrint(false)}
  />
)}
```

### 3. PayslipPrint.tsx
**Usage:** Impression de bulletins de paie (conforme réglementation CI)

```tsx
import PayslipPrint from '@/components/PrintComponents/PayslipPrint';

{showPrint && (
  <PayslipPrint
    salary={{
      id: "pay-123",
      employee: {
        firstName: "Marie",
        lastName: "Koné",
        matricule: "EMP-2024-001",
        cnpsNumber: "1234567890",
        cnamNumber: "0987654321",
        position: "Chef de projet"
      },
      period: "2026-01-01",
      baseSalary: 800000,
      overtime: 50000,
      bonuses: 100000,
      deductions: [
        { label: "Prêt bancaire", amount: 50000 },
        { label: "IGR", rate: 15, amount: 120000 }
      ],
      netSalary: 680000,
      createdAt: new Date().toISOString()
    }}
    onClose={() => setShowPrint(false)}
  />
)}
```

### 4. QuotePrint.tsx
**Usage:** Impression de devis

```tsx
import QuotePrint from '@/components/PrintComponents/QuotePrint';

{showPrint && (
  <QuotePrint
    quote={{
      id: "quote-123",
      quoteNumber: "DEVIS-2026-001",
      date: "2026-01-21",
      validUntil: "2026-02-21",
      customer: {
        name: "Entreprise XYZ",
        email: "contact@xyz.ci"
      },
      items: [
        {
          description: "Consultation technique",
          quantity: 10,
          unitPrice: 50000,
          vatRate: 18
        }
      ],
      createdBy: {
        firstName: "Paul",
        lastName: "N'Guessan"
      },
      status: "SENT"
    }}
    onClose={() => setShowPrint(false)}
  />
)}
```

## 🔧 Services API

### Service HR (Contrats et Bulletins)

**Fichier:** `frontend/src/shared/api/services/hr.ts`

#### Contrats
```typescript
import { hrService } from '@/shared/api/services/hr';

// Récupérer tous les contrats
const contracts = await hrService.getAllContracts({ page: 1, pageSize: 20 });

// Récupérer un contrat spécifique
const contract = await hrService.getContract('contract-id');

// Créer un nouveau contrat
const newContract = await hrService.createContract({
  employeeId: 'emp-123',
  contractType: 'CDI',
  startDate: '2026-02-01',
  salary: 1500000,
  currency: 'XOF',
  workHoursPerWeek: 40,
  position: 'Développeur',
  department: 'IT'
});

// Mettre à jour un contrat
const updated = await hrService.updateContract('contract-id', {
  salary: 1600000
});

// Supprimer un contrat
await hrService.deleteContract('contract-id');
```

#### Bulletins de paie
```typescript
// Récupérer tous les bulletins
const payslips = await hrService.getPayroll({ page: 1, pageSize: 20 });

// Récupérer un bulletin spécifique
const payslip = await hrService.getPayrollById('payslip-id');

// Créer un bulletin
const newPayslip = await hrService.createPayroll({
  employeeId: 'emp-123',
  period: '2026-01',
  month: 1,
  year: 2026,
  grossSalary: 800000,
  deductions: 120000,
  bonuses: 50000,
  currency: 'XOF'
});

// Générer automatiquement un bulletin
const generated = await hrService.generatePayslip('emp-123', '2026-01');
```

### Service Billing (Factures et Devis)

**Fichier:** `frontend/src/shared/api/services/billing.ts`

#### Devis
```typescript
import { billingService } from '@/shared/api/services/billing';

// Récupérer tous les devis
const quotes = await billingService.getQuotes({ status: 'SENT' });

// Récupérer un devis
const quote = await billingService.getQuote('quote-id');

// Créer un devis
const newQuote = await billingService.createQuote({
  customerId: 'customer-123',
  quoteNumber: 'DEVIS-2026-001',
  date: '2026-01-21',
  validUntil: '2026-02-21',
  items: [
    {
      description: 'Service',
      quantity: 1,
      unitPrice: 100000,
      vatRate: 18
    }
  ],
  status: 'DRAFT'
});

// Convertir un devis en facture
const invoice = await billingService.convertQuoteToInvoice('quote-id');
```

#### Factures
```typescript
// Récupérer toutes les factures
const invoices = await billingService.getInvoices({ status: 'PENDING' });

// Créer une facture
const newInvoice = await billingService.createInvoice({
  customerId: 'customer-123',
  invoiceNumber: 'FACT-2026-001',
  date: '2026-01-21',
  dueDate: '2026-02-20',
  items: [/* ... */],
  status: 'PENDING'
});
```

## 🪝 Hooks React Query

### useContracts

**Fichier:** `frontend/src/hooks/useContracts.ts`

```tsx
import { useContracts, useContract, useCreateContract, useUpdateContract, useDeleteContract } from '@/hooks/useContracts';

function ContractsPage() {
  // Récupérer la liste
  const { data, isLoading, error } = useContracts({ page: 1, pageSize: 20 });
  
  // Créer
  const createMutation = useCreateContract();
  const handleCreate = () => {
    createMutation.mutate({
      employeeId: 'emp-123',
      contractType: 'CDI',
      // ... autres champs
    });
  };
  
  // Mettre à jour
  const updateMutation = useUpdateContract();
  const handleUpdate = (id: string) => {
    updateMutation.mutate({
      id,
      data: { salary: 1600000 }
    });
  };
  
  // Supprimer
  const deleteMutation = useDeleteContract();
  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };
}
```

### usePayslips

**Fichier:** `frontend/src/hooks/usePayslips.ts`

```tsx
import { usePayslips, useGeneratePayslip } from '@/hooks/usePayslips';

function PayslipsPage() {
  const { data } = usePayslips({ page: 1 });
  const generateMutation = useGeneratePayslip();
  
  const handleGenerate = () => {
    generateMutation.mutate({
      employeeId: 'emp-123',
      period: '2026-01'
    });
  };
}
```

### useQuotes

**Fichier:** `frontend/src/hooks/useQuotes.ts`

```tsx
import { useQuotes, useCreateQuote, useConvertQuoteToInvoice } from '@/hooks/useQuotes';

function QuotesPage() {
  const { data } = useQuotes();
  const createMutation = useCreateQuote();
  const convertMutation = useConvertQuoteToInvoice();
  
  const handleConvert = (quoteId: string) => {
    convertMutation.mutate(quoteId);
  };
}
```

### useInvoices

**Fichier:** `frontend/src/hooks/useInvoices.ts`

```tsx
import { useInvoices, useInvoiceStats } from '@/hooks/useInvoices';

function InvoicesPage() {
  const { data } = useInvoices();
  const { data: stats } = useInvoiceStats();
}
```

## 📋 Exemple Complet d'Intégration

Voici un exemple complet d'une page de gestion de contrats avec impression:

```tsx
'use client';

import React, { useState } from 'react';
import { useContracts, useDeleteContract } from '@/hooks/useContracts';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ContractPrint from '@/components/PrintComponents/ContractPrint';

export default function ContractsPage() {
  const [selectedContract, setSelectedContract] = useState(null);
  const [showPrint, setShowPrint] = useState(false);
  
  const { data, isLoading } = useContracts({ pageSize: 100 });
  const deleteMutation = useDeleteContract();
  
  const handlePrint = (contract) => {
    setSelectedContract(contract);
    setShowPrint(true);
  };
  
  const handleDelete = (id: string) => {
    if (confirm('Confirmer la suppression ?')) {
      deleteMutation.mutate(id);
    }
  };
  
  if (isLoading) return <div>Chargement...</div>;
  
  return (
    <div className="p-6">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">Contrats</h1>
        
        <div className="space-y-4">
          {data?.data?.map((contract) => (
            <div key={contract.id} className="border p-4 rounded flex justify-between items-center">
              <div>
                <p className="font-semibold">{contract.position}</p>
                <p className="text-sm text-gray-600">{contract.contractType}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => handlePrint(contract)}>
                  Imprimer
                </Button>
                <Button variant="outline" onClick={() => handleDelete(contract.id)}>
                  Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      
      {showPrint && selectedContract && (
        <ContractPrint
          contract={selectedContract}
          onClose={() => {
            setShowPrint(false);
            setSelectedContract(null);
          }}
        />
      )}
    </div>
  );
}
```

## 🎨 Personnalisation

### Logo de l'entreprise

Placez le logo `parabellum.jpg` dans le dossier `frontend/public/`.

### Informations légales

Les informations légales (IDU, CNPS, etc.) sont définies dans les composants. Pour les modifier:

1. Ouvrez le composant (ex: `ContractPrint.tsx`)
2. Cherchez les mentions "PARABELLUM GROUP", "IDU: CI-2019-0046392 R", etc.
3. Remplacez par vos propres informations

### Devise

Tous les composants utilisent le Franc CFA (XOF). Pour changer:

```tsx
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR', // Changez ici
  }).format(amount);
};
```

## ✅ Checklist d'Installation

- [x] Composants d'impression créés dans `frontend/src/components/PrintComponents/`
- [x] Services API étendus (`hr.ts`, `billing.ts`)
- [x] Hooks React Query créés (`useContracts`, `usePayslips`, `useQuotes`, `useInvoices`)
- [ ] Logo `parabellum.jpg` ajouté dans `frontend/public/`
- [ ] Backend API endpoints implémentés pour contrats, bulletins, devis, factures
- [ ] Pages frontend créées pour gérer ces entités
- [ ] Tests des impressions effectués

## 🚀 Prochaines Étapes

1. Implémenter les endpoints backend dans les microservices (HR service, Billing service)
2. Créer les pages frontend pour lister et gérer contrats, bulletins, devis, factures
3. Ajouter les formulaires de création/édition
4. Tester les impressions sur différents navigateurs
5. Valider la conformité légale pour la Côte d'Ivoire

## 📞 Support

Pour toute question sur l'intégration de ces fonctionnalités, consultez la documentation ou créez une issue.
