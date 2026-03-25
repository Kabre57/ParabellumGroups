'use client';

import React from 'react';
import type { PurchaseRequest } from '@/services/procurement';
import PrintLayout from './PrintLayout';
import { formatFCFA, formatPrintDate, resolvePrintLogo, textOrDash } from './printUtils';

type CommissionDecisionRow = {
  proformaId: string;
  numeroProforma: string;
  fournisseurNom: string;
  montantTTC: number;
  delaiLivraisonJours: number | null;
  disponibilite: string | null;
  observationsAchat: string | null;
  status: string;
  selectedForOrder: boolean;
  recommendedForApproval: boolean;
  priceScore: number;
  delayScore: number;
  availabilityScore: number;
  supplierScore: number;
  totalScore: number;
  justification: string;
};

interface PurchaseCommissionPrintProps {
  request: PurchaseRequest;
  rows: CommissionDecisionRow[];
  serviceLogoUrl?: string | null;
  onClose: () => void;
}

const thStyle: React.CSSProperties = {
  border: '1px solid #1e3a5f',
  background: '#d8e4f3',
  padding: '7px 6px',
  fontSize: 10,
  fontWeight: 700,
  textAlign: 'left',
};

const tdStyle: React.CSSProperties = {
  border: '1px solid #1e3a5f',
  padding: '7px 6px',
  fontSize: 10,
  verticalAlign: 'top',
};

export default function PurchaseCommissionPrint({
  request,
  rows,
  serviceLogoUrl,
  onClose,
}: PurchaseCommissionPrintProps) {
  const selectedRow = rows.find((row) => row.selectedForOrder) || null;
  const recommendedRow = rows.find((row) => row.recommendedForApproval) || null;
  const bestRow = [...rows].sort((left, right) => left.montantTTC - right.montantTTC)[0] || null;
  const logoSrc = resolvePrintLogo(serviceLogoUrl);

  return (
    <PrintLayout
      title="Commission Achat"
      subtitle={`Procès-verbal de décision - ${request.number}`}
      meta={`Service : ${textOrDash(request.serviceName)}\nDate : ${formatPrintDate(new Date().toISOString(), true)}`}
      onClose={onClose}
      orientation="landscape"
      companyName="Parabellum Groups"
      logoSrc={logoSrc}
      logoAlt={request.serviceName || 'Parabellum Groups'}
    >
      <div className="print-sheet">
        <div className="section-title">Contexte de la DPA</div>
        <table className="table-print" style={{ marginBottom: 14 }}>
          <tbody>
            <tr>
              <td style={{ ...tdStyle, width: '20%', fontWeight: 700 }}>DPA</td>
              <td style={tdStyle}>{textOrDash(request.number)}</td>
              <td style={{ ...tdStyle, width: '20%', fontWeight: 700 }}>Objet</td>
              <td style={tdStyle}>{textOrDash(request.objet || request.title)}</td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: 700 }}>Service demandeur</td>
              <td style={tdStyle}>{textOrDash(request.serviceName)}</td>
              <td style={{ ...tdStyle, fontWeight: 700 }}>Date de besoin</td>
              <td style={tdStyle}>{formatPrintDate(request.dateBesoin)}</td>
            </tr>
          </tbody>
        </table>

        <div className="section-title">Tableau de décision achat</div>
        <table className="table-print">
          <thead>
            <tr>
              <th style={thStyle}>Fournisseur</th>
              <th style={thStyle}>Proforma</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Prix TTC</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Score prix</th>
              <th style={thStyle}>Délai</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Score délai</th>
              <th style={thStyle}>Disponibilité</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Score dispo</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Score fournisseur</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Score total</th>
              <th style={thStyle}>Justification de choix</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.proformaId}>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 700 }}>{row.fournisseurNom}</div>
                  <div>
                    {row.selectedForOrder
                      ? 'Retenue DG'
                      : row.recommendedForApproval
                      ? 'Recommandée achat'
                      : row.status}
                  </div>
                </td>
                <td style={tdStyle}>{row.numeroProforma}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{formatFCFA(row.montantTTC)}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{row.priceScore.toFixed(1)}</td>
                <td style={tdStyle}>
                  {row.delaiLivraisonJours != null ? `${row.delaiLivraisonJours} j` : '-'}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{row.delayScore.toFixed(1)}</td>
                <td style={tdStyle}>{textOrDash(row.disponibilite)}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{row.availabilityScore.toFixed(1)}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{row.supplierScore.toFixed(1)}</td>
                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>{row.totalScore.toFixed(1)}</td>
                <td style={tdStyle}>{textOrDash(row.justification || row.observationsAchat)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="section-title">Procès-verbal de décision</div>
        <table className="table-print" style={{ marginBottom: 16 }}>
          <tbody>
            <tr>
              <td style={{ ...tdStyle, width: '22%', fontWeight: 700 }}>Moins-disant</td>
              <td style={tdStyle}>
                {bestRow ? `${bestRow.fournisseurNom} - ${bestRow.numeroProforma} (${formatFCFA(bestRow.montantTTC)})` : '-'}
              </td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: 700 }}>Proposition du service achat</td>
              <td style={tdStyle}>
                {recommendedRow
                  ? `${recommendedRow.fournisseurNom} - ${recommendedRow.numeroProforma}`
                  : 'Aucune recommandation formalisée'}
              </td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: 700 }}>Décision retenue</td>
              <td style={tdStyle}>
                {selectedRow
                  ? `${selectedRow.fournisseurNom} - ${selectedRow.numeroProforma}`
                  : 'En attente de validation finale'}
              </td>
            </tr>
            <tr>
              <td style={{ ...tdStyle, fontWeight: 700 }}>Motif / justification</td>
              <td style={tdStyle}>
                {textOrDash(
                  selectedRow?.justification ||
                    recommendedRow?.justification ||
                    selectedRow?.observationsAchat ||
                    recommendedRow?.observationsAchat
                )}
              </td>
            </tr>
          </tbody>
        </table>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, marginTop: 22 }}>
          <div style={{ borderTop: '1px solid #0f172a', paddingTop: 8, fontSize: 11 }}>Service achat</div>
          <div style={{ borderTop: '1px solid #0f172a', paddingTop: 8, fontSize: 11 }}>Commission / contrôle interne</div>
          <div style={{ borderTop: '1px solid #0f172a', paddingTop: 8, fontSize: 11 }}>Direction Générale</div>
        </div>
      </div>
    </PrintLayout>
  );
}
