'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CashVoucherStatusBadge } from '@/components/accounting/CashVoucherStatusBadge';
import { textOrDash } from '@/components/printComponents/printUtils';
import { PurchaseCommitment, Encaissement, Decaissement } from '@/shared/api/billing';

interface DepensesTableProps {
  isLoading: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
  filteredCommitments: PurchaseCommitment[];
  filteredVouchers: any[];
  filteredEncaissements: Encaissement[];
  filteredDecaissements: Decaissement[];
  consolidatedRows: any[];
  formatCurrency: (v: number) => string;
  formatDate: (v?: string | null) => string;
  sourceLabels: Record<string, string>;
  canApprove: boolean;
  onUpdateVoucher: (id: string, status: string) => void;
  onPrintVoucher: (voucher: any) => void;
  onLiquider: (commitment: PurchaseCommitment) => void;
  onPayer: (commitment: PurchaseCommitment) => void;
}

export function DepensesTable({
  isLoading,
  activeTab,
  onTabChange,
  filteredCommitments,
  filteredVouchers,
  filteredEncaissements,
  filteredDecaissements,
  consolidatedRows,
  formatCurrency,
  formatDate,
  sourceLabels,
  canApprove,
  onUpdateVoucher,
  onPrintVoucher,
  onLiquider,
  onPayer,
}: DepensesTableProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList>
        <TabsTrigger value="overview">Vue consolidée</TabsTrigger>
        <TabsTrigger value="vouchers">Bons de caisse</TabsTrigger>
        <TabsTrigger value="decaissements">Décaissements</TabsTrigger>
        <TabsTrigger value="encaissements">Encaissements</TabsTrigger>
        <TabsTrigger value="commitments">Engagements achats</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        {/* ... existing overview content ... */}
        <Card className="p-0 overflow-hidden text-sm md:text-base">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Tiers</th>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3 text-right">Montant TTC</th>
                  <th className="px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-8 text-center" colSpan={8}>Chargement...</td>
                  </tr>
                ) : consolidatedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={8}>Aucun mouvement à afficher.</td>
                  </tr>
                ) : (
                  consolidatedRows.map((row) => (
                    <tr key={row.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.date)}</td>
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{row.number || '-'}</td>
                      <td className="px-4 py-3">{row.label}</td>
                      <td className="px-4 py-3">{row.serviceName}</td>
                      <td className="px-4 py-3">{row.thirdParty}</td>
                      <td className="px-4 py-3">
                        {row.kind === 'voucher'
                          ? textOrDash(filteredVouchers.find((v) => `voucher-${v.id}` === row.id)?.reference)
                          : row.kind === 'decaissement' || row.kind === 'encaissement'
                          ? textOrDash(row.reference)
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">{formatCurrency(row.amount)}</td>
                      <td className="px-4 py-3">
                        {row.kind === 'voucher' ? (
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className={filteredVouchers.find(v => `voucher-${v.id}` === row.id)?.flowType === 'ENCAISSEMENT' ? 'border-emerald-200 text-emerald-800' : 'border-rose-200 text-rose-800'}>
                              {filteredVouchers.find(v => `voucher-${v.id}` === row.id)?.flowType || 'DECAISSEMENT'}
                            </Badge>
                            <CashVoucherStatusBadge status={row.status} />
                          </div>
                        ) : row.kind === 'encaissement' ? (
                          <div className="flex flex-col gap-1">
                            <Badge className="bg-emerald-100 text-emerald-800 border-none">ENCAISSEMENT</Badge>
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">REÇU</Badge>
                          </div>
                        ) : row.kind === 'decaissement' ? (
                            <div className="flex flex-col gap-1">
                                <Badge className="bg-rose-100 text-rose-800 border-none">DECAISSEMENT</Badge>
                                <CashVoucherStatusBadge status={row.status} />
                            </div>
                        ) : (
                          <CashVoucherStatusBadge status={row.status} />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="vouchers">
        {/* ... existing vouchers content ... */}
        <Card className="p-0 overflow-hidden text-sm md:text-base">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Bon de caisse</th>
                  <th className="px-4 py-3">Origine</th>
                  <th className="px-4 py-3">Bénéficiaire</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Compte</th>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3 text-right">Montant TTC</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-8 text-center" colSpan={9}>Chargement...</td>
                  </tr>
                ) : filteredVouchers.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={9}>Aucun bon de caisse enregistré.</td>
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
                        <div className="text-xs text-muted-foreground">{voucher.serviceName || voucher.supplierName || '-'}</div>
                      </td>
                      <td className="px-4 py-3">
                        {voucher.paymentMethod}
                      </td>
                      <td className="px-4 py-3">{voucher.treasuryAccountName || '-'}</td>
                      <td className="px-4 py-3">{voucher.reference || '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(voucher.amountTTC)}</td>
                      <td className="px-4 py-3">
                        <CashVoucherStatusBadge status={voucher.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => onPrintVoucher(voucher)}>Imprimer</Button>
                          {canApprove && voucher.status === 'EN_ATTENTE' && (
                            <Button size="sm" variant="secondary" onClick={() => onUpdateVoucher(voucher.id, 'VALIDE')}>Valider</Button>
                          )}
                          {canApprove && voucher.status === 'VALIDE' && (
                            <Button size="sm" onClick={() => onUpdateVoucher(voucher.id, 'DECAISSE')}>Décaisser</Button>
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

      <TabsContent value="decaissements">
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Pièce</th>
                  <th className="px-4 py-3">Bénéficiaire</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3 text-right">Montant TTC</th>
                  <th className="px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td className="px-4 py-8 text-center" colSpan={7}>Chargement...</td></tr>
                ) : filteredDecaissements.length === 0 ? (
                  <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>Aucun décaissement direct.</td></tr>
                ) : (
                  filteredDecaissements.map((d) => (
                    <tr key={d.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3">{formatDate(d.dateDecaissement)}</td>
                      <td className="px-4 py-3 font-medium">{d.numeroPiece}</td>
                      <td className="px-4 py-3">{d.beneficiaryName}</td>
                      <td className="px-4 py-3">{d.paymentMethod}</td>
                      <td className="px-4 py-3">{d.reference || '-'}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatCurrency(d.amountTTC)}</td>
                      <td className="px-4 py-3"><CashVoucherStatusBadge status={d.status || 'DECAISSE'} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="encaissements">
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Pièce</th>
                  <th className="px-4 py-3">Client/Tiers</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3 text-right">Montant TTC</th>
                  <th className="px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td className="px-4 py-8 text-center" colSpan={7}>Chargement...</td></tr>
                ) : filteredEncaissements.length === 0 ? (
                  <tr><td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>Aucun encaissement direct.</td></tr>
                ) : (
                  filteredEncaissements.map((e) => (
                    <tr key={e.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3">{formatDate(e.dateEncaissement)}</td>
                      <td className="px-4 py-3 font-medium">{e.numeroPiece}</td>
                      <td className="px-4 py-3">{e.clientName}</td>
                      <td className="px-4 py-3">{e.paymentMethod}</td>
                      <td className="px-4 py-3">{e.reference || '-'}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatCurrency(e.amountTTC)}</td>
                      <td className="px-4 py-3"><Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">REÇU</Badge></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </TabsContent>

      <TabsContent value="commitments">
        {/* ... existing commitments content ... */}
        <Card className="p-0 overflow-hidden text-sm md:text-base">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Fournisseur</th>
                  <th className="px-4 py-3 text-right">Montant TTC</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-8 text-center" colSpan={7}>Chargement...</td>
                  </tr>
                ) : filteredCommitments.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>Aucun engagement achat.</td>
                  </tr>
                ) : (
                  filteredCommitments.map((commitment) => (
                    <tr key={commitment.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{commitment.sourceNumber}</div>
                        <div className="text-xs text-muted-foreground">{formatDate(commitment.createdAt)}</div>
                      </td>
                      <td className="px-4 py-3">{sourceLabels[commitment.sourceType] || commitment.sourceType}</td>
                      <td className="px-4 py-3">{commitment.serviceName || '-'}</td>
                      <td className="px-4 py-3">{commitment.supplierName || '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(commitment.amountTTC)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{commitment.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {commitment.status === 'ENGAGE' && (
                            <Button size="sm" variant="outline" onClick={() => onLiquider(commitment)}>Liquider</Button>
                          )}
                          {(commitment.status === 'LIQUIDE' || commitment.status === 'ORDONNANCE') && (
                            <Button size="sm" onClick={() => onPayer(commitment)}>Payer</Button>
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
    </Tabs>
  );
}
