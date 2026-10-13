'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CashVoucherStatusBadge } from '@/components/accounting/CashVoucherStatusBadge';
import { textOrDash } from '@/components/printComponents/printUtils';

import type { DepensesTableProps } from './DepensesTable';
import { SectionIntro } from './DepensesTableSectionIntro';
import { sourceStatusLabels } from './depensesTable.constants';

export function CommitmentsTab(props: DepensesTableProps) {
  const { isLoading, activeTab, onTabChange, filteredCommitments, filteredVouchers, filteredEncaissements, filteredDecaissements, consolidatedRows, showEnterpriseColumn, canMutate, formatCurrency, formatDate, sourceLabels, canApprove, onValidateCommitment, onValidateEncaissement, onValidateDecaissement, onUpdateVoucher, onPrintVoucher, onLiquider, onPayer } = props;
  return (
    <TabsContent value="commitments">
            <SectionIntro
              title="Engagements achats"
              description="Le service achats transmet ici les dossiers a traiter par la comptabilite. On valide d'abord l'engagement, puis on saisit la facture fournisseur, puis on cree le paiement."
              accentClassName="border-blue-200 bg-blue-50/70 text-blue-900"
            />
            <Card className="overflow-hidden p-0 text-sm md:text-base">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Source achat</th>
                      <th className="px-4 py-3">Type</th>
                      {showEnterpriseColumn && <th className="px-4 py-3">Entreprise / Entite</th>}
                      <th className="px-4 py-3">Fournisseur</th>
                      <th className="px-4 py-3 text-right">Montant TTC</th>
                      <th className="px-4 py-3">Suivi achat / compta</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td className="px-4 py-8 text-center" colSpan={showEnterpriseColumn ? 7 : 6}>
                          Chargement...
                        </td>
                      </tr>
                    ) : filteredCommitments.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-muted-foreground" colSpan={showEnterpriseColumn ? 7 : 6}>
                          Aucun engagement achat.
                        </td>
                      </tr>
                    ) : (
                      filteredCommitments.map((commitment) => (
                        <tr key={commitment.id} className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <div className="font-medium">{commitment.sourceNumber}</div>
                            <div className="text-xs text-muted-foreground">{formatDate(commitment.createdAt)}</div>
                          </td>
                          <td className="px-4 py-3">{sourceLabels[commitment.sourceType] || commitment.sourceType}</td>
                          {showEnterpriseColumn && <td className="px-4 py-3">{commitment.enterpriseName || commitment.serviceName || '-'}</td>}
                          <td className="px-4 py-3">{commitment.supplierName || '-'}</td>
                          <td className="px-4 py-3 text-right font-semibold">{formatCurrency(commitment.amountTTC)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="border-slate-200 text-slate-600">
                                  Achat
                                </Badge>
                                <Badge className="border-blue-200 bg-blue-50 text-blue-800">
                                  {sourceStatusLabels[String(commitment.sourceStatus || '').toUpperCase()] ||
                                    commitment.sourceStatus ||
                                    'En attente'}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline" className="border-slate-200 text-slate-600">
                                  Compta
                                </Badge>
                                {commitment.status ? (
                                  <CashVoucherStatusBadge status={commitment.status} />
                                ) : (
                                  <Badge className="border-amber-200 bg-amber-50 text-amber-800">A valider</Badge>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              {canApprove &&
                              !commitment.status &&
                              ['APPROUVEE', 'CONFIRME', 'PROFORMA_APPROUVEE'].includes(
                                String(commitment.sourceStatus || '').toUpperCase()
                              ) && (
                                <Button size="sm" variant="secondary" onClick={() => onValidateCommitment(commitment)}>
                                  Valider compta
                                </Button>
                              )}
                              {canMutate && commitment.status === 'ENGAGE' && (
                                <Button size="sm" variant="outline" onClick={() => onLiquider(commitment)}>
                                  Saisir facture
                                </Button>
                              )}
                              {canMutate && (commitment.status === 'LIQUIDE' || commitment.status === 'ORDONNANCE') && (
                                <Button size="sm" onClick={() => onPayer(commitment)}>
                                  Creer le paiement
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
