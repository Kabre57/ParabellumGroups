'use client';

import React from 'react';
import PrintLayout from './PrintLayout';

interface MissionPrintProps {
  mission: any;
  onClose: () => void;
}

export default function MissionPrint({ mission, onClose }: MissionPrintProps) {
  const techniciens = Array.isArray(mission?.techniciens) ? mission.techniciens : [];
  const interventions = Array.isArray(mission?.interventions) ? mission.interventions : [];

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
      title="Fiche de Mission"
      subtitle={mission?.titre || 'Mission'}
      meta={`N° Mission: ${mission?.numeroMission || '-'}\nDate: ${formatDate(mission?.dateDebut)}`}
      onClose={onClose}
    >
      <div className="section-title">Informations générales</div>
      <table className="table-print">
        <tbody>
          <tr>
            <th>Titre</th>
            <td>{mission?.titre || '-'}</td>
            <th>Statut</th>
            <td>{mission?.status || '-'}</td>
          </tr>
          <tr>
            <th>Priorité</th>
            <td>{mission?.priorite || '-'}</td>
            <th>Budget estimé</th>
            <td>{formatCurrency(mission?.budgetEstime)}</td>
          </tr>
          <tr>
            <th>Date début</th>
            <td>{formatDate(mission?.dateDebut)}</td>
            <th>Date fin</th>
            <td>{formatDate(mission?.dateFin)}</td>
          </tr>
          <tr>
            <th>Description</th>
            <td colSpan={3}>{mission?.description || '-'}</td>
          </tr>
          <tr>
            <th>Notes</th>
            <td colSpan={3}>{mission?.notes || '-'}</td>
          </tr>
        </tbody>
      </table>

      <div className="section-title">Client</div>
      <table className="table-print">
        <tbody>
          <tr>
            <th>Nom</th>
            <td>{mission?.clientNom || '-'}</td>
            <th>Contact</th>
            <td>{mission?.clientContact || '-'}</td>
          </tr>
          <tr>
            <th>Adresse</th>
            <td colSpan={3}>{mission?.adresse || '-'}</td>
          </tr>
        </tbody>
      </table>

      <div className="section-title">Techniciens assignés</div>
      <table className="table-print">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Email</th>
            <th>Spécialité</th>
          </tr>
        </thead>
        <tbody>
          {techniciens.length > 0 ? (
            techniciens.map((item: any, idx: number) => (
              <tr key={idx}>
                <td>{item?.technicien ? `${item.technicien.prenom || ''} ${item.technicien.nom || ''}`.trim() : '-'}</td>
                <td>{item?.technicien?.email || '-'}</td>
                <td>{item?.technicien?.specialite?.nom || '-'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="text-center text-muted">Aucun technicien assigné</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="section-title">Interventions</div>
      <table className="table-print">
        <thead>
          <tr>
            <th>Titre</th>
            <th>Date début</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          {interventions.length > 0 ? (
            interventions.map((item: any, idx: number) => (
              <tr key={idx}>
                <td>{item?.titre || '-'}</td>
                <td>{formatDate(item?.dateDebut)}</td>
                <td>{item?.status || '-'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="text-center text-muted">Aucune intervention</td>
            </tr>
          )}
        </tbody>
      </table>
    </PrintLayout>
  );
}
