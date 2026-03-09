'use client';

import React, { useEffect, useState } from 'react';
import { CreatePermissionChangeRequest } from '@/types/permissionWorkflow';
import { permissionRequestService } from '@/services/permissionRequestService';

interface Role {
  id: number;
  name: string;
  code: string;
}

interface Permission {
  id: number;
  name: string;
  description?: string;
  category: string;
}

interface FormulaireDemandePermissionProps {
  roles?: Role[];
  permissions?: Permission[];
  onSuccess?: () => void;
}

export const FormulaireDemandePermission: React.FC<FormulaireDemandePermissionProps> = ({
  roles = [],
  permissions = [],
  onSuccess,
}) => {
  const [formData, setFormData] = useState<CreatePermissionChangeRequest>({
    roleId: 0,
    permissionId: 0,
    canView: false,
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canApprove: false,
    reason: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'roleId' || name === 'permissionId' ? parseInt(value, 10) : value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (formData.roleId === 0 || formData.permissionId === 0) {
      setError('Veuillez sélectionner à la fois un rôle et une permission');
      return;
    }

    try {
      setLoading(true);
      await permissionRequestService.createRequest(formData);
      setSuccess(true);
      setFormData({
        roleId: 0,
        permissionId: 0,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canApprove: false,
        reason: '',
      });

      if (onSuccess) {
        setTimeout(() => onSuccess(), 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la création de la demande');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md max-w-2xl">
      <h2 className="text-2xl font-bold mb-6">Demander une modification de permission</h2>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>}
      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          Demande créée avec succès et envoyée pour approbation !
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Sélection du rôle */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Rôle *</label>
          <select
            name="roleId"
            value={formData.roleId}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>-- Sélectionnez un rôle --</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name} ({role.code})
              </option>
            ))}
          </select>
        </div>

        {/* Sélection de la permission */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Permission *</label>
          <select
            name="permissionId"
            value={formData.permissionId}
            onChange={handleChange}
            required
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={0}>-- Sélectionnez une permission --</option>
            {permissions.map((perm) => (
              <option key={perm.id} value={perm.id}>
                {perm.name} ({perm.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cases à cocher des permissions */}
      <div className="bg-gray-50 p-4 rounded mb-6">
        <p className="font-semibold mb-4">Accorder ces permissions :</p>
        <div className="grid grid-cols-3 gap-4">
          {(['canView', 'canCreate', 'canEdit', 'canDelete', 'canApprove'] as const).map((perm) => (
            <label key={perm} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                name={perm}
                checked={formData[perm] || false}
                onChange={handleCheckboxChange}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                {perm === 'canView' ? 'Voir' :
                 perm === 'canCreate' ? 'Créer' :
                 perm === 'canEdit' ? 'Modifier' :
                 perm === 'canDelete' ? 'Supprimer' :
                 perm === 'canApprove' ? 'Approuver' : perm}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Raison */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Raison (optionnelle)</label>
        <textarea
          name="reason"
          value={formData.reason || ''}
          onChange={handleChange}
          placeholder="Expliquez pourquoi cette modification de permission est nécessaire..."
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Bouton de soumission */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded transition"
      >
        {loading ? 'Envoi en cours...' : 'Soumettre pour approbation'}
      </button>
    </form>
  );
};

export const CreatePermissionRequestForm = FormulaireDemandePermission;
