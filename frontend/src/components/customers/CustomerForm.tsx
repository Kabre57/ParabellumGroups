'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { crmService, Client } from '@/shared/api/crm';
import { useTypeClients } from '@/hooks/useCrm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

const phoneRegex = /^[+\d][\d\s().-]{5,}$/;
const iduRegex = /^CI-\d{4}-[A-Z0-9]{7,8}$/i;
const alphaNumRegex = /^[A-Z0-9\-/. ]+$/i;
const websiteRegex = /^https?:\/\/.+/i;

const sanitizeClientPayload = (data: ClientFormData) =>
  Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ) as ClientFormData;

const clientSchema = z.object({
  nom: z.string().min(1, 'Le nom est requis'),
  raisonSociale: z.preprocess(emptyToUndefined, z.string().optional()),
  email: z.string().email('Email invalide'),
  telephone: z.preprocess(
    emptyToUndefined,
    z.string().regex(phoneRegex, 'Numero de telephone invalide').optional()
  ),
  mobile: z.preprocess(
    emptyToUndefined,
    z.string().regex(phoneRegex, 'Numero de mobile invalide').optional()
  ),
  fax: z.preprocess(
    emptyToUndefined,
    z.string().regex(phoneRegex, 'Numero de fax invalide').optional()
  ),
  siteWeb: z.preprocess(
    emptyToUndefined,
    z.string().regex(websiteRegex, 'URL invalide').optional()
  ),
  idu: z.preprocess(
    emptyToUndefined,
    z.string().regex(iduRegex, 'IDU invalide (ex: CI-2024-1234567A)').optional()
  ),
  ncc: z.preprocess(
    emptyToUndefined,
    z.string().regex(alphaNumRegex, 'NCC invalide').optional()
  ),
  rccm: z.preprocess(
    emptyToUndefined,
    z.string().regex(alphaNumRegex, 'RCCM invalide').optional()
  ),
  codeActivite: z.preprocess(
    emptyToUndefined,
    z.string().regex(alphaNumRegex, "Code d'activite invalide").optional()
  ),
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

  const { data: typeClientsResponse = [], isLoading: isLoadingTypes } = useTypeClients();
  const typeClients = Array.isArray(typeClientsResponse)
    ? typeClientsResponse
    : Array.isArray((typeClientsResponse as any)?.data)
      ? (typeClientsResponse as any).data
      : [];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: customer
      ? {
          nom: customer.nom,
          raisonSociale: customer.raisonSociale || '',
          email: customer.email,
          telephone: customer.telephone || '',
          mobile: customer.mobile || '',
          fax: customer.fax || '',
          siteWeb: customer.siteWeb || '',
          idu: customer.idu || '',
          ncc: customer.ncc || '',
          rccm: customer.rccm || '',
          codeActivite: customer.codeActivite || '',
          typeClientId: customer.typeClientId,
          status: customer.status,
          priorite: customer.priorite,
        }
      : {
          status: 'PROSPECT',
          priorite: 'MOYENNE',
        },
  });

  const createMutation = useMutation({
    mutationFn: (data: ClientFormData) => crmService.createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'clients'] });
      onSuccess?.();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ClientFormData) => crmService.updateClient(customer!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customer!.id] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'clients'] });
      queryClient.invalidateQueries({ queryKey: ['crm', 'client', customer!.id] });
      onSuccess?.();
    },
  });

  const onSubmit = (data: ClientFormData) => {
    const payload = sanitizeClientPayload(data);

    if (isEditing) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Informations generales</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label htmlFor="nom">Nom / Nom de l&apos;entreprise *</Label>
            <Input
              id="nom"
              {...register('nom')}
              placeholder="Ex: Societe Ivoirienne de Services"
              className="mt-1"
            />
            {errors.nom && <p className="mt-1 text-sm text-red-500">{errors.nom.message}</p>}
          </div>

          <div>
            <Label htmlFor="raisonSociale">Raison sociale</Label>
            <Input
              id="raisonSociale"
              {...register('raisonSociale')}
              placeholder="Ex: SARL S2I"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="typeClientId">Type de client *</Label>
            <select
              id="typeClientId"
              {...register('typeClientId')}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"
              disabled={isLoadingTypes}
            >
              <option value="">Selectionner un type</option>
              {typeClients.filter((typeClient: any) => typeClient.isActive).map((typeClient: any) => (
                <option key={typeClient.id} value={typeClient.id}>
                  {typeClient.libelle}
                </option>
              ))}
            </select>
            {errors.typeClientId && (
              <p className="mt-1 text-sm text-red-500">{errors.typeClientId.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="status">Statut</Label>
            <select
              id="status"
              {...register('status')}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"
            >
              <option value="PROSPECT">Prospect</option>
              <option value="ACTIF">Actif</option>
              <option value="INACTIF">Inactif</option>
              <option value="SUSPENDU">Suspendu</option>
              <option value="LEAD_CHAUD">Lead chaud</option>
              <option value="LEAD_FROID">Lead froid</option>
            </select>
          </div>

          <div>
            <Label htmlFor="priorite">Priorite</Label>
            <select
              id="priorite"
              {...register('priorite')}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3"
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
        <h3 className="mb-4 text-lg font-semibold">Contact principal</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="contact@entreprise.ci"
              className="mt-1"
            />
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
          </div>

          <div>
            <Label htmlFor="telephone">Telephone fixe</Label>
            <Input
              id="telephone"
              {...register('telephone')}
              placeholder="+225 27 22 00 00 00"
              className="mt-1"
            />
            {errors.telephone && <p className="mt-1 text-sm text-red-500">{errors.telephone.message}</p>}
          </div>

          <div>
            <Label htmlFor="mobile">Mobile</Label>
            <Input
              id="mobile"
              {...register('mobile')}
              placeholder="+225 07 00 00 00 00"
              className="mt-1"
            />
            {errors.mobile && <p className="mt-1 text-sm text-red-500">{errors.mobile.message}</p>}
          </div>

          <div>
            <Label htmlFor="fax">Fax</Label>
            <Input
              id="fax"
              {...register('fax')}
              placeholder="+225 27 21 00 00 00"
              className="mt-1"
            />
            {errors.fax && <p className="mt-1 text-sm text-red-500">{errors.fax.message}</p>}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="siteWeb">Site web</Label>
            <Input
              id="siteWeb"
              {...register('siteWeb')}
              placeholder="https://www.entreprise.ci"
              className="mt-1"
            />
            {errors.siteWeb && <p className="mt-1 text-sm text-red-500">{errors.siteWeb.message}</p>}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Identification</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="idu">IDU</Label>
            <Input
              id="idu"
              {...register('idu')}
              placeholder="CI-2024-1234567A"
              className="mt-1"
            />
            {errors.idu && <p className="mt-1 text-sm text-red-500">{errors.idu.message}</p>}
          </div>

          <div>
            <Label htmlFor="ncc">NCC</Label>
            <Input
              id="ncc"
              {...register('ncc')}
              placeholder="1234567A"
              className="mt-1"
            />
            {errors.ncc && <p className="mt-1 text-sm text-red-500">{errors.ncc.message}</p>}
          </div>

          <div>
            <Label htmlFor="rccm">RCCM</Label>
            <Input
              id="rccm"
              {...register('rccm')}
              placeholder="CI-ABJ-03-2024-B12-34567"
              className="mt-1"
            />
            {errors.rccm && <p className="mt-1 text-sm text-red-500">{errors.rccm.message}</p>}
          </div>

          <div>
            <Label htmlFor="codeActivite">Code activite</Label>
            <Input
              id="codeActivite"
              {...register('codeActivite')}
              placeholder="Commerce general"
              className="mt-1"
            />
            {errors.codeActivite && <p className="mt-1 text-sm text-red-500">{errors.codeActivite.message}</p>}
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
          {isLoading ? 'Enregistrement...' : isEditing ? 'Mettre a jour' : 'Creer'}
        </Button>
      </div>
    </form>
  );
}
