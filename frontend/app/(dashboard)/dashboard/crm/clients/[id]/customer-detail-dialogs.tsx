/**
 * Regroupe les fen?tres de modification et de saisie de la fiche client.
 */
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import CustomerForm from '@/components/customers/CustomerForm';
import { ADDRESS_TYPES, CONTACT_STATUSES, CONTACT_TYPES, INTERACTION_CHANNELS, INTERACTION_RESULTS, INTERACTION_TYPES } from './customer-detail.utils';
import type { CustomerDetailModel } from './use-customer-detail';

export function CustomerDetailDialogs({ model }: { model: CustomerDetailModel }) {
  const {
    isEditDialogOpen,
    setIsEditDialogOpen,
    contactDialogOpen,
    setContactDialogOpen,
    addressDialogOpen,
    setAddressDialogOpen,
    interactionDialogOpen,
    setInteractionDialogOpen,
    editingContact,
    editingAddress,
    editingInteraction,
    canUpdate,
    customer,
    contacts,
    contactForm,
    addressForm,
    interactionForm,
    refreshCustomer,
    submitContact,
    submitAddress,
    submitInteraction,
  } = model;

  return (
    <>
      {canUpdate && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le client</DialogTitle>
              <DialogDescription>Mettez à jour les informations du client.</DialogDescription>
            </DialogHeader>
            <CustomerForm
              customer={customer}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                refreshCustomer();
              }}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingContact ? 'Modifier le contact' : 'Ajouter un contact'}</DialogTitle>
            <DialogDescription>Ce contact sera rattaché au client CRM courant.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitContact} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Prénom</label>
                <Input {...contactForm.register('prenom', { required: true })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Nom</label>
                <Input {...contactForm.register('nom', { required: true })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <Input type="email" {...contactForm.register('email')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Téléphone</label>
                <Input {...contactForm.register('telephone')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Mobile</label>
                <Input {...contactForm.register('mobile')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Poste</label>
                <Input {...contactForm.register('poste')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Département</label>
                <Input {...contactForm.register('departement')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Type</label>
                <select {...contactForm.register('type')} className="w-full rounded-md border px-3 py-2">
                  {CONTACT_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Statut</label>
                <select {...contactForm.register('statut')} className="w-full rounded-md border px-3 py-2">
                  {CONTACT_STATUSES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...contactForm.register('principal')} />
              Définir comme contact principal
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setContactDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">{editingContact ? 'Enregistrer' : 'Créer'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingAddress ? "Modifier l'adresse" : 'Ajouter une adresse CI'}</DialogTitle>
            <DialogDescription>On capture ici une adresse adaptee au contexte ivoirien.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitAddress} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Nom de l'adresse</label>
                <Input {...addressForm.register('nomAdresse')} placeholder="Siege social, depot Vridi..." />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Type</label>
                <select {...addressForm.register('typeAdresse')} className="w-full rounded-md border px-3 py-2">
                  {ADDRESS_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Quartier</label>
                <Input {...addressForm.register('ligne1', { required: true })} placeholder="Ex: Angre 7e tranche" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Rue / residence</label>
                <Input {...addressForm.register('ligne2')} placeholder="Ex: Rue L125, Residence Soleil" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Repere visuel</label>
                <Input {...addressForm.register('ligne3')} placeholder="Ex: Non loin de la pharmacie" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Boite postale (BP)</label>
                <Input {...addressForm.register('codePostal')} placeholder="Ex: 01 BP 456" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Commune / ville</label>
                <Input {...addressForm.register('ville', { required: true })} placeholder="Ex: Cocody" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">District</label>
                <Input {...addressForm.register('region')} placeholder="Ex: District d'Abidjan" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Pays</label>
                <Input {...addressForm.register('pays', { required: true })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Coordonnees GPS</label>
                <Input {...addressForm.register('coordonneesGps')} placeholder="Ex: 5.348,-4.030" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Infos d'acces</label>
                <Input {...addressForm.register('informationsAcces')} placeholder="Ex: Pres de l'allocodrome, portail gris" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...addressForm.register('isPrincipal')} />
              Définir comme adresse principale
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddressDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">{editingAddress ? 'Enregistrer' : 'Créer'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={interactionDialogOpen} onOpenChange={setInteractionDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingInteraction ? 'Modifier l’interaction' : 'Nouvelle interaction'}</DialogTitle>
            <DialogDescription>Historisez les échanges avec ce client.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitInteraction} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Sujet</label>
                <Input {...interactionForm.register('sujet', { required: true })} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Date</label>
                <Input type="datetime-local" {...interactionForm.register('dateInteraction')} />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Type</label>
                <select {...interactionForm.register('type')} className="w-full rounded-md border px-3 py-2">
                  {INTERACTION_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Canal</label>
                <select {...interactionForm.register('canal')} className="w-full rounded-md border px-3 py-2">
                  {INTERACTION_CHANNELS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Contact lié</label>
                <select {...interactionForm.register('contactId')} className="w-full rounded-md border px-3 py-2">
                  <option value="">Aucun contact</option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.prenom} {contact.nom}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Résultat</label>
                <select {...interactionForm.register('resultat')} className="w-full rounded-md border px-3 py-2">
                  {INTERACTION_RESULTS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">Description</label>
                <Textarea rows={4} {...interactionForm.register('description')} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setInteractionDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">{editingInteraction ? 'Enregistrer' : 'Créer'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
