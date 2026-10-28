'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CashVoucherStatusBadge } from '@/components/accounting/CashVoucherStatusBadge';
import { textOrDash } from '@/components/printComponents/printUtils';

import type { DepensesTableProps } from './DepensesTable';
import { SectionIntro } from './DepensesTableSectionIntro';

export function VouchersTab(props: DepensesTableProps) {
  const { isLoading, activeTab, onTabChange, filteredCommitments, filteredVouchers, filteredEncaissements, filteredDecaissements, consolidatedRows, showEnterpriseColumn, canMutate, formatCurrency, formatDate, sourceLabels, canApprove, onValidateCommitment, onValidateEncaissement, onValidateDecaissement, onUpdateVoucher, onPrintVoucher, onLiquider, onPayer } = props;
  return (
    <TabsContent value="vouchers">
            <SectionIntro
              title="Pieces de caisse"
              description="Cette section conserve les justificatifs de caisse manuels ou historiques. Ils sont utiles pour l'impression et la trace documentaire, mais ne remplacent pas les validations comptables des encaissements et decaissements."
              accentClassName="border-indigo-200 bg-indigo-50/70 text-indigo-900"
            />
            <Card className="overflow-hidden p-0 text-sm md:text-base">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Piece de caisse</th>
                      <th className="px-4 py-3">Origine</th>
                      <th className="px-4 py-3">Beneficiaire</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Compte</th>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3 text-right">Montant TTC</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td className="px-4 py-8 text-center" colSpan={9}>
                          Chargement...
                        </td>
                      </tr>
                    ) : filteredVouchers.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-muted-foreground" colSpan={9}>
                          Aucune piece de caisse enregistree.
                        </td>
                      </tr>
                    ) : (
                      filteredVouchers.map((voucher) => (
                        <tr key={voucher.id} className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <div className="font-medium">{voucher.voucherNumber}</div>
                            <div className="text-xs text-muted-foreground">{formatDate(voucher.issueDate)}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div>{sourceLabels[voucher.sourceType] || voucher.sourceType}</div>
                            <div className="text-xs text-muted-foreground">{voucher.sourceNumber || '-'}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div>{voucher.beneficiaryName}</div>
                            {showEnterpriseColumn && (
                              <div className="text-xs text-muted-foreground">
                                {voucher.enterpriseName || voucher.serviceName || voucher.supplierName || '-'}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">{voucher.paymentMethod}</td>
                          <td className="px-4 py-3">{voucher.treasuryAccountName || '-'}</td>
                          <td className="px-4 py-3">{voucher.reference || '-'}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatCurrency(voucher.amountTTC)}</td>
                          <td className="px-4 py-3">
                            <CashVoucherStatusBadge status={voucher.status} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => onPrintVoucher(voucher)}>
                                Imprimer
                              </Button>
                              {canApprove && (voucher.status === 'EN_ATTENTE' || voucher.status === 'BROUILLON') && (
                                <Button size="sm" variant="secondary" onClick={() => onUpdateVoucher(voucher.id, 'VALIDE')}>
                                  Valider la piece
                                </Button>
                              )}
                              {canApprove && voucher.status === 'VALIDE' && (
                                <Button size="sm" onClick={() => onUpdateVoucher(voucher.id, 'DECAISSE')}>
                                  Confirmer le paiement
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
  );
}
