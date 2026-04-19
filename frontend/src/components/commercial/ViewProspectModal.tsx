'use client';

import { Building2, FileBadge2, Globe, Mail, MapPin, Phone, Smartphone, TrendingUp, User, X } from 'lucide-react';
import type { Prospect } from '@/shared/api/commercial';

interface ViewProspectModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospect: Prospect | null;
}

const stageLabelMap: Record<Prospect['stage'], string> = {
  preparation: 'Preparation',
  research: 'Recherche',
  contact: 'Contact initial',
  discovery: 'Decouverte',
  proposal: 'Proposition',
  negotiation: 'Negociation',
  on_hold: 'En attente',
  won: 'Converti',
  lost: 'Perdu',
};

const priorityLabelMap: Record<Prospect['priority'], string> = {
  A: 'Haute',
  B: 'Moyenne',
  C: 'Basse',
  D: 'Tres basse',
};

const formatDate = (value?: string) => {
  if (!value) return 'Non defini';
  return new Date(value).toLocaleDateString('fr-FR');
};

const formatCurrency = (value?: number) => {
  if (value == null) return 'Non defini';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(value);
};

const renderAddress = (prospect: Prospect) => {
  const postalBox = prospect.postalCode
    ? /(^|\b)bp\b/i.test(prospect.postalCode)
      ? prospect.postalCode
      : `BP ${prospect.postalCode}`
    : null;

  return [
    prospect.address,
    prospect.address2,
    prospect.address3,
    prospect.city,
    prospect.region,
    postalBox,
    prospect.country,
  ]
    .filter(Boolean)
    .join(', ');
};

const Row = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div>
    <p className="mb-1 text-xs text-gray-500">{label}</p>
    <p className="text-sm font-medium text-gray-900">{value || 'Non renseigne'}</p>
  </div>
);

export default function ViewProspectModal({ isOpen, onClose, prospect }: ViewProspectModalProps) {
  if (!isOpen || !prospect) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 py-8 text-center">
        <div className="fixed inset-0 bg-gray-500/75" onClick={onClose} />
        <div className="relative inline-block w-full max-w-4xl overflow-hidden rounded-lg bg-white text-left shadow-xl">
          <div className="px-4 pt-5 pb-4 sm:p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Fiche prospect</h3>
                <p className="text-sm text-gray-500">Vue detaillee du prospect et de ses informations locales.</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              <section>
                <h4 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                  <Building2 className="mr-2 h-5 w-5 text-blue-600" />
                  Entreprise
                </h4>
                <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-2">
                  <Row label="Entreprise / raison sociale" value={prospect.companyName} />
                  <Row label="Secteur d'activite" value={prospect.sector} />
                  <Row label="Code activite" value={prospect.codeActivite} />
                  <div>
                    <p className="mb-1 text-xs text-gray-500">Site web</p>
                    {prospect.website ? (
                      <a
                        href={prospect.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm font-medium text-blue-600 hover:underline"
                      >
                        <Globe className="mr-1 h-3 w-3" />
                        {prospect.website}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-gray-900">Non renseigne</p>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h4 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                  <FileBadge2 className="mr-2 h-5 w-5 text-amber-600" />
                  Identifiants
                </h4>
                <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-3">
                  <Row label="IDU" value={prospect.idu} />
                  <Row label="NCC" value={prospect.ncc} />
                  <Row label="RCCM" value={prospect.rccm} />
                </div>
              </section>

              <section>
                <h4 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                  <User className="mr-2 h-5 w-5 text-purple-600" />
                  Contact principal
                </h4>
                <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-2">
                  <Row label="Civilite" value={prospect.civilite} />
                  <Row label="Nom du contact" value={prospect.contactName} />
                  <Row label="Poste" value={prospect.position} />
                  <div>
                    <p className="mb-1 text-xs text-gray-500">Email</p>
                    {prospect.email ? (
                      <a href={`mailto:${prospect.email}`} className="inline-flex items-center text-sm font-medium text-blue-600 hover:underline">
                        <Mail className="mr-1 h-3 w-3" />
                        {prospect.email}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-gray-900">Non renseigne</p>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-gray-500">Email secondaire</p>
                    {prospect.emailSecondaire ? (
                      <a href={`mailto:${prospect.emailSecondaire}`} className="inline-flex items-center text-sm font-medium text-blue-600 hover:underline">
                        <Mail className="mr-1 h-3 w-3" />
                        {prospect.emailSecondaire}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-gray-900">Non renseigne</p>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-gray-500">Telephone fixe</p>
                    {prospect.phone ? (
                      <a href={`tel:${prospect.phone}`} className="inline-flex items-center text-sm font-medium text-blue-600 hover:underline">
                        <Phone className="mr-1 h-3 w-3" />
                        {prospect.phone}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-gray-900">Non renseigne</p>
                    )}
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-gray-500">Mobile</p>
                    {prospect.mobile ? (
                      <a href={`tel:${prospect.mobile}`} className="inline-flex items-center text-sm font-medium text-blue-600 hover:underline">
                        <Smartphone className="mr-1 h-3 w-3" />
                        {prospect.mobile}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-gray-900">Non renseigne</p>
                    )}
                  </div>
                  <Row label="Fax" value={prospect.fax} />
                  <div className="sm:col-span-2">
                    <p className="mb-1 text-xs text-gray-500">LinkedIn</p>
                    {prospect.linkedin ? (
                      <a
                        href={prospect.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm font-medium text-blue-600 hover:underline"
                      >
                        <Globe className="mr-1 h-3 w-3" />
                        {prospect.linkedin}
                      </a>
                    ) : (
                      <p className="text-sm font-medium text-gray-900">Non renseigne</p>
                    )}
                  </div>
                </div>
              </section>

              <section>
                <h4 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                  <MapPin className="mr-2 h-5 w-5 text-green-600" />
                  Adresse
                </h4>
                <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-2">
                  <Row label="Adresse complete" value={renderAddress(prospect)} />
                  <Row label="Coordonnees GPS" value={prospect.gpsCoordinates} />
                  <div className="sm:col-span-2">
                    <p className="mb-1 text-xs text-gray-500">Infos d'acces</p>
                    <p className="text-sm font-medium text-gray-900">{prospect.accessNotes || 'Non renseigne'}</p>
                  </div>
                </div>
              </section>

              <section>
                <h4 className="mb-3 flex items-center text-sm font-semibold text-gray-900">
                  <TrendingUp className="mr-2 h-5 w-5 text-orange-600" />
                  Suivi commercial
                </h4>
                <div className="grid grid-cols-1 gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-2">
                  <Row label="Etape actuelle" value={stageLabelMap[prospect.stage]} />
                  <Row label="Priorite" value={priorityLabelMap[prospect.priority]} />
                  <Row label="Source" value={prospect.source} />
                  <Row
                    label="Probabilite de closing"
                    value={prospect.closingProbability == null ? undefined : `${prospect.closingProbability}%`}
                  />
                  <Row label="Potentiel estime" value={formatCurrency(prospect.potentialValue)} />
                  <Row label="Cree le" value={formatDate(prospect.createdAt)} />
                </div>
              </section>

              {(prospect.tags || []).length > 0 && (
                <section>
                  <h4 className="mb-3 text-sm font-semibold text-gray-900">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {(prospect.tags || []).map((tag) => (
                      <span key={tag} className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800">
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {prospect.notes && (
                <section>
                  <h4 className="mb-3 text-sm font-semibold text-gray-900">Notes</h4>
                  <div className="rounded border-l-4 border-yellow-400 bg-yellow-50 p-4 text-sm text-gray-700">
                    {prospect.notes}
                  </div>
                </section>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
