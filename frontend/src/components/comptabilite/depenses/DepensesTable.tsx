'use client';

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
        <TabsTrigger value="overview">Vue consolidee</TabsTrigger>
        <TabsTrigger value="vouchers">Bons de caisse</TabsTrigger>
        <TabsTrigger value="decaissements">Decaissements</TabsTrigger>
        <TabsTrigger value="encaissements">Encaissements</TabsTrigger>
        <TabsTrigger value="commitments">Engagements achats</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <Card className="overflow-hidden p-0 text-sm md:text-base">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Entreprise / Entite</th>
                  <th className="px-4 py-3">Tiers</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3 text-right">Montant TTC</th>
                  <th className="px-4 py-3">Statut</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-8 text-center" colSpan={8}>
                      Chargement...
                    </td>
                  </tr>
                ) : consolidatedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={8}>
                      Aucun mouvement a afficher.
                    </td>
                  </tr>
                ) : (
                  consolidatedRows.map((row) => (
                    <tr key={row.id} className="border-b transition-colors hover:bg-muted/50">
                      <td className="whitespace-nowrap px-4 py-3">{formatDate(row.date)}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium">{row.number || '-'}</td>
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
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                        {formatCurrency(row.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {row.kind === 'voucher' ? (
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="outline"
                              className={
                                filteredVouchers.find((v) => `voucher-${v.id}` === row.id)?.flowType === 'ENCAISSEMENT'
                                  ? 'border-emerald-200 text-emerald-800'
                                  : 'border-rose-200 text-rose-800'
                              }
                            >
                              {filteredVouchers.find((v) => `voucher-${v.id}` === row.id)?.flowType || 'DECAISSEMENT'}
                            </Badge>
                            <CashVoucherStatusBadge status={row.status} />
                          </div>
                        ) : row.kind === 'encaissement' ? (
                          <div className="flex flex-col gap-1">
                            <Badge className="border-none bg-emerald-100 text-emerald-800">ENCAISSEMENT</Badge>
                            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">RECU</Badge>
                          </div>
                        ) : row.kind === 'decaissement' ? (
                          <div className="flex flex-col gap-1">
                            <Badge className="border-none bg-rose-100 text-rose-800">DECAISSEMENT</Badge>
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
        <Card className="overflow-hidden p-0 text-sm md:text-base">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Bon de caisse</th>
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
                      Aucun bon de caisse enregistre.
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
                        <div className="text-xs text-muted-foreground">
                          {voucher.serviceName || voucher.supplierName || '-'}
                        </div>
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
                          {canApprove && voucher.status === 'EN_ATTENTE' && (
                            <Button size="sm" variant="secondary" onClick={() => onUpdateVoucher(voucher.id, 'VALIDE')}>
                              Valider
                            </Button>
                          )}
                          {canApprove && voucher.status === 'VALIDE' && (
                            <Button size="sm" onClick={() => onUpdateVoucher(voucher.id, 'DECAISSE')}>
                              Decaisser
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

      <TabsContent value="decaissements">
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Piece</th>
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
                    <td className="px-4 py-8 text-center" colSpan={8}>
                      Chargement...
                    </td>
                  </tr>
                ) : filteredDecaissements.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={8}>
                      Aucun decaissement direct.
                    </td>
                  </tr>
                ) : (
                  filteredDecaissements.map((decaissement) => (
                    <tr key={decaissement.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3">{formatDate(decaissement.dateDecaissement)}</td>
                      <td className="px-4 py-3 font-medium">{decaissement.numeroPiece}</td>
                      <td className="px-4 py-3">{decaissement.beneficiaryName}</td>
                      <td className="px-4 py-3">{decaissement.paymentMethod}</td>
                      <td className="px-4 py-3">{decaissement.reference || '-'}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatCurrency(decaissement.amountTTC)}</td>
                      <td className="px-4 py-3">
                        <CashVoucherStatusBadge status={decaissement.status || 'DECAISSE'} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
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

      <TabsContent value="encaissements">
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Piece</th>
                  <th className="px-4 py-3">Client/Tiers</th>
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
                    <td className="px-4 py-8 text-center" colSpan={8}>
                      Chargement...
                    </td>
                  </tr>
                ) : filteredEncaissements.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={8}>
                      Aucun encaissement direct.
                    </td>
                  </tr>
                ) : (
                  filteredEncaissements.map((encaissement) => (
                    <tr key={encaissement.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3">{formatDate(encaissement.dateEncaissement)}</td>
                      <td className="px-4 py-3 font-medium">{encaissement.numeroPiece}</td>
                      <td className="px-4 py-3">{encaissement.clientName}</td>
                      <td className="px-4 py-3">{encaissement.paymentMethod}</td>
                      <td className="px-4 py-3">{encaissement.reference || '-'}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatCurrency(encaissement.amountTTC)}</td>
                      <td className="px-4 py-3">
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">RECU</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              onPrintVoucher({
                                ...encaissement,
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

      <TabsContent value="commitments">
        <Card className="overflow-hidden p-0 text-sm md:text-base">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Entreprise / Entite</th>
                  <th className="px-4 py-3">Fournisseur</th>
                  <th className="px-4 py-3 text-right">Montant TTC</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-8 text-center" colSpan={7}>
                      Chargement...
                    </td>
                  </tr>
                ) : filteredCommitments.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={7}>
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
                      <td className="px-4 py-3">{commitment.serviceName || '-'}</td>
                      <td className="px-4 py-3">{commitment.supplierName || '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(commitment.amountTTC)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">{commitment.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {commitment.status === 'ENGAGE' && (
                            <Button size="sm" variant="outline" onClick={() => onLiquider(commitment)}>
                              Liquider
                            </Button>
                          )}
                          {(commitment.status === 'LIQUIDE' || commitment.status === 'ORDONNANCE') && (
                            <Button size="sm" onClick={() => onPayer(commitment)}>
                              Payer
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
    </Tabs>
  );
}
