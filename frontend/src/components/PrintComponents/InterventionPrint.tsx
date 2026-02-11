'use client';

import React from 'react';
import PrintLayout from './PrintLayout';

interface InterventionPrintProps {
  intervention: any;
  onClose: () => void;
}

export default function InterventionPrint({ intervention, onClose }: InterventionPrintProps) {
  const mission = intervention?.mission;
  const techniciens = Array.isArray(intervention?.techniciens) ? intervention.techniciens : [];
  const materiel = Array.isArray(intervention?.materielUtilise) ? intervention.materielUtilise : [];

  const formatDateTime = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <PrintLayout
      title="Fiche d'Intervention"
      subtitle={intervention?.titre || 'Intervention'}
      meta={`Ref: ${intervention?.id?.slice?.(0, 8) || 'N/A'}\nDate: ${formatDateTime(intervention?.dateDebut)}`}
      onClose={onClose}
    >
      <div className="section-title">Informations de l'Intervention</div>
      <table className="table-print">
        <tbody>
          <tr>
            <th>Titre</th>
            <td>{intervention?.titre || '-'}</td>
            <th>Statut</th>
            <td>{intervention?.status || '-'}</td>
          </tr>
          <tr>
            <th>Date début</th>
            <td>{formatDateTime(intervention?.dateDebut)}</td>
            <th>Date fin</th>
            <td>{formatDateTime(intervention?.dateFin)}</td>
          </tr>
          <tr>
            <th>Description</th>
            <td colSpan={3}>{intervention?.description || '-'}</td>
          </tr>
          <tr>
            <th>Résultats</th>
            <td colSpan={3}>{intervention?.resultats || '-'}</td>
          </tr>
          <tr>
            <th>Observations</th>
            <td colSpan={3}>{intervention?.observations || '-'}</td>
          </tr>
        </tbody>
      </table>

      <div className="section-title">Mission associée</div>
      <table className="table-print">
        <tbody>
          <tr>
            <th>N° Mission</th>
            <td>{mission?.numeroMission || '-'}</td>
            <th>Titre</th>
            <td>{mission?.titre || '-'}</td>
          </tr>
          <tr>
            <th>Client</th>
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

      <div className="section-title">Techniciens</div>
      <table className="table-print">
        <thead>
          <tr>
            <th>Nom</th>
            <th>Email</th>
            <th>Rôle</th>
          </tr>
        </thead>
        <tbody>
          {techniciens.length > 0 ? (
            techniciens.map((item: any, idx: number) => (
              <tr key={idx}>
                <td>{item?.technicien ? `${item.technicien.prenom || ''} ${item.technicien.nom || ''}`.trim() : '-'}</td>
                <td>{item?.technicien?.email || '-'}</td>
                <td>{item?.role || '-'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="text-center text-muted">Aucun technicien assigné</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="section-title">Matériel utilisé</div>
      <table className="table-print">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Désignation</th>
            <th>Quantité</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {materiel.length > 0 ? (
            materiel.map((item: any, idx: number) => (
              <tr key={idx}>
                <td>{item?.materiel?.reference || '-'}</td>
                <td>{item?.materiel?.nom || '-'}</td>
                <td className="text-center">{item?.quantite ?? '-'}</td>
                <td>{item?.notes || '-'}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} className="text-center text-muted">Aucun matériel enregistré</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="section-title">Observations</div>
      <table className="table-print">
        <tbody>
          <tr>
            <th>Observations</th>
            <td>{intervention?.observations || '-'}</td>
          </tr>
          <tr>
            <th>Résultats</th>
            <td>{intervention?.resultats || '-'}</td>
          </tr>
        </tbody>
      </table>

      <div className="section-title">Signatures</div>
      <table className="table-print">
        <thead>
          <tr>
            <th>Technicien</th>
            <th>Responsable Technique</th>
            <th>Client (si sur site)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ height: 60 }} className="text-center">Signature</td>
            <td style={{ height: 60 }} className="text-center">Signature</td>
            <td style={{ height: 60 }} className="text-center">Signature</td>
          </tr>
        </tbody>
      </table>
    </PrintLayout>
  );
}
