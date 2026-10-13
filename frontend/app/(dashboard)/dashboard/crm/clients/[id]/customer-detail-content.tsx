/**
 * Affiche les informations, contacts, adresses et interactions du client.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { formatAddress } from './customer-detail.utils';
import { CustomerDetailDialogs } from './customer-detail-dialogs';
import type { CustomerDetailModel } from './use-customer-detail';

export function CustomerDetailContent({ model }: { model: CustomerDetailModel }) {
  const {
    router,
    setIsEditDialogOpen,
    setContactDialogOpen,
    setAddressDialogOpen,
    setInteractionDialogOpen,
    setEditingContact,
    setEditingAddress,
    setEditingInteraction,
    canUpdate,
    canDelete,
    canManageContacts,
    canManageAddresses,
    canManageInteractions,
    isLoading,
    customer,
    isLoadingContacts,
    isLoadingAddresses,
    isLoadingInteractions,
    contacts,
    addresses,
    interactions,
    archiveMutation,
    deleteContactMutation,
    setContactPrincipalMutation,
    deleteAddressMutation,
    setAddressPrincipalMutation,
    deleteInteractionMutation,
    refreshCustomer,
    handleDelete,
  } = model;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIF':
        return <Badge variant="success">Actif</Badge>;
      case 'PROSPECT':
        return <Badge variant="warning">Prospect</Badge>;
      case 'INACTIF':
        return <Badge variant="secondary">Inactif</Badge>;
      case 'ARCHIVE':
        return <Badge variant="outline">Archivé</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!customer) {
    return <div className="py-12 text-center text-gray-500 dark:text-gray-400">Client non trouvé</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{customer.nom}</h1>
            {getStatusBadge(customer.status)}
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Référence: {customer.reference} | ID: {customer.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Retour
          </Button>
          {canUpdate && (
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              Modifier
            </Button>
          )}
          {canDelete && (
            <Button
              variant="outline"
              onClick={handleDelete}
              disabled={archiveMutation.isPending}
              className="text-red-600 hover:text-red-700"
            >
              Archiver
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="addresses">Adresses</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Informations générales</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Nom / Raison sociale</label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {customer.nom} {customer.raisonSociale ? `(${customer.raisonSociale})` : ''}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Type de client</label>
                <p className="mt-1 text-gray-900 dark:text-white">{customer.typeClient?.libelle || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
                <p className="mt-1 text-gray-900 dark:text-white">{customer.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Telephone</label>
                <p className="mt-1 text-gray-900 dark:text-white">{customer.telephone || customer.mobile || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Site web</label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {customer.siteWeb ? (
                    <a href={customer.siteWeb} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                      {customer.siteWeb}
                    </a>
                  ) : (
                    '-'
                  )}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Priorite</label>
                <p className="mt-1 text-gray-900 dark:text-white">{customer.priorite}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">IDU</label>
                <p className="mt-1 text-gray-900 dark:text-white">{customer.idu || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">NCC</label>
                <p className="mt-1 text-gray-900 dark:text-white">{customer.ncc || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">RCCM</label>
                <p className="mt-1 text-gray-900 dark:text-white">{customer.rccm || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Code activite</label>
                <p className="mt-1 text-gray-900 dark:text-white">{customer.codeActivite || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Fax</label>
                <p className="mt-1 text-gray-900 dark:text-white">{customer.fax || '-'}</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Statistiques</h3>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
                <p className="text-2xl font-bold">{contacts.length}</p>
                <p className="text-xs text-gray-500">Contacts</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
                <p className="text-2xl font-bold">{addresses.length}</p>
                <p className="text-xs text-gray-500">Adresses</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
                <p className="text-2xl font-bold">{interactions.length}</p>
                <p className="text-xs text-gray-500">Interactions</p>
              </div>
              <div className="rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
                <p className="text-2xl font-bold">{customer._count?.opportunites || 0}</p>
                <p className="text-xs text-gray-500">Opportunités</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Contacts ({contacts.length})</h3>
              {canManageContacts && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingContact(null);
                    setContactDialogOpen(true);
                  }}
                >
                  Ajouter un contact
                </Button>
              )}
            </div>
            {isLoadingContacts ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : contacts.length > 0 ? (
              <div className="space-y-4">
                {contacts.map((contact) => (
                  <div key={contact.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {contact.prenom} {contact.nom}{' '}
                          {contact.principal && <Badge className="ml-2">Principal</Badge>}
                        </p>
                        <p className="text-sm text-gray-500">{contact.poste || 'Poste non renseigné'}</p>
                        <p className="text-sm text-gray-500">{contact.email || 'Email non renseigné'}</p>
                        <p className="text-sm text-gray-500">{contact.mobile || contact.telephone || 'Aucun téléphone'}</p>
                      </div>
                      {canManageContacts && (
                        <div className="flex flex-wrap gap-2">
                          {!contact.principal && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setContactPrincipalMutation.mutate(
                                  { id: contact.id, principal: true },
                                  {
                                    onSuccess: () => {
                                      toast.success('Contact principal mis à jour');
                                      refreshCustomer();
                                    },
                                    onError: () => toast.error('Impossible de définir ce contact comme principal'),
                                  }
                                )
                              }
                            >
                              Définir principal
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingContact(contact);
                              setContactDialogOpen(true);
                            }}
                          >
                            Modifier
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              if (confirm(`Supprimer le contact ${contact.prenom} ${contact.nom} ?`)) {
                                deleteContactMutation.mutate(contact.id, {
                                  onSuccess: () => {
                                    toast.success('Contact supprimé');
                                    refreshCustomer();
                                  },
                                  onError: () => toast.error('Impossible de supprimer ce contact'),
                                });
                              }
                            }}
                          >
                            Supprimer
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">Aucun contact enregistré</div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="addresses">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Adresses ({addresses.length})</h3>
              {canManageAddresses && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingAddress(null);
                    setAddressDialogOpen(true);
                  }}
                >
                  Ajouter une adresse CI
                </Button>
              )}
            </div>
            {isLoadingAddresses ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : addresses.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {addresses.map((address) => (
                  <div key={address.id} className="relative rounded-lg border p-4">
                    {address.isPrincipal && (
                      <Badge className="absolute right-4 top-4" variant="success">
                        Principale
                      </Badge>
                    )}
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{address.typeAdresse}</p>
                    <p className="mt-2 font-medium text-gray-900 dark:text-white">{address.nomAdresse || 'Adresse client'}</p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{formatAddress(address)}</p>
                    {(address.coordonneesGps || address.informationsAcces) && (
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {[address.coordonneesGps, address.informationsAcces].filter(Boolean).join(' | ')}
                      </p>
                    )}
                    {canManageAddresses && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {!address.isPrincipal && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setAddressPrincipalMutation.mutate(address.id as string, {
                                onSuccess: () => {
                                  toast.success('Adresse principale mise à jour');
                                  refreshCustomer();
                                },
                                onError: () => toast.error('Impossible de définir cette adresse comme principale'),
                              })
                            }
                          >
                            Définir principale
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingAddress(address);
                            setAddressDialogOpen(true);
                          }}
                        >
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            if (confirm('Supprimer cette adresse ?')) {
                              deleteAddressMutation.mutate(address.id as string, {
                                onSuccess: () => {
                                  toast.success('Adresse supprimée');
                                  refreshCustomer();
                                },
                                onError: () => toast.error('Impossible de supprimer cette adresse'),
                              });
                            }
                          }}
                        >
                          Supprimer
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">Aucune adresse enregistrée</div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="interactions">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Interactions ({interactions.length})</h3>
              {canManageInteractions && (
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingInteraction(null);
                    setInteractionDialogOpen(true);
                  }}
                >
                  Nouvelle interaction
                </Button>
              )}
            </div>
            {isLoadingInteractions ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : interactions.length > 0 ? (
              <div className="space-y-4">
                {interactions.map((interaction) => (
                  <div key={interaction.id} className="rounded-lg border-l-4 border-blue-500 bg-gray-50 p-4 dark:bg-gray-800">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{interaction.sujet}</p>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{interaction.description || 'Aucune description'}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="outline">{interaction.type}</Badge>
                          <Badge variant="outline">{interaction.canal}</Badge>
                          {interaction.resultat && <Badge variant="outline">{interaction.resultat}</Badge>}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        {new Date(interaction.dateInteraction).toLocaleString('fr-FR')}
                      </div>
                    </div>
                    {canManageInteractions && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingInteraction(interaction);
                            setInteractionDialogOpen(true);
                          }}
                        >
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            if (confirm(`Supprimer l’interaction ${interaction.sujet} ?`)) {
                              deleteInteractionMutation.mutate(interaction.id, {
                                onSuccess: () => {
                                  toast.success('Interaction supprimée');
                                  refreshCustomer();
                                },
                                onError: () => toast.error('Impossible de supprimer cette interaction'),
                              });
                            }
                          }}
                        >
                          Supprimer
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500 dark:text-gray-400">Aucune interaction enregistrée</div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <CustomerDetailDialogs model={model} />
      </div>
    );
}
