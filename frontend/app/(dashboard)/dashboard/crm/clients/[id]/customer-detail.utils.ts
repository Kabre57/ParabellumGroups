/**
 * Valeurs de formulaire et petits traitements partag?s par les vues de la fiche client.
 */
import type { Address } from '@/shared/api/crm';

export const CONTACT_TYPES = ['COMMERCIAL', 'TECHNIQUE', 'COMPTABLE', 'DIRECTION', 'SUPPORT', 'AUTRE'];
export const CONTACT_STATUSES = ['ACTIF', 'INACTIF', 'PARTI'];
export const ADDRESS_TYPES = ['FACTURATION', 'LIVRAISON', 'SIEGE_SOCIAL', 'ETABLISSEMENT', 'CORRESPONDANCE'];
export const INTERACTION_TYPES = ['APPEL', 'EMAIL', 'REUNION', 'VISITE', 'SUPPORT', 'COMMERCIAL', 'TECHNIQUE'];
export const INTERACTION_CHANNELS = ['TELEPHONE', 'EMAIL', 'EN_PERSONNE', 'VIDEO', 'CHAT', 'PORTAL_CLIENT', 'MOBILE'];
export const INTERACTION_RESULTS = ['POSITIF', 'NEUTRE', 'NEGATIF', 'A_SUIVRE', 'A_RELANCER', 'TERMINE'];

export const formatAddress = (address: Address) =>
  [
    address.nomAdresse,
    address.ligne1,
    address.ligne2,
    address.ligne3,
    address.codePostal,
    address.ville,
    address.region,
    address.pays,
  ]
    .filter(Boolean)
    .join(', ');

export const compactPayload = <T extends Record<string, any>>(payload: T): T =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ) as T;
