'use client';

import { useAccountingFamiliesManagerModel } from './AccountingFamiliesManager.model';
import { FAMILY_TYPE_OPTIONS, ACCOUNT_TYPE_LABELS, SYSTEM_FAMILY_LABELS, getFamilyLabel, normalizeFamilyCode, typeOptionFor, linkedAccountCodes, type AccountingFamiliesManagerProps } from './AccountingFamiliesManager.model';



import { Circle, CircleDot, Link2, Pencil, Plus, Save, Search, Settings2, Trash2, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';




























export function AccountingFamiliesManager(props: AccountingFamiliesManagerProps) {

  const {
  accounts,
  families,
  isLoading = false,
  canCreate,
  canUpdate,
  canDelete,
} = props;
  const { queryClient, search, setSearch, typeFilter, setTypeFilter, dialogOpen, setDialogOpen, editingFamilyCode, setEditingFamilyCode, form, setForm, accountSearch, setAccountSearch, selectedAccountId, setSelectedAccountId, pendingRules, setPendingRules, activeFamily, filteredFamilies, usedAccountIds, compatibleAccounts, invalidateFamilies, createFamilyMutation, updateFamilyMutation, deleteFamilyMutation, addRuleMutation, makePrimaryMutation, removeRuleMutation, openCreateDialog, openEditDialog, closeDialog, updateForm, updateType, selectedCompatibleAccount, accountIdToAdd, addSelectedAccount, saveFamily, selectedOption, isSaving, existingRules, pendingRuleRows } = useAccountingFamiliesManagerModel(props);

return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-md border border-slate-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-950">Familles comptables</h2>
          <p className="mt-1 text-sm text-slate-500">
            Les familles personnalisées et leurs comptes liés sont propres à l’entreprise active. Les catégories système sont communes, avec un rattachement de comptes séparé par entreprise.
          </p>
        </div>
        {canCreate && (
          <Button type="button" onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle
          </Button>
        )}
      </div>

      <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 lg:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une famille..."
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {FAMILY_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.label} value={option.label}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="w-[220px]">Famille</TableHead>
              <TableHead>Intitulé famille</TableHead>
              <TableHead className="w-[160px]">Type</TableHead>
              <TableHead>Comptes réels liés</TableHead>
              <TableHead className="w-[150px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">
                  Chargement des familles comptables...
                </TableCell>
              </TableRow>
            ) : filteredFamilies.length ? (
              filteredFamilies.map((family) => {
                const option = typeOptionFor(family);
                const linkedCodes = linkedAccountCodes(family);
                return (
                  <TableRow key={family.family}>
                    <TableCell>
                      <span className="font-medium text-slate-800">{getFamilyLabel(family)}</span>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-950">{family.label}</div>
                      {family.description && (
                        <div className="mt-1 line-clamp-1 text-xs text-slate-500">{family.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={option.className}>{family.displayType || family.type || option.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {linkedCodes ? (
                        <span className="text-sm text-slate-700">{linkedCodes}</span>
                      ) : (
                        <span className="text-sm text-rose-600">Aucun compte lié</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {canUpdate && (
                          <Button type="button" size="sm" variant="outline" onClick={() => openEditDialog(family)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Modifier
                          </Button>
                        )}
                        {canDelete && !family.isSystem && (
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            onClick={() => {
                              if (window.confirm(`Supprimer la famille « ${getFamilyLabel(family)} » ?`)) {
                                deleteFamilyMutation.mutate(family.family);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-slate-500">
                  Aucune famille ne correspond aux filtres.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle>{activeFamily ? 'Modifier la famille' : 'Nouvelle famille comptable'}</DialogTitle>
                <DialogDescription>
                  Configurez les comptes personnalisés utilisés automatiquement par les validations comptables.
                </DialogDescription>
              </div>
              <Button type="button" onClick={activeFamily?.isSystem ? closeDialog : saveFamily} disabled={isSaving}>
                {!activeFamily?.isSystem && <Save className="mr-2 h-4 w-4" />}
                {activeFamily?.isSystem ? 'Terminé' : 'Enregistrer'}
              </Button>
            </div>
          </DialogHeader>

          <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="family-code">
                  {activeFamily && SYSTEM_FAMILY_LABELS[activeFamily.family]
                    ? 'Famille sélectionnée'
                    : 'Identifiant technique de la famille *'}
                </Label>
                <Input
                  id="family-code"
                  value={activeFamily && SYSTEM_FAMILY_LABELS[activeFamily.family]
                    ? getFamilyLabel(activeFamily)
                    : form.code}
                  disabled={Boolean(activeFamily)}
                  onChange={(event) => updateForm('code', normalizeFamilyCode(event.target.value))}
                  placeholder="ACHAT_M"
                />
                <p className="text-xs text-slate-500">
                  {activeFamily && SYSTEM_FAMILY_LABELS[activeFamily.family]
                    ? 'Le code technique associé est conservé automatiquement par l’application.'
                    : 'Cet identifiant technique relie cette famille aux opérations comptables.'}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="family-label">Intitulé *</Label>
                <Input
                  id="family-label"
                  value={form.label}
                  disabled={Boolean(activeFamily?.isSystem)}
                  onChange={(event) => updateForm('label', event.target.value)}
                  placeholder="Achats de marchandises"
                />
              </div>
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={selectedOption.label} onValueChange={updateType}>
                  <SelectTrigger disabled={Boolean(activeFamily?.isSystem)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FAMILY_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.label} value={option.label}>
                        {option.label} - {ACCOUNT_TYPE_LABELS[option.accountType]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type comptable réel</Label>
                <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                  <Settings2 className="mr-2 h-4 w-4 text-slate-400" />
                  {ACCOUNT_TYPE_LABELS[form.accountType]}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="family-description">Description</Label>
                <Textarea
                  id="family-description"
                  value={form.description}
                  disabled={Boolean(activeFamily?.isSystem)}
                  onChange={(event) => updateForm('description', event.target.value)}
                  placeholder="Utilisation de cette famille dans les écritures et workflows comptables."
                />
              </div>
            </div>

            <div className="mt-6 border-t pt-5">
              <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-950">Comptes réels liés</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Associez un ou plusieurs comptes et choisissez le compte par défaut.
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-[220px_minmax(280px,1fr)_auto]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={accountSearch}
                      onChange={(event) => setAccountSearch(event.target.value)}
                      placeholder="Rechercher compte"
                      className="pl-10"
                    />
                  </div>
                  <select
                    value={selectedCompatibleAccount?.id || ''}
                    onChange={(event) => setSelectedAccountId(event.target.value)}
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    disabled={!compatibleAccounts.length}
                  >
                    <option value="">
                      {compatibleAccounts.length ? 'Compte compatible' : 'Aucun compte compatible'}
                    </option>
                    {compatibleAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addSelectedAccount}
                    disabled={!accountIdToAdd || addRuleMutation.isPending}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    Ajouter
                  </Button>
                </div>
              </div>

              <div className="mb-3 text-xs text-slate-500">
                {compatibleAccounts.length === 1 && !selectedCompatibleAccount ? (
                  <span>Un seul compte compatible trouvé: cliquez sur Ajouter pour le rattacher directement.</span>
                ) : !compatibleAccounts.length ? (
                  <span>
                    Aucun compte compatible avec le type {ACCOUNT_TYPE_LABELS[form.accountType]}. Vérifiez le type de
                    famille ou créez un compte comptable correspondant.
                  </span>
                ) : (
                  <span>{compatibleAccounts.length} compte(s) compatible(s) disponible(s).</span>
                )}
              </div>

              <div className="overflow-hidden rounded-md border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-[150px]">Numéro compte</TableHead>
                      <TableHead>Intitulé</TableHead>
                      <TableHead className="w-[160px]">Par défaut ?</TableHead>
                      <TableHead className="w-[90px] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {existingRules.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-mono text-sm">{rule.account?.code || '-'}</TableCell>
                        <TableCell>{rule.account?.label || 'Compte indisponible'}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={rule.isPrimary || makePrimaryMutation.isPending}
                            onClick={() => makePrimaryMutation.mutate(rule.id)}
                          >
                            {rule.isPrimary ? (
                              <CircleDot className="mr-2 h-4 w-4 text-blue-600" />
                            ) : (
                              <Circle className="mr-2 h-4 w-4" />
                            )}
                            {rule.isPrimary ? 'Oui' : 'Non'}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={removeRuleMutation.isPending}
                            onClick={() => removeRuleMutation.mutate(rule.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {pendingRuleRows.map((rule) => (
                      <TableRow key={rule.accountId}>
                        <TableCell className="font-mono text-sm">{rule.account?.code || '-'}</TableCell>
                        <TableCell>{rule.account?.label || 'Compte sélectionné'}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setPendingRules((current) =>
                                current.map((item) => ({
                                  ...item,
                                  isPrimary: item.accountId === rule.accountId,
                                }))
                              )
                            }
                          >
                            {rule.isPrimary ? (
                              <CircleDot className="mr-2 h-4 w-4 text-blue-600" />
                            ) : (
                              <Circle className="mr-2 h-4 w-4" />
                            )}
                            {rule.isPrimary ? 'Oui' : 'Non'}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() =>
                              setPendingRules((current) => {
                                const next = current.filter((item) => item.accountId !== rule.accountId);
                                if (!next.some((item) => item.isPrimary) && next[0]) {
                                  next[0] = { ...next[0], isPrimary: true };
                                }
                                return next;
                              })
                            }
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!existingRules.length && !pendingRuleRows.length && (
                      <TableRow>
                        <TableCell colSpan={4} className="py-8 text-center text-sm text-slate-500">
                          Aucun compte réel lié à cette famille.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
