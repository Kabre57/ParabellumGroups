'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { crmService, Client, TypeClient } from '@/shared/api/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

const clientSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  raisonSociale: z.string().optional(),
  email: z.string().email('Email invalide'),
  telephone: z.string().optional(),
  mobile: z.string().optional(),
  siteWeb: z.string().optional(),
  siret: z.string().optional(),
  tvaIntra: z.string().optional(),
  typeClientId: z.string().min(1, 'Le type de client est requis'),
  status: z.string().default('PROSPECT'),
  priorite: z.string().default('MOYENNE'),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface CustomerFormProps {
  customer?: Client;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function CustomerForm({ customer, onSuccess, onCancel }: CustomerFormProps) {
  const queryClient = useQueryClient();
  const isEditing = !!customer;
  const [types, setTypes] = useState<TypeClient[]>([]);

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const response = await crmService.getTypeClients();
        setTypes(response);
      } catch (error) {
        console.error('Erreur lors du chargement des types de clients', error);
      }
    };
    fetchTypes();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: customer ? {
      nom: customer.nom,
      raisonSociale: customer.raisonSociale || '',
      email: customer.email,
      telephone: customer.telephone || '',
      mobile: customer.mobile || '',
      siteWeb: customer.siteWeb || '',
      siret: customer.siret || '',
      tvaIntra: customer.tvaIntra || '',
      typeClientId: customer.typeClientId,
      status: customer.status,
      priorite: customer.priorite,
    } : {
      status: 'PROSPECT',
      priorite: 'MOYENNE',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ClientFormData) => crmService.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ClientFormData) => crmService.updateClient(customer!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customer!.id] });
      onSuccess?.();
    },
  });

  const onSubmit = (data: ClientFormData) => {
    if (isEditing) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Informations générales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="nom">Nom / Nom de l'entreprise *</Label>
            <Input
              id="nom"
              {...register('nom')}
              placeholder="Acme Corp ou Jean Dupont"
              className="mt-1"
            />
            {errors.nom && (
              <p className="text-sm text-red-500 mt-1">{errors.nom.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="raisonSociale">Raison Sociale</Label>
            <Input
              id="raisonSociale"
              {...register('raisonSociale')}
              placeholder="SARL Acme"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="typeClientId">Type de client *</Label>
            <select
              id="typeClientId"
              {...register('typeClientId')}
              className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
            >
              <option value="">Sélectionner un type</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>{t.libelle}</option>
              ))}
            </select>
            {errors.typeClientId && (
              <p className="text-sm text-red-500 mt-1">{errors.typeClientId.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="status">Statut</Label>
            <select
              id="status"
              {...register('status')}
              className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
            >
              <option value="PROSPECT">Prospect</option>
              <option value="ACTIF">Actif</option>
              <option value="INACTIF">Inactif</option>
              <option value="SUSPENDU">Suspendu</option>
              <option value="LEAD_CHAUD">Lead Chaud</option>
              <option value="LEAD_FROID">Lead Froid</option>
            </select>
          </div>

          <div>
            <Label htmlFor="priorite">Priorité</Label>
            <select
              id="priorite"
              {...register('priorite')}
              className="w-full h-10 px-3 mt-1 rounded-md border border-input bg-background"
            >
              <option value="BASSE">Basse</option>
              <option value="MOYENNE">Moyenne</option>
              <option value="HAUTE">Haute</option>
              <option value="CRITIQUE">Critique</option>
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Contact & Identifiants</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="contact@example.com"
              className="mt-1"
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="telephone">Téléphone fixe</Label>
            <Input
              id="telephone"
              {...register('telephone')}
              placeholder="+33 1 23 45 67 89"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="mobile">Mobile</Label>
            <Input
              id="mobile"
              {...register('mobile')}
              placeholder="+33 6 12 34 56 78"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="siteWeb">Site Web</Label>
            <Input
              id="siteWeb"
              {...register('siteWeb')}
              placeholder="https://www.example.com"
              className="mt-1"
            />
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
            <Label htmlFor="tvaIntra">TVA Intracommunautaire</Label>
            <Input
              id="tvaIntra"
              {...register('tvaIntra')}
              placeholder="FR12345678901"
              className="mt-1"
            />
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
