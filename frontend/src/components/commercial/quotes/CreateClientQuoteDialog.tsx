'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { List, Plus, Trash2, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { billingService, type Quote } from '@/shared/api/billing';
import { commercialService } from '@/shared/api/commercial';
import { inventoryService } from '@/shared/api/inventory/inventory.service';
import type { InventoryArticle } from '@/shared/api/inventory/types';
import { useClients } from '@/hooks/useCrm';
import { useAuth } from '@/shared/hooks/useAuth';
import { enterpriseApi } from '@/lib/api';
import { getAccessibleEnterprises } from '@/shared/enterpriseScope';
import CustomerForm from '@/components/customers/CustomerForm';
import { ArticlePickerDialog } from '@/components/inventory/ArticlePickerDialog';
import { QuickCreateArticleDialog } from '@/components/inventory/QuickCreateArticleDialog';
import { type QuoteLineForm, type Props, type PartyPickerDialogProps, EMPTY_LINE, buildDefaultValidityDate, parseEnterpriseId, PartyPickerDialog, useCreateClientQuoteDialogModel } from './CreateClientQuoteDialog.model';

export function CreateClientQuoteDialog(__componentProps1: Props) {
  const { isOpen, onClose, initialQuote = null } = __componentProps1;
  const {
    user,
    queryClient,
    userEnterpriseId,
    clientId,
    setClientId,
    prospectId,
    setProspectId,
    enterpriseId,
    setEnterpriseId,
    objet,
    setObjet,
    dateValidite,
    setDateValidite,
    notes,
    setNotes,
    modeLivraison,
    setModeLivraison,
    modalitePaiement,
    setModalitePaiement,
    lines,
    setLines,
    uploadingIndex,
    setUploadingIndex,
    partyPickerOpen,
    setPartyPickerOpen,
    createClientOpen,
    setCreateClientOpen,
    articlePickerLineIndex,
    setArticlePickerLineIndex,
    articleCreateLineIndex,
    setArticleCreateLineIndex,
    isEdit,
    clients,
    prospects,
    enterprisesResponse,
    articlesResponse,
    clientsArray,
    prospectsArray,
    articles,
    accessibleEnterprises,
    createMutation,
    updateMutation,
    totals,
    formatCurrency,
    updateLine,
    applyArticleToLine,
    resetForm,
    handleClose,
    handleSubmit,
    handlePartyChange,
    selectedPartyValue,
  } = useCreateClientQuoteDialogModel(__componentProps1);



  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-h-[92vh] max-w-7xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEdit ? 'Modifier le devis client' : 'Nouveau devis client'}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? 'Révisez le devis suite aux échanges client puis enregistrez la nouvelle version.'
                : 'Le devis est créé par le service commercial, envoyé au client, puis transmis à la facturation après validation.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Entreprise</label>
                <select
                  value={enterpriseId}
                  onChange={(event) => setEnterpriseId(event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">
                    {accessibleEnterprises.length > 0
                      ? 'Sélectionner une entreprise'
                      : 'Aucune entreprise disponible'}
                  </option>
                  {accessibleEnterprises.map((enterprise) => (
                    <option key={String(enterprise.id)} value={String(enterprise.id)}>
                      {enterprise.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Client / prospect</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setPartyPickerOpen(true)}
                    title="Choisir dans la liste complète"
                    aria-label="Choisir dans la liste complète"
                    className="h-10 w-10 shrink-0"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCreateClientOpen(true)}
                    title="Créer un client"
                    aria-label="Créer un client"
                    className="h-10 w-10 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <select
                    value={selectedPartyValue}
                    onChange={(event) => handlePartyChange(event.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">Sélectionner un client ou prospect</option>
                    <optgroup label="Clients">
                      {clientsArray.map((client) => (
                        <option key={client.id} value={`client:${client.id}`}>
                          {client.nom || client.raisonSociale || client.reference || 'Client'}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Prospects">
                      {prospectsArray.map((prospect) => (
                        <option key={prospect.id} value={`prospect:${prospect.id}`}>
                          {prospect.companyName || prospect.contactName || 'Prospect'}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium">Objet du devis</label>
                <Input value={objet} onChange={(event) => setObjet(event.target.value)} placeholder="Fourniture équipements / prestation / abonnement..." />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date de validité</label>
                <Input type="date" value={dateValidite} onChange={(event) => setDateValidite(event.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Mode de livraison</label>
                <Input
                  value={modeLivraison}
                  onChange={(event) => setModeLivraison(event.target.value)}
                  placeholder="Livraison sur site, retrait, transporteur..."
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium">Modalité de paiement</label>
                <Input
                  value={modalitePaiement}
                  onChange={(event) => setModalitePaiement(event.target.value)}
                  placeholder="50% à la commande, 50% à la livraison"
                />
              </div>

              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium">Notes internes / conditions commerciales</label>
                <Input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Remise, délai, conditions de règlement..." />
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-background">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <h3 className="text-lg font-semibold">Lignes du devis</h3>
                  <p className="text-sm text-muted-foreground">Saisissez librement les prestations, articles et libellés commerciaux destinés au client.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
                    {lines.length} ligne{lines.length > 1 ? 's' : ''}
                  </div>
                  <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, { ...EMPTY_LINE }])}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter une ligne
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1180px] w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600">
                    <tr className="border-b">
                      <th className="w-14 px-4 py-3 font-semibold">Ligne</th>
                      <th className="w-24 px-4 py-3 font-semibold">Image</th>
                      <th className="min-w-[320px] px-4 py-3 font-semibold">Désignation / prestation</th>
                      <th className="min-w-[180px] px-4 py-3 font-semibold">Catégorie</th>
                      <th className="w-24 px-4 py-3 font-semibold">Qté</th>
                      <th className="w-32 px-4 py-3 font-semibold">P.U. HT</th>
                      <th className="w-24 px-4 py-3 font-semibold">TVA %</th>
                      <th className="w-32 px-4 py-3 font-semibold">Total TTC</th>
                      <th className="w-20 px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => {
                      const quantity = Number(line.quantite) || 0;
                      const unitPrice = Number(line.prixUnitaire) || 0;
                      const vatRate = Number(line.tauxTVA) || 0;
                      const totalTtc = quantity * unitPrice * (1 + vatRate / 100);

                      return (
                        <tr key={`quote-line-${index}`} className="border-b align-top">
                          <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3">
                            <label className="inline-flex items-center gap-3">
                              {line.imageUrl ? (
                                <img
                                  src={line.imageUrl?.replace('http://minio:9000', 'https://parabellum-erp.online/storage')}
                                  alt={line.description || `Ligne ${index + 1}`}
                                  className="h-12 w-12 rounded-md border object-cover"
                                />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-muted text-[10px] text-muted-foreground">
                                  <UploadCloud className="h-4 w-4" />
                                </div>
                              )}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingIndex !== null}
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (!file) return;
                                  setUploadingIndex(index);
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    updateLine(index, { imageUrl: String(reader.result || '') });
                                    toast.success('Image téléchargée avec succès');
                                    setUploadingIndex(null);
                                    event.target.value = '';
                                  };
                                  reader.onerror = () => {
                                    toast.error('Erreur lors de la lecture de l\'image');
                                    setUploadingIndex(null);
                                    event.target.value = '';
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </label>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setArticlePickerLineIndex(index)}
                                title="Choisir dans la liste complète"
                                aria-label="Choisir dans la liste complète"
                                className="h-12 w-12 shrink-0"
                              >
                                <List className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={() => setArticleCreateLineIndex(index)}
                                title="Nouveau produit"
                                aria-label="Nouveau produit"
                                className="h-12 w-12 shrink-0"
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                              <Input
                                value={line.description}
                                onChange={(event) => updateLine(index, { description: event.target.value })}
                                placeholder="Libellé libre pour le client"
                                className="h-12 text-base"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              value={line.categorie}
                              onChange={(event) => updateLine(index, { categorie: event.target.value })}
                              placeholder="Produit, service, abonnement..."
                              className="h-12 text-base"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min="1"
                              value={line.quantite}
                              onChange={(event) => updateLine(index, { quantite: event.target.value })}
                              className="h-12 text-lg font-medium"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min="0"
                              value={line.prixUnitaire}
                              onChange={(event) => updateLine(index, { prixUnitaire: event.target.value })}
                              className="h-12 text-lg font-medium"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              min="0"
                              value={line.tauxTVA}
                              onChange={(event) => updateLine(index, { tauxTVA: event.target.value })}
                              className="h-12 text-lg font-medium"
                            />
                          </td>
                          <td className="px-4 py-3 text-base font-semibold whitespace-nowrap">{formatCurrency(totalTtc)}</td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                setLines((current) => (current.length === 1 ? current : current.filter((_, currentIndex) => currentIndex !== index)))
                              }
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 border-t border-border bg-muted/20 px-4 py-4 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-background px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Total HT</div>
                  <div className="mt-1 text-lg font-semibold">{formatCurrency(totals.ht)}</div>
                </div>
                <div className="rounded-lg border border-border bg-background px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">TVA</div>
                  <div className="mt-1 text-lg font-semibold">{formatCurrency(totals.tva)}</div>
                </div>
                <div className="rounded-lg border border-border bg-background px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">Total TTC</div>
                  <div className="mt-1 text-lg font-semibold text-blue-700">{formatCurrency(totals.ttc)}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <div className="text-sm text-muted-foreground">
                Le devis est enregistré en brouillon puis pourra être envoyé au client pour validation.
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={
                    (!clientId && !prospectId) ||
                    !enterpriseId ||
                    !objet.trim() ||
                    createMutation.isPending ||
                    updateMutation.isPending
                  }
                >
                  {isEdit
                    ? updateMutation.isPending
                      ? 'Enregistrement...'
                      : 'Mettre à jour'
                    : createMutation.isPending
                      ? 'Création...'
                      : 'Créer le devis'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PartyPickerDialog
        open={partyPickerOpen}
        onOpenChange={setPartyPickerOpen}
        clients={clientsArray}
        prospects={prospectsArray}
        onSelect={handlePartyChange}
      />

      <Dialog open={createClientOpen} onOpenChange={setCreateClientOpen}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
            <DialogDescription>Créez le client puis sélectionnez-le dans le devis.</DialogDescription>
          </DialogHeader>
          <CustomerForm
            onSuccess={() => {
              setCreateClientOpen(false);
              queryClient.invalidateQueries({ queryKey: ['crm', 'clients'] });
            }}
            onCancel={() => setCreateClientOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <ArticlePickerDialog
        open={articlePickerLineIndex !== null}
        onOpenChange={(open) => {
          if (!open) setArticlePickerLineIndex(null);
        }}
        articles={articles}
        onSelect={(article) => {
          if (articlePickerLineIndex === null) return;
          applyArticleToLine(articlePickerLineIndex, article);
          setArticlePickerLineIndex(null);
        }}
        title="Choisir dans la liste complete"
        description="Sélectionnez un produit du catalogue pour préremplir la ligne du devis client."
      />

      <QuickCreateArticleDialog
        open={articleCreateLineIndex !== null}
        onOpenChange={(open) => {
          if (!open) setArticleCreateLineIndex(null);
        }}
        onCreated={(article) => {
          if (articleCreateLineIndex === null) return;
          applyArticleToLine(articleCreateLineIndex, article);
          setArticleCreateLineIndex(null);
        }}
      />
    </>
  );
}

export default CreateClientQuoteDialog;
