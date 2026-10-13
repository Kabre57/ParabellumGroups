'use client';

import type { CreateProspectRequest } from '@/shared/api/commercial';

type FormChange = <K extends keyof CreateProspectRequest>(field: K, value: CreateProspectRequest[K]) => void;

interface CreateProspectIdentityFieldsProps {
  formData: CreateProspectRequest;
  onChange: FormChange;
}

export function CreateProspectIdentityFields({ formData, onChange }: CreateProspectIdentityFieldsProps) {
  return (
    <>
                <section>
                  <h4 className="mb-3 text-sm font-semibold text-gray-900">Entreprise</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Entreprise / raison sociale <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.companyName}
                        onChange={(event) => onChange('companyName', event.target.value)}
                        placeholder="Ex: Parabellum Energie CI"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Secteur d'activite</label>
                      <input
                        type="text"
                        value={formData.sector || ''}
                        onChange={(event) => onChange('sector', event.target.value)}
                        placeholder="BTP, distribution, services..."
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Code activite</label>
                      <input
                        type="text"
                        value={formData.codeActivite || ''}
                        onChange={(event) => onChange('codeActivite', event.target.value)}
                        placeholder="Code activite local"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Site web</label>
                      <input
                        type="url"
                        value={formData.website || ''}
                        onChange={(event) => onChange('website', event.target.value)}
                        placeholder="https://..."
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">IDU</label>
                      <input
                        type="text"
                        value={formData.idu || ''}
                        onChange={(event) => onChange('idu', event.target.value)}
                        placeholder="CI-YYYY-XXXXXXXK"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">NCC</label>
                      <input
                        type="text"
                        value={formData.ncc || ''}
                        onChange={(event) => onChange('ncc', event.target.value)}
                        placeholder="Numero de compte contribuable"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">RCCM</label>
                      <input
                        type="text"
                        value={formData.rccm || ''}
                        onChange={(event) => onChange('rccm', event.target.value)}
                        placeholder="Ex: CI-ABJ-03-2026-B12-00001"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h4 className="mb-3 text-sm font-semibold text-gray-900">Contact principal</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Civilite</label>
                      <select
                        value={formData.civilite || ''}
                        onChange={(event) => onChange('civilite', event.target.value)}
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      >
                        <option value="">Selectionner</option>
                        <option value="M.">M.</option>
                        <option value="Mme">Mme</option>
                        <option value="Mlle">Mlle</option>
                        <option value="Dr">Dr</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Nom du contact <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.contactName}
                        onChange={(event) => onChange('contactName', event.target.value)}
                        placeholder="Nom et prenoms"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Poste</label>
                      <input
                        type="text"
                        value={formData.position || ''}
                        onChange={(event) => onChange('position', event.target.value)}
                        placeholder="DG, responsable achats..."
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input
                        type="email"
                        value={formData.email || ''}
                        onChange={(event) => onChange('email', event.target.value)}
                        placeholder="contact@entreprise.ci"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email secondaire</label>
                      <input
                        type="email"
                        value={formData.emailSecondaire || ''}
                        onChange={(event) => onChange('emailSecondaire', event.target.value)}
                        placeholder="contact2@entreprise.ci"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Telephone fixe</label>
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(event) => onChange('phone', event.target.value)}
                        placeholder="+225 27 XX XX XX XX"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Mobile</label>
                      <input
                        type="tel"
                        value={formData.mobile || ''}
                        onChange={(event) => onChange('mobile', event.target.value)}
                        placeholder="+225 07 XX XX XX XX"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fax</label>
                      <input
                        type="text"
                        value={formData.fax || ''}
                        onChange={(event) => onChange('fax', event.target.value)}
                        placeholder="Optionnel"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">LinkedIn</label>
                      <input
                        type="url"
                        value={formData.linkedin || ''}
                        onChange={(event) => onChange('linkedin', event.target.value)}
                        placeholder="https://www.linkedin.com/in/contact"
                        className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </section>
    </>
  );
}
