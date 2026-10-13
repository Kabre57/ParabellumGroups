'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CashVoucherStatusBadge } from '@/components/accounting/CashVoucherStatusBadge';
import { textOrDash } from '@/components/printComponents/printUtils';

import type { DepensesTableProps } from './DepensesTable';
import { SectionIntro } from './DepensesTableSectionIntro';

export function DecaissementsTab(props: DepensesTableProps) {
  const { isLoading, activeTab, onTabChange, filteredCommitments, filteredVouchers, filteredEncaissements, filteredDecaissements, consolidatedRows, showEnterpriseColumn, canMutate, formatCurrency, formatDate, sourceLabels, canApprove, onValidateCommitment, onValidateEncaissement, onValidateDecaissement, onUpdateVoucher, onPrintVoucher, onLiquider, onPayer } = props;
  return (
    <TabsContent value="decaissements">
            <SectionIntro
              title="Decaissements"
              description="Ici apparaissent les paiements fournisseurs saisis. Ils peuvent provenir d'un engagement achat liquide ou d'une depense ponctuelle. L'ecriture comptable n'est envoyee qu'apres confirmation."
              accentClassName="border-rose-200 bg-rose-50/70 text-rose-900"
            />
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Piece de paiement</th>
                      {showEnterpriseColumn && <th className="px-4 py-3">Entreprise / Entite</th>}
                      <th className="px-4 py-3">Beneficiaire</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3 text-right">Montant TTC</th>
                      <th className="px-4 py-3">Statut</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td className="px-4 py-8 text-center" colSpan={showEnterpriseColumn ? 9 : 8}>
                          Chargement...
                        </td>
                      </tr>
                    ) : filteredDecaissements.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-muted-foreground" colSpan={showEnterpriseColumn ? 9 : 8}>
                          Aucun decaissement enregistre.
                        </td>
                      </tr>
                    ) : (
                      filteredDecaissements.map((decaissement) => (
                        <tr key={decaissement.id} className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3">{formatDate(decaissement.dateDecaissement)}</td>
                          <td className="px-4 py-3 font-medium">{decaissement.numeroPiece}</td>
                          {showEnterpriseColumn && <td className="px-4 py-3">{decaissement.enterpriseName || decaissement.serviceName || '-'}</td>}
                          <td className="px-4 py-3">{decaissement.beneficiaryName}</td>
                          <td className="px-4 py-3">{decaissement.paymentMethod}</td>
                          <td className="px-4 py-3">{decaissement.reference || '-'}</td>
                          <td className="px-4 py-3 text-right font-bold">{formatCurrency(decaissement.amountTTC)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <Badge className="border-none bg-rose-100 text-rose-800">Paiement fournisseur</Badge>
                              <CashVoucherStatusBadge status={decaissement.status || 'VALIDE'} />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              {canApprove && decaissement.status !== 'DECAISSE' && decaissement.status !== 'ANNULE' ? (
                                <Button size="sm" onClick={() => onValidateDecaissement(decaissement)}>
                                  Valider en compta
                                </Button>
                              ) : null}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  onPrintVoucher({
                                    ...decaissement,
                                    flowType: 'DECAISSEMENT',
                                  })
                                }
                              >
                                Imprimer
                              </Button>
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
