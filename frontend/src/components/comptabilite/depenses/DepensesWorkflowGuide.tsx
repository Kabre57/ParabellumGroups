'use client';

import {
  ArrowRight,
  FileCheck2,
  HandCoins,
  ReceiptText,
  WalletCards,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

const workflowCards = [
  {
    title: 'Engagement achat',
    icon: FileCheck2,
    className: 'border-blue-200 bg-blue-50/70 text-blue-900',
    description:
      "Dossier d'achat recu de l'exploitation: DPA validee, proforma retenue ou bon de commande confirme.",
    nextStep: "Validation comptable, puis liquidation de la facture fournisseur avant paiement.",
  },
  {
    title: 'Decaissement',
    icon: HandCoins,
    className: 'border-rose-200 bg-rose-50/70 text-rose-900',
    description:
      "Sortie d'argent saisie par la comptabilite pour regler un fournisseur ou une depense.",
    nextStep: "Controle comptable, puis ecriture comptable quand le paiement est confirme.",
  },
  {
    title: 'Encaissement',
    icon: WalletCards,
    className: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    description:
      'Paiement client recu par la facturation ou la caisse, encore en attente de validation comptable.',
    nextStep: "Validation comptable, puis transfert en ecritures comptables.",
  },
  {
    title: 'Bon de caisse',
    icon: ReceiptText,
    className: 'border-indigo-200 bg-indigo-50/70 text-indigo-900',
    description:
      'Piece de caisse imprimable et justificative. Elle documente un mouvement, mais ne remplace pas la validation comptable.',
    nextStep: "Utilisee comme piece de support ou historique des operations de caisse.",
  },
];

const processRows = [
  {
    title: 'Flux achats',
    steps: ['Engagement achat', 'Validation comptable', 'Facture fournisseur', 'Decaissement', 'Ecriture comptable'],
  },
  {
    title: 'Flux ventes',
    steps: ['Paiement client', 'Encaissement', 'Validation comptable', 'Ecriture comptable'],
  },
];

export function DepensesWorkflowGuide() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-base font-semibold text-slate-900">Reperes metier</h2>
          <p className="mt-1 text-sm text-slate-600">
            Cette page regroupe plusieurs objets comptables. Les cartes ci-dessous rappellent leur role exact
            dans le projet.
          </p>
        </div>

        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          {workflowCards.map(({ title, icon: Icon, className, description, nextStep }) => (
            <Card key={title} className={`rounded-xl border p-4 shadow-none ${className}`}>
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-lg bg-white/80 p-2">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
              </div>
              <p className="text-sm leading-6">{description}</p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide opacity-80">Suite attendue</p>
              <p className="mt-1 text-sm leading-6">{nextStep}</p>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {processRows.map((row) => (
          <Card key={row.title} className="rounded-xl border border-slate-200 p-4 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700">{row.title}</h3>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {row.steps.map((step, index) => (
                <div key={`${row.title}-${step}`} className="flex items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
                    {step}
                  </span>
                  {index < row.steps.length - 1 && <ArrowRight className="h-4 w-4 text-slate-400" />}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
