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

  const deleteMutation = useMutation({
    mutationFn: () => customersService.deleteCustomer(customerId),
    onSuccess: () => {
      router.push('/dashboard/clients');
    },
  });

  const handleDelete = () => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ce client ?`)) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {customer.companyName}
            </h1>
            <Badge variant={customer.isActive ? 'success' : 'outline'}>
              {customer.isActive ? 'Actif' : 'Inactif'}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Client #{customer.id.slice(0, 8).toUpperCase()}
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
            Supprimer
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Informations</TabsTrigger>
          <TabsTrigger value="addresses">Adresses</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="history">Historique</TabsTrigger>
        </TabsList>

        {/* Informations Tab */}
        <TabsContent value="info" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Informations générales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Nom de l'entreprise
                </label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {customer.companyName}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Contact principal
                </label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {customer.contactFirstName} {customer.contactLastName}
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
                  {customer.phoneNumber || '-'}
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

              {customer.vatNumber && (
                <div>
                  <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    TVA Intracommunautaire
                  </label>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {customer.vatNumber}
                  </p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Date de création
                </label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {new Date(customer.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Dernière mise à jour
                </label>
                <p className="mt-1 text-gray-900 dark:text-white">
                  {new Date(customer.updatedAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
          </Card>

          {customer.address && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Adresse principale</h3>
              <div className="text-gray-900 dark:text-white">
                <p>{customer.address.street}</p>
                <p>
                  {customer.address.postalCode} {customer.address.city}
                </p>
                <p>{customer.address.country}</p>
                {customer.address.additionalInfo && (
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {customer.address.additionalInfo}
                  </p>
                )}
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Addresses Tab */}
        <TabsContent value="addresses">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Adresses</h3>
              <Button size="sm">Ajouter une adresse</Button>
            </div>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Fonctionnalité à venir
            </div>
          </Card>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Contacts</h3>
              <Button size="sm">Ajouter un contact</Button>
            </div>
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Fonctionnalité à venir
            </div>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Historique</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Client créé
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(customer.createdAt).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4 pb-4">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Dernière modification
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(customer.updatedAt).toLocaleString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>
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
            onSuccess={() => setIsEditDialogOpen(false)}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
