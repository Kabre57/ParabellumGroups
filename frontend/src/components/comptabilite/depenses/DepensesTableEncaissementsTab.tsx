'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CashVoucherStatusBadge } from '@/components/accounting/CashVoucherStatusBadge';
import { textOrDash } from '@/components/printComponents/printUtils';

import type { DepensesTableProps } from './DepensesTable';
import { SectionIntro } from './DepensesTableSectionIntro';

export function EncaissementsTab(props: DepensesTableProps) {
  const { isLoading, activeTab, onTabChange, filteredCommitments, filteredVouchers, filteredEncaissements, filteredDecaissements, consolidatedRows, showEnterpriseColumn, canMutate, formatCurrency, formatDate, sourceLabels, canApprove, onValidateCommitment, onValidateEncaissement, onValidateDecaissement, onUpdateVoucher, onPrintVoucher, onLiquider, onPayer } = props;
  return (
    <TabsContent value="encaissements">
            <SectionIntro
              title="Encaissements"
              description="Les paiements clients recus par la facturation ou la caisse arrivent ici en attente. Le comptable valide ensuite l'encaissement avant generation de l'ecriture."
              accentClassName="border-emerald-200 bg-emerald-50/70 text-emerald-900"
            />
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Piece d'encaissement</th>
                      {showEnterpriseColumn && <th className="px-4 py-3">Entreprise / Entite</th>}
                      <th className="px-4 py-3">Client / tiers</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Reference bancaire</th>
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
                    ) : filteredEncaissements.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-muted-foreground" colSpan={showEnterpriseColumn ? 9 : 8}>
                          Aucun encaissement a valider.
                        </td>
                      </tr>
                    ) : (
                      filteredEncaissements.map((encaissement) => (
                        <tr key={encaissement.id} className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3">{formatDate(encaissement.dateEncaissement)}</td>
                          <td className="px-4 py-3 font-medium">{encaissement.numeroPiece}</td>
                          {showEnterpriseColumn && <td className="px-4 py-3">{encaissement.enterpriseName || encaissement.serviceName || '-'}</td>}
                          <td className="px-4 py-3">{encaissement.clientName}</td>
                          <td className="px-4 py-3">{encaissement.paymentMethod}</td>
                          <td className="px-4 py-3">{encaissement.reference || '-'}</td>
                          <td className="px-4 py-3 text-right font-bold">{formatCurrency(encaissement.amountTTC)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <Badge className={encaissement.isVoucher ? "border-none bg-teal-100 text-teal-800" : "border-none bg-emerald-100 text-emerald-800"}>
                                {encaissement.isVoucher ? "Pièce de caisse" : "Paiement client"}
                              </Badge>
                              <CashVoucherStatusBadge status={encaissement.status || 'EN_ATTENTE'} />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              {canApprove && encaissement.status !== 'VALIDE' && encaissement.status !== 'ANNULE' ? (
                                encaissement.isVoucher ? (
                                  <Button size="sm" onClick={() => onUpdateVoucher(encaissement.id, 'VALIDE')}>
                                    Valider la pièce
                                  </Button>
                                ) : (
                                  <Button size="sm" onClick={() => onValidateEncaissement(encaissement)}>
                                    Valider en compta
                                  </Button>
                                )
                              ) : null}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  onPrintVoucher({
                                    ...(encaissement.rawVoucher || encaissement),
                                    flowType: 'ENCAISSEMENT',
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
