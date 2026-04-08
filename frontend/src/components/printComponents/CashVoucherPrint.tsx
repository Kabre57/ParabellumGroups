'use client';

import React from 'react';
import PrintLayout from './PrintLayout';
import { formatFCFA, formatFCFAInWords, formatPrintDate, resolvePrintLogo, textOrDash } from './printUtils';
import type { Encaissement, Decaissement } from '@/shared/api/billing';

interface CashVoucherPrintProps {
  voucher: (Encaissement | Decaissement) & { flowType?: 'ENCAISSEMENT' | 'DECAISSEMENT' };
  onClose: () => void;
  companyName?: string;
  logoSrc?: string | null;
}

export default function CashVoucherPrint({
  voucher,
  onClose,
  companyName = 'PROGI-TECK',
  logoSrc,
}: CashVoucherPrintProps) {
  const resolvedLogo = resolvePrintLogo(logoSrc);
  const isEncaissement = voucher.flowType === 'ENCAISSEMENT' || ('clientName' in voucher);
  const voucherNumber = 'numeroPiece' in voucher ? voucher.numeroPiece : (voucher as any).voucherNumber;
  const issueDate = 'dateEncaissement' in voucher ? voucher.dateEncaissement : ('dateDecaissement' in voucher ? voucher.dateDecaissement : (voucher as any).issueDate);
  
  // Extraction nom/prénom
  const fullName = ('clientName' in voucher ? voucher.clientName : ('beneficiaryName' in voucher ? voucher.beneficiaryName : '')) || '';
  const firstName = fullName.split(' ')[0] || '-';
  const lastName = fullName.split(' ').slice(1).join(' ') || '-';
  const nomComplet = `${firstName} ${lastName}`.trim();
  const beneficiaryPhone = (voucher as any).beneficiaryPhone || (voucher as any).clientPhone || '-';

  return (
    <PrintLayout title="Bon de caisse" onClose={onClose} hideDefaultHeader>
      {/* Style pour format A5 */}
      <style>
        {`
          @media print {
            @page {
              size: A5;
              margin: 10mm;
            }
            body {
              width: 148mm;
            }
          }
          .print-sheet {
            width: 100%;
            max-width: 148mm;
            margin: 0 auto;
            background: white;
          }
        `}
      </style>
      
      <div className="print-sheet">
        <div className="print-body">
          {/* En-tête avec logo à gauche et titre à droite */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            {/* Logo à gauche */}
            <div>
              {resolvedLogo && (
                <img
                  src={resolvedLogo}
                  alt={companyName}
                  style={{ width: 50, height: 50, objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.src = '/parabellum.jpg';
                  }}
                />
              )}
            </div>
            
            {/* Titre centré ou à droite */}
            <div style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 'bold' }}>{companyName}</div>
              <div style={{ fontSize: 14, fontWeight: 'bold', marginTop: 8 }}>BON DE CAISSE</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>N° {textOrDash(voucherNumber)}</div>
            </div>
            
            {/* Espace pour équilibre */}
            <div style={{ width: 50 }}></div>
          </div>

          {/* Cases Encaissement/Décaissement et Date sur la même ligne */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, fontSize: 12 }}>
            <div>
              <span style={{ marginRight: 16 }}>
                <span style={{ 
                  display: 'inline-block', 
                  width: 14, 
                  height: 14, 
                  border: '1px solid #000', 
                  marginRight: 6,
                  textAlign: 'center',
                  lineHeight: '12px',
                  fontSize: 11
                }}>
                  {isEncaissement ? '✓' : ''}
                </span>
                Encaissement
              </span>
              <span>
                <span style={{ 
                  display: 'inline-block', 
                  width: 14, 
                  height: 14, 
                  border: '1px solid #000', 
                  marginRight: 6,
                  textAlign: 'center',
                  lineHeight: '12px',
                  fontSize: 11
                }}>
                  {!isEncaissement ? '✓' : ''}
                </span>
                Décaissement
              </span>
            </div>
            <div>
              Abidjan, le {formatPrintDate(issueDate)}
            </div>
          </div>

          {/* Titre VERSANT / BENEFICIAIRE */}
          <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 'bold', marginBottom: 16 }}>
            VERSANT / BENEFICIAIRE
          </div>

          {/* Tableau avec nouvelle disposition */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <tbody>
              {/* Ligne 1: NOM & PRENOM (gauche) et N° TELEPHONE (droite) */}
              <tr>
                <td style={{ width: '50%', verticalAlign: 'top', padding: '0 4px 8px 0' }}>
                  <div style={{ border: '1px solid #000', minHeight: 80 }}>
                    <div style={{ 
                      borderBottom: '1px solid #000', 
                      padding: '6px 10px', 
                      fontWeight: 'bold',
                      backgroundColor: '#f5f5f5',
                      fontSize: 11
                    }}>
                      NOM & PRENOM
                    </div>
                    <div style={{ padding: '10px', fontSize: 12 }}>
                      {textOrDash(nomComplet)}
                    </div>
                  </div>
                </td>
                <td style={{ width: '50%', verticalAlign: 'top', padding: '0 0 8px 4px' }}>
                  <div style={{ border: '1px solid #000', minHeight: 80 }}>
                    <div style={{ 
                      borderBottom: '1px solid #000', 
                      padding: '6px 10px', 
                      fontWeight: 'bold',
                      backgroundColor: '#f5f5f5',
                      fontSize: 11
                    }}>
                      N° TELEPHONE
                    </div>
                    <div style={{ padding: '10px', fontSize: 12 }}>
                      {textOrDash(beneficiaryPhone)}
                    </div>
                  </div>
                </td>
              </tr>
              {/* Ligne 2: MOTIF (gauche) et MONTANT TOTAL (droite) */}
              <tr>
                <td style={{ width: '50%', verticalAlign: 'top', padding: '8px 4px 0 0' }}>
                  <div style={{ border: '1px solid #000', minHeight: 70 }}>
                    <div style={{ 
                      borderBottom: '1px solid #000', 
                      padding: '6px 10px', 
                      fontWeight: 'bold',
                      backgroundColor: '#f5f5f5',
                      fontSize: 11
                    }}>
                      MOTIF
                    </div>
                    <div style={{ padding: '10px', fontSize: 12 }}>
                      {textOrDash(voucher.description)}
                    </div>
                  </div>
                </td>
                <td style={{ width: '50%', verticalAlign: 'top', padding: '8px 0 0 4px' }}>
                  <div style={{ border: '1px solid #000', minHeight: 70 }}>
                    <div style={{ 
                      borderBottom: '1px solid #000', 
                      padding: '6px 10px', 
                      fontWeight: 'bold',
                      backgroundColor: '#f5f5f5',
                      fontSize: 11
                    }}>
                      MONTANT TOTAL
                    </div>
                    <div style={{ padding: '10px', fontSize: 12, fontWeight: 'bold' }}>
                      {formatFCFA(voucher.amountTTC)}
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Montant en lettres */}
          <div style={{ 
            border: '1px solid #000', 
            padding: '10px', 
            marginBottom: 20,
            fontSize: 11
          }}>
            Arrêté le présent Bon de Caisse à la somme de :
            <div style={{ fontWeight: 'bold', marginTop: 6, fontSize: 12 }}>
              {formatFCFAInWords(voucher.amountTTC)}
            </div>
          </div>

          {/* Signatures */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ 
                  border: '1px solid #000', 
                  padding: '6px', 
                  textAlign: 'center',
                  width: '33.33%',
                  fontWeight: 'bold',
                  fontSize: 10,
                  backgroundColor: '#f5f5f5'
                }}>
                  Signature du bénéficiaire
                </td>
                <td style={{ 
                  border: '1px solid #000', 
                  padding: '6px', 
                  textAlign: 'center',
                  width: '33.33%',
                  fontWeight: 'bold',
                  fontSize: 10,
                  backgroundColor: '#f5f5f5'
                }}>
                  Signature de la Direction
                </td>
                <td style={{ 
                  border: '1px solid #000', 
                  padding: '6px', 
                  textAlign: 'center',
                  width: '33.34%',
                  fontWeight: 'bold',
                  fontSize: 10,
                  backgroundColor: '#f5f5f5'
                }}>
                  Signature Caisse
                </td>
              </tr>
              <tr>
                <td style={{ border: '1px solid #000', height: 70 }}></td>
                <td style={{ border: '1px solid #000', height: 70 }}></td>
                <td style={{ border: '1px solid #000', height: 70 }}></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </PrintLayout>
  );
}