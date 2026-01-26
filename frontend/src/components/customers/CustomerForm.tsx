'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import customersService, { CustomerData } from '@/shared/api/services/customers';
import { Customer } from '@/shared/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';

const customerSchema = z.object({
  companyName: z.string().min(1, 'Le nom de l\'entreprise est requis'),
  contactFirstName: z.string().min(1, 'Le prénom est requis'),
  contactLastName: z.string().min(1, 'Le nom est requis'),
  email: z.string().email('Email invalide'),
  phoneNumber: z.string().optional(),
  siret: z.string().optional(),
  vatNumber: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  isActive: z.boolean().default(true),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  customer?: Customer;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CustomerForm({ customer, onSuccess, onCancel }: CustomerFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!customer;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer ? {
      companyName: customer.companyName,
      contactFirstName: customer.contactFirstName,
      contactLastName: customer.contactLastName,
      email: customer.email,
      phoneNumber: customer.phoneNumber || '',
      siret: customer.siret || '',
      vatNumber: customer.vatNumber || '',
      street: customer.address?.street || '',
      city: customer.address?.city || '',
      postalCode: customer.address?.postalCode || '',
      country: customer.address?.country || '',
      isActive: customer.isActive,
    } : {
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: CustomerData) => customersService.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: CustomerData) => customersService.updateCustomer(customer!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customer!.id] });
      onSuccess?.();
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    const customerData: CustomerData = {
      companyName: data.companyName,
      contactFirstName: data.contactFirstName,
      contactLastName: data.contactLastName,
      email: data.email,
      phoneNumber: data.phoneNumber,
      siret: data.siret,
      vatNumber: data.vatNumber,
      isActive: data.isActive,
      address: data.street ? {
        street: data.street,
        city: data.city || '',
        postalCode: data.postalCode || '',
        country: data.country || '',
      } : undefined,
    };

    if (isEditing) {
      updateMutation.mutate(customerData);
    } else {
      createMutation.mutate(customerData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Informations de l'entreprise</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="companyName">Nom de l'entreprise *</Label>
            <Input
              id="companyName"
              {...register('companyName')}
              placeholder="Acme Corporation"
              className="mt-1"
            />
            {errors.companyName && (
              <p className="text-sm text-red-500 mt-1">{errors.companyName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="siret">SIRET</Label>
            <Input
              id="siret"
              {...register('siret')}
              placeholder="123 456 789 00012"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="vatNumber">TVA Intracommunautaire</Label>
            <Input
              id="vatNumber"
              {...register('vatNumber')}
              placeholder="FR12345678901"
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Contact principal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="contactFirstName">Prénom *</Label>
            <Input
              id="contactFirstName"
              {...register('contactFirstName')}
              placeholder="Jean"
              className="mt-1"
            />
            {errors.contactFirstName && (
              <p className="text-sm text-red-500 mt-1">{errors.contactFirstName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="contactLastName">Nom *</Label>
            <Input
              id="contactLastName"
              {...register('contactLastName')}
              placeholder="Dupont"
              className="mt-1"
            />
            {errors.contactLastName && (
              <p className="text-sm text-red-500 mt-1">{errors.contactLastName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="jean.dupont@example.com"
              className="mt-1"
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phoneNumber">Téléphone</Label>
            <Input
              id="phoneNumber"
              {...register('phoneNumber')}
              placeholder="+33 1 23 45 67 89"
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Adresse</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="street">Rue</Label>
            <Input
              id="street"
              {...register('street')}
              placeholder="123 Rue de la Paix"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="postalCode">Code postal</Label>
              <Input
                id="postalCode"
                {...register('postalCode')}
                placeholder="75001"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="city">Ville</Label>
              <Input
                id="city"
                {...register('city')}
                placeholder="Paris"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="country">Pays</Label>
              <Input
                id="country"
                {...register('country')}
                placeholder="France"
                className="mt-1"
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Annuler
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
}
