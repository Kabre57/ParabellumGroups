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
  onValidateCommitment: (commitment: PurchaseCommitment) => void;
  onValidateEncaissement: (encaissement: Encaissement) => void;
  onValidateDecaissement: (decaissement: Decaissement) => void;
  onUpdateVoucher: (id: string, status: string) => void;
  onPrintVoucher: (voucher: any) => void;
  onLiquider: (commitment: PurchaseCommitment) => void;
  onPayer: (commitment: PurchaseCommitment) => void;
}

const sourceStatusLabels: Record<string, string> = {
  BROUILLON: 'Brouillon achat',
  SOUMISE: 'Demande soumise',
  APPROUVEE: 'Demande approuvee',
  CONFIRME: 'Commande confirmee',
  PROFORMAS_EN_COURS: 'Consultation fournisseurs',
  PROFORMA_SOUMISE: 'Proforma soumise',
  PROFORMA_APPROUVEE: 'Proforma retenue',
  LIVRE: 'Commande livree',
  ANNULE: 'Operation annulee',
  REJETEE: 'Operation rejetee',
};

function SectionIntro({
  title,
  description,
  accentClassName,
}: {
  title: string;
  description: string;
  accentClassName: string;
}) {
  return (
    <div className={`mb-4 rounded-xl border p-4 shadow-sm ${accentClassName}`}>
      <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
      <p className="mt-2 text-sm leading-6">{description}</p>
    </div>
  );
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
  onValidateCommitment,
  onValidateEncaissement,
  onValidateDecaissement,
  onUpdateVoucher,
  onPrintVoucher,
  onLiquider,
  onPayer,
}: DepensesTableProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <div className="overflow-x-auto pb-2">
        <TabsList className="h-auto min-w-max justify-start gap-1 rounded-xl bg-slate-100 p-1">
          <TabsTrigger className="whitespace-nowrap" value="overview">
            Vue globale
          </TabsTrigger>
          <TabsTrigger className="whitespace-nowrap" value="commitments">
            Engagements achats
          </TabsTrigger>
          <TabsTrigger className="whitespace-nowrap" value="decaissements">
            Decaissements
          </TabsTrigger>
          <TabsTrigger className="whitespace-nowrap" value="encaissements">
            Encaissements
          </TabsTrigger>
          <TabsTrigger className="whitespace-nowrap" value="vouchers">
            Pieces de caisse
          </TabsTrigger>
        </TabsList>
      </div>

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
                  <th className="px-4 py-3">Entreprise / Entite</th>
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
                    <td className="px-4 py-8 text-center" colSpan={9}>
                      Chargement...
                    </td>
                  </tr>
                ) : consolidatedRows.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={9}>
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
                        <td className="px-4 py-3">{row.enterpriseName || '-'}</td>
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
                            {row.kind === 'commitment' && row.status === 'ENGAGE' && (
                              <Button size="sm" variant="outline" onClick={() => onLiquider(entity)}>
                                Saisir facture
                              </Button>
                            )}
                            {row.kind === 'commitment' && (row.status === 'LIQUIDE' || row.status === 'ORDONNANCE') && (
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
                            {row.kind === 'voucher' && canApprove && row.status === 'EN_ATTENTE' && (
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
                  <th className="px-4 py-3">Entreprise / Entite</th>
                  <th className="px-4 py-3">Fournisseur</th>
                  <th className="px-4 py-3 text-right">Montant TTC</th>
                  <th className="px-4 py-3">Suivi achat / compta</th>
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
                      <td className="px-4 py-3">{commitment.enterpriseName || commitment.serviceName || '-'}</td>
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
                          {commitment.status === 'ENGAGE' && (
                            <Button size="sm" variant="outline" onClick={() => onLiquider(commitment)}>
                              Saisir facture
                            </Button>
                          )}
                          {(commitment.status === 'LIQUIDE' || commitment.status === 'ORDONNANCE') && (
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
                  <th className="px-4 py-3">Entreprise / Entite</th>
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
                    <td className="px-4 py-8 text-center" colSpan={9}>
                      Chargement...
                    </td>
                  </tr>
                ) : filteredDecaissements.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={9}>
                      Aucun decaissement enregistre.
                    </td>
                  </tr>
                ) : (
                  filteredDecaissements.map((decaissement) => (
                    <tr key={decaissement.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3">{formatDate(decaissement.dateDecaissement)}</td>
                      <td className="px-4 py-3 font-medium">{decaissement.numeroPiece}</td>
                      <td className="px-4 py-3">{decaissement.enterpriseName || decaissement.serviceName || '-'}</td>
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
                  <th className="px-4 py-3">Entreprise / Entite</th>
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
                    <td className="px-4 py-8 text-center" colSpan={9}>
                      Chargement...
                    </td>
                  </tr>
                ) : filteredEncaissements.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={9}>
                      Aucun encaissement a valider.
                    </td>
                  </tr>
                ) : (
                  filteredEncaissements.map((encaissement) => (
                    <tr key={encaissement.id} className="border-b hover:bg-muted/50">
                      <td className="px-4 py-3">{formatDate(encaissement.dateEncaissement)}</td>
                      <td className="px-4 py-3 font-medium">{encaissement.numeroPiece}</td>
                      <td className="px-4 py-3">{encaissement.enterpriseName || encaissement.serviceName || '-'}</td>
                      <td className="px-4 py-3">{encaissement.clientName}</td>
                      <td className="px-4 py-3">{encaissement.paymentMethod}</td>
                      <td className="px-4 py-3">{encaissement.reference || '-'}</td>
                      <td className="px-4 py-3 text-right font-bold">{formatCurrency(encaissement.amountTTC)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Badge className="border-none bg-emerald-100 text-emerald-800">Paiement client</Badge>
                          <CashVoucherStatusBadge status={encaissement.status || 'EN_ATTENTE'} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          {canApprove && encaissement.status !== 'VALIDE' && encaissement.status !== 'ANNULE' ? (
                            <Button size="sm" onClick={() => onValidateEncaissement(encaissement)}>
                              Valider en compta
                            </Button>
                          ) : null}
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
                        <div className="text-xs text-muted-foreground">
                          {voucher.enterpriseName || voucher.serviceName || voucher.supplierName || '-'}
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
    </Tabs>
  );
}
