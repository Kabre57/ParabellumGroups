'use client';

import React from 'react';
import PrintLayout from './PrintLayout';

interface SpecialitePrintProps {
  specialite: any;
  onClose: () => void;
}

export default function SpecialitePrint({ specialite, onClose }: SpecialitePrintProps) {
  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  return (
    <PrintLayout
      title="Fiche Spécialité"
      subtitle={specialite?.nom || 'Spécialité'}
      meta={`Réf: ${specialite?.id?.slice?.(0, 8) || '-'}\nDate: ${formatDate(specialite?.createdAt)}`}
      onClose={onClose}
    >
      <div className="section-title">Détails</div>
      <table className="table-print">
        <tbody>
          <tr>
            <th>Nom</th>
            <td>{specialite?.nom || '-'}</td>
          </tr>
          <tr>
            <th>Description</th>
            <td>{specialite?.description || '-'}</td>
          </tr>
          <tr>
            <th>Créée le</th>
            <td>{formatDate(specialite?.createdAt)}</td>
          </tr>
          <tr>
            <th>Mise à jour</th>
            <td>{formatDate(specialite?.updatedAt)}</td>
          </tr>
        </tbody>
      </table>
    </PrintLayout>
  );
}
