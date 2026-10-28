'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CashVoucherStatusBadge } from '@/components/accounting/CashVoucherStatusBadge';
import { textOrDash } from '@/components/printComponents/printUtils';

import type { DepensesTableProps } from './DepensesTable';
import { SectionIntro } from './DepensesTableSectionIntro';

export function OverviewTab(props: DepensesTableProps) {
  const { isLoading, activeTab, onTabChange, filteredCommitments, filteredVouchers, filteredEncaissements, filteredDecaissements, consolidatedRows, showEnterpriseColumn, canMutate, formatCurrency, formatDate, sourceLabels, canApprove, onValidateCommitment, onValidateEncaissement, onValidateDecaissement, onUpdateVoucher, onPrintVoucher, onLiquider, onPayer } = props;
  return (
    <TabsContent value="overview">
            <SectionIntro
              title="Vue globale"
              description="Cette vue rassemble tous les objets sur une meme chronologie: engagement achat, encaissement, decaissement et piece de caisse."
              accentClassName="border-slate-200 bg-slate-50 text-slate-700"
            />
            <Card className="overflow-hidden p-0 text-sm md:text-base">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Piece / dossier</th>
                      <th className="px-4 py-3">Objet metier</th>
                      {showEnterpriseColumn && <th className="px-4 py-3">Entreprise / Entite</th>}
                      <th className="px-4 py-3">Client / fournisseur</th>
                      <th className="px-4 py-3">Reference</th>
                      <th className="px-4 py-3 text-right">Montant TTC</th>
                      <th className="px-4 py-3">Etape</th>
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
                    ) : consolidatedRows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-8 text-center text-muted-foreground" colSpan={showEnterpriseColumn ? 9 : 8}>
                          Aucun mouvement a afficher.
                        </td>
                      </tr>
                    ) : (
                      consolidatedRows.map((row) => {
                        const entity = row.entity || {};
                        const sourceStatus = String(row.sourceStatus || entity.sourceStatus || '').toUpperCase();
                        return (
                          <tr key={row.id} className="border-b transition-colors hover:bg-muted/50">
                            <td className="whitespace-nowrap px-4 py-3">{formatDate(row.date)}</td>
                            <td className="whitespace-nowrap px-4 py-3 font-medium">{row.number || '-'}</td>
                            <td className="px-4 py-3">{row.label}</td>
                            {showEnterpriseColumn && <td className="px-4 py-3">{row.enterpriseName || '-'}</td>}
                            <td className="px-4 py-3">{row.thirdParty}</td>
                            <td className="px-4 py-3">{textOrDash(row.reference)}</td>
                            <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                              {formatCurrency(row.amount)}
                            </td>
                            <td className="px-4 py-3">
                              {row.kind === 'voucher' ? (
                                <div className="flex flex-col gap-1">
                                  <Badge className="border-none bg-indigo-100 text-indigo-800">PIECE DE CAISSE</Badge>
                                  <CashVoucherStatusBadge status={row.status} />
                                </div>
                              ) : row.kind === 'encaissement' ? (
                                <div className="flex flex-col gap-1">
                                  <Badge className="border-none bg-emerald-100 text-emerald-800">PAIEMENT CLIENT</Badge>
                                  <CashVoucherStatusBadge status={row.status} />
                                </div>
                              ) : row.kind === 'decaissement' ? (
                                <div className="flex flex-col gap-1">
                                  <Badge className="border-none bg-rose-100 text-rose-800">PAIEMENT FOURNISSEUR</Badge>
                                  <CashVoucherStatusBadge status={row.status} />
                                </div>
                              ) : (
                                <CashVoucherStatusBadge status={row.status || 'EN_ATTENTE'} />
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                {row.kind === 'commitment' &&
                                  canApprove &&
                                  !row.status &&
                                  ['APPROUVEE', 'CONFIRME', 'PROFORMA_APPROUVEE'].includes(sourceStatus) && (
                                    <Button size="sm" variant="secondary" onClick={() => onValidateCommitment(entity)}>
                                      Valider compta
                                    </Button>
                                  )}
                                {canMutate && row.kind === 'commitment' && row.status === 'ENGAGE' && (
                                  <Button size="sm" variant="outline" onClick={() => onLiquider(entity)}>
                                    Saisir facture
                                  </Button>
                                )}
                                {canMutate && row.kind === 'commitment' && (row.status === 'LIQUIDE' || row.status === 'ORDONNANCE') && (
                                  <Button size="sm" onClick={() => onPayer(entity)}>
                                    Creer le paiement
                                  </Button>
                                )}
                                {row.kind === 'encaissement' &&
                                  canApprove &&
                                  row.status !== 'VALIDE' &&
                                  row.status !== 'ANNULE' && (
                                    <Button size="sm" onClick={() => onValidateEncaissement(entity)}>
                                      Valider en compta
                                    </Button>
                                  )}
                                {row.kind === 'decaissement' &&
                                  canApprove &&
                                  row.status !== 'DECAISSE' &&
                                  row.status !== 'ANNULE' && (
                                    <Button size="sm" onClick={() => onValidateDecaissement(entity)}>
                                      Valider en compta
                                    </Button>
                                  )}
                                {row.kind === 'voucher' && canApprove && (row.status === 'EN_ATTENTE' || row.status === 'BROUILLON') && (
                                  <Button size="sm" variant="secondary" onClick={() => onUpdateVoucher(entity.id, 'VALIDE')}>
                                    Valider la piece
                                  </Button>
                                )}
                                {row.kind === 'voucher' && canApprove && row.status === 'VALIDE' && (
                                  <Button size="sm" onClick={() => onUpdateVoucher(entity.id, 'DECAISSE')}>
                                    Confirmer paiement
                                  </Button>
                                )}
                                {(row.kind === 'voucher' || row.kind === 'encaissement' || row.kind === 'decaissement') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      onPrintVoucher({
                                        ...entity,
                                        flowType:
                                          row.kind === 'encaissement'
                                            ? 'ENCAISSEMENT'
                                            : row.kind === 'decaissement'
                                              ? 'DECAISSEMENT'
                                              : entity.flowType,
                                      })
                                    }
                                  >
                                    Imprimer
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
  );
}
