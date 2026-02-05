'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import customersService from '@/shared/api/services/customers';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CustomerForm from '@/components/customers/CustomerForm';

export default function CustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queryClient = useQueryClient();
  const customerId = params.id as string;
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: async () => {
      const response = await customersService.getCustomer(customerId);
      return response.data;
    },
  });

  const { data: interactionsData, isLoading: isLoadingInteractions } = useQuery({
    queryKey: ['customer-interactions', customerId],
    queryFn: async () => {
      const response = await customersService.getInteractions({ clientId: customerId });
      return response;
    },
    enabled: !!customerId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => customersService.deleteCustomer(customerId),
    onSuccess: () => {
      router.push('/dashboard/clients');
    },
  });

  const handleDelete = () => {
    if (confirm(`Êtes-vous sûr de vouloir archiver ce client ?`)) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Client non trouvé</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIF': return <Badge variant="success">Actif</Badge>;
      case 'PROSPECT': return <Badge variant="warning">Prospect</Badge>;
      case 'INACTIF': return <Badge variant="secondary">Inactif</Badge>;
      case 'ARCHIVE': return <Badge variant="outline">Archivé</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {customer.nom}
            </h1>
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
          <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
            Modifier
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="text-red-600 hover:text-red-700"
          >
            Archiver
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="addresses">Adresses</TabsTrigger>
          <TabsTrigger value="interactions">Interactions</TabsTrigger>
        </TabsList>

        {/* Informations Tab */}
        <TabsContent value="info" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Informations générales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Nom / Raison Sociale
                </label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {customer.nom} {customer.raisonSociale ? `(${customer.raisonSociale})` : ''}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Type de client
                </label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {customer.typeClient?.libelle || '-'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Email
                </label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {customer.email}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Téléphone
                </label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {customer.telephone || customer.mobile || '-'}
                </p>
              </div>

              {customer.siret && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    SIRET
                  </label>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {customer.siret}
                  </p>
                </div>
              )}

              {customer.siteWeb && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Site Web
                  </label>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    <a href={customer.siteWeb} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {customer.siteWeb}
                    </a>
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Priorité
                </label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {customer.priorite}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Secteur d'activité
                </label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {customer.secteurActivite?.libelle || '-'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Statistiques</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold">{customer._count?.contacts || 0}</p>
                <p className="text-xs text-gray-500">Contacts</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold">{customer._count?.contrats || 0}</p>
                <p className="text-xs text-gray-500">Contrats</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold">{customer._count?.interactions || 0}</p>
                <p className="text-xs text-gray-500">Interactions</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-2xl font-bold">{customer._count?.opportunites || 0}</p>
                <p className="text-xs text-gray-500">Opportunités</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Contacts ({customer.contacts?.length || 0})</h3>
              <Button size="sm">Ajouter un contact</Button>
            </div>
            {customer.contacts && customer.contacts.length > 0 ? (
              <div className="space-y-4">
                {customer.contacts.map((contact) => (
                  <div key={contact.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">{contact.prenom} {contact.nom} {contact.principal && <Badge className="ml-2">Principal</Badge>}</p>
                      <p className="text-sm text-gray-500">{contact.poste} - {contact.departement}</p>
                      <p className="text-xs text-gray-400">{contact.email} | {contact.mobile || contact.telephone}</p>
                    </div>
                    <Button size="sm" variant="ghost">Modifier</Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Aucun contact enregistré
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Addresses Tab */}
        <TabsContent value="addresses">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Adresses ({customer.adresses?.length || 0})</h3>
              <Button size="sm">Ajouter une adresse</Button>
            </div>
            {customer.adresses && customer.adresses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customer.adresses.map((address) => (
                  <div key={address.id} className="p-4 border rounded-lg relative">
                    {address.isPrincipal && <Badge className="absolute top-2 right-2">Principale</Badge>}
                    <p className="text-xs font-bold text-gray-400 mb-1">{address.typeAdresse}</p>
                    <p>{address.ligne1}</p>
                    {address.ligne2 && <p>{address.ligne2}</p>}
                    <p>{address.codePostal} {address.ville}</p>
                    <p>{address.pays}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Aucune adresse enregistrée
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Interactions Tab */}
        <TabsContent value="interactions">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Dernières Interactions</h3>
              <Button size="sm">Nouvelle interaction</Button>
            </div>
            {isLoadingInteractions ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : interactionsData?.data && interactionsData.data.length > 0 ? (
              <div className="space-y-4">
                {interactionsData.data.map((interaction) => (
                  <div key={interaction.id} className="p-4 border-l-4 border-blue-500 bg-gray-50 dark:bg-gray-800 rounded-r-lg">
                    <div className="flex justify-between">
                      <p className="font-bold">{interaction.sujet}</p>
                      <p className="text-xs text-gray-400">{new Date(interaction.dateInteraction).toLocaleString('fr-FR')}</p>
                    </div>
                    <p className="text-sm mt-1">{interaction.description}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">{interaction.type}</Badge>
                      <Badge variant="outline">{interaction.canal}</Badge>
                      {interaction.contact && (
                        <span className="text-xs text-gray-500">avec {interaction.contact.prenom} {interaction.contact.nom}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Aucune interaction enregistrée
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
          </DialogHeader>
          <CustomerForm
            customer={customer}
            onSuccess={() => {
              setIsEditDialogOpen(false);
              queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
            }}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
