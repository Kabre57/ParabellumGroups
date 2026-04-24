'use client';

import React, { useState } from 'react';

interface CreateRoleWithTemplateFormProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

const TEMPLATES_DISPONIBLES = [
  { value: 'ADMIN', label: 'Administrateur (Accès complet)' },
  { value: 'EMPLOYEE', label: 'Employé standard' },
  { value: 'SERVICE_MANAGER', label: 'Responsable de service' },
  { value: 'GENERAL_DIRECTOR', label: 'Directeur général' },
  { value: '', label: 'Sans template (Attribution manuelle)' },
];

export const FormulaireCreationRoleAvecTemplate: React.FC<CreateRoleWithTemplateFormProps> = ({
  onSuccess,
  onError,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    template: 'EMPLOYEE',
    isActive: true,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const target = e.target;
    const { name } = target;

    if ('checked' in target && target.type === 'checkbox') {
      setFormData((prev) => ({
        ...prev,
        [name]: target.checked,
      }));
    } else if ('value' in target) {
      setFormData((prev) => ({
        ...prev,
        [name]: target.value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);

    if (!formData.name.trim() || !formData.code.trim()) {
      onError?.('Le nom et le code du rôle sont requis');
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Échec de la création du rôle');
      }

      setSuccess(true);
      setFormData({
        name: '',
        code: '',
        description: '',
        template: 'EMPLOYEE',
        isActive: true,
      });

      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Échec de la création du rôle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Créer un nouveau rôle</h2>

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          ✓ Rôle créé avec succès ! Le template a été appliqué.
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Nom du rôle */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Nom du rôle *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="ex: Gestionnaire de contenu"
            required
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Code du rôle */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Code du rôle *
          </label>
          <input
            type="text"
            name="code"
            value={formData.code}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                code: e.target.value.toUpperCase().replace(/[^A-Z_]/g, ''),
              }))
            }
            placeholder="ex: GESTIONNAIRE_CONTENU"
            pattern="^[A-Z_]+$"
            required
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Lettres majuscules et underscores uniquement</p>
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Décrivez l'objectif de ce rôle..."
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Sélection du template */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          Template de permissions
        </label>
        <p className="text-sm text-gray-600 mb-4">
          Sélectionnez un template pour attribuer automatiquement un ensemble prédéfini de permissions
        </p>

        <div className="space-y-2">
          {TEMPLATES_DISPONIBLES.map((tmpl) => (
            <label key={tmpl.value} className="flex items-center space-x-3 cursor-pointer p-3 rounded hover:bg-blue-100 transition">
              <input
                type="radio"
                name="template"
                value={tmpl.value}
                checked={formData.template === tmpl.value}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 rounded-full focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 font-medium">{tmpl.label}</span>
            </label>
          ))}
        </div>

        <div className="mt-4 p-3 bg-white rounded border border-blue-200 text-xs text-gray-600">
          <strong>Note :</strong> Les templates configurent automatiquement les permissions en fonction du
          type de rôle sélectionné. Vous pourrez ajuster manuellement les permissions plus tard via
          l'interface de gestion des permissions.
        </div>
      </div>

      {/* Statut actif */}
      <div className="mb-6">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            name="isActive"
            checked={formData.isActive}
            onChange={handleChange}
            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 font-medium">Activer le rôle immédiatement</span>
        </label>
      </div>

      {/* Bouton de soumission */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded transition"
        >
          {loading ? 'Création...' : `Créer le rôle ${formData.template ? `(Template ${formData.template})` : ''}`}
        </button>
      </div>
    </form>
  );
};

export const CreateRoleWithTemplateForm = FormulaireCreationRoleAvecTemplate;
