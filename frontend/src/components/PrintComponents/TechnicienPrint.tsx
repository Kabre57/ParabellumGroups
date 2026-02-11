'use client';

import React from 'react';
import PrintLayout from './PrintLayout';

interface TechnicienPrintProps {
  technicien: any;
  onClose: () => void;
}

export default function TechnicienPrint({ technicien, onClose }: TechnicienPrintProps) {
  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR');
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(amount);
  };

  return (
    <PrintLayout
      title="Fiche Technicien"
      subtitle={`${technicien?.prenom || ''} ${technicien?.nom || ''}`.trim() || 'Technicien'}
      meta={`Matricule: ${technicien?.matricule || '-'}\nDate: ${formatDate(technicien?.dateEmbauche)}`}
      onClose={onClose}
    >
      <div className="section-title">Informations personnelles</div>
      <table className="table-print">
        <tbody>
          <tr>
            <th>Nom</th>
            <td>{technicien?.nom || '-'}</td>
            <th>Prénom</th>
            <td>{technicien?.prenom || '-'}</td>
          </tr>
          <tr>
            <th>Email</th>
            <td>{technicien?.email || '-'}</td>
            <th>Téléphone</th>
            <td>{technicien?.telephone || '-'}</td>
          </tr>
          <tr>
            <th>Spécialité</th>
            <td>{technicien?.specialite?.nom || '-'}</td>
            <th>Statut</th>
            <td>{technicien?.status || '-'}</td>
          </tr>
          <tr>
            <th>Date d'embauche</th>
            <td>{formatDate(technicien?.dateEmbauche)}</td>
            <th>Taux horaire</th>
            <td>{formatCurrency(technicien?.tauxHoraire)}</td>
          </tr>
        </tbody>
      </table>

      <div className="section-title">Compétences</div>
      <div className="text-muted">
        {Array.isArray(technicien?.competences) && technicien.competences.length > 0
          ? technicien.competences.join(', ')
          : 'Aucune compétence renseignée'}
      </div>

      <div className="section-title">Certifications</div>
      <div className="text-muted">
        {Array.isArray(technicien?.certifications) && technicien.certifications.length > 0
          ? technicien.certifications.join(', ')
          : 'Aucune certification renseignée'}
      </div>

      <div className="section-title">Notes</div>
      <div className="text-muted">{technicien?.notes || '-'}</div>
    </PrintLayout>
  );
}
