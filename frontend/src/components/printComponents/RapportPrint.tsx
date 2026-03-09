'use client';

import React from 'react';
import PrintLayout from './PrintLayout';

interface RapportPrintProps {
  rapport: any;
  onClose: () => void;
}

export default function RapportPrint({ rapport, onClose }: RapportPrintProps) {
  const intervention = rapport?.intervention;
  const mission = intervention?.mission;
  const redacteur = rapport?.redacteur;
  const materielUtilise = Array.isArray(intervention?.materielUtilise) ? intervention.materielUtilise : [];

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <PrintLayout
      title="Rapport d'Intervention"
      subtitle={intervention?.titre || rapport?.titre || 'Rapport'}
      meta={`Réf: ${rapport?.id?.slice?.(0, 8) || 'N/A'}\nDate: ${formatDate(rapport?.dateCreation)}`}
      onClose={onClose}
    >
      <div className="section-title">Informations Générales</div>
      <table className="table-print">
        <thead>
          <tr>
            <th>Réf. Fiche</th>
            <th>Date</th>
            <th>Heure de départ</th>
            <th>Heure de retour</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{rapport?.id?.slice?.(0, 8)?.toUpperCase?.() || '-'}</td>
            <td>{formatDate(intervention?.dateDebut)}</td>
            <td>{formatTime(intervention?.dateDebut)}</td>
            <td>{intervention?.dateFin ? formatTime(intervention?.dateFin) : 'En cours'}</td>
          </tr>
        </tbody>
      </table>

      <div className="section-title">Informations du Technicien</div>
      <table className="table-print">
        <thead>
          <tr>
            <th>Nom et Prénoms</th>
            <th>Compétences Techniques</th>
            <th>Contact</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              {redacteur ? `${redacteur.prenom || ''} ${redacteur.nom || ''}`.trim() : 'Non spécifié'}
              {redacteur?.matricule && (
                <span className="block text-muted">Matricule: {redacteur.matricule}</span>
              )}
            </td>
            <td>
              {Array.isArray(redacteur?.competences) && redacteur.competences.length > 0
                ? redacteur.competences.join(', ')
                : 'Non spécifié'}
              {redacteur?.specialite?.nom && (
                <span className="block text-muted">Spécialité: {redacteur.specialite.nom}</span>
              )}
            </td>
            <td>
              {redacteur?.telephone && <div>Tél: {redacteur.telephone}</div>}
              {redacteur?.email && <div>Email: {redacteur.email}</div>}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="section-title">Informations de l'Intervention</div>
      <table className="table-print">
        <thead>
          <tr>
            <th>Client</th>
            <th>Adresse</th>
            <th>Contact sur site</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{mission?.clientNom || 'Non spécifié'}</td>
            <td>{mission?.adresse || 'Non spécifié'}</td>
            <td>{mission?.clientContact || 'Non spécifié'}</td>
          </tr>
        </tbody>
      </table>

      <div className="section-title">Détails de la Mission</div>
      <table className="table-print">
        <thead>
          <tr>
            <th>N° Mission</th>
            <th>Titre</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{mission?.numeroMission || '-'}</td>
            <td>{mission?.titre || '-'}</td>
            <td>{mission?.status || '-'}</td>
          </tr>
        </tbody>
      </table>

      <div className="section-title">Matériel / Outillage emporté</div>
      <table className="table-print">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Désignation</th>
            <th>Quantité</th>
            <th>Observations</th>
          </tr>
        </thead>
        <tbody>
          {materielUtilise.length > 0 ? (
            materielUtilise.map((item: any, index: number) => (
              <tr key={index}>
                <td>{item?.materiel?.reference || 'N/A'}</td>
                <td>{item?.materiel?.nom || 'Non spécifié'}</td>
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

      <div className="section-title">Observations / Commentaires du Technicien</div>
      <table className="table-print">
        <tbody>
          <tr>
            <th>Travaux effectués</th>
            <td>{rapport?.contenu || 'Non renseigné'}</td>
          </tr>
          <tr>
            <th>Résultats / Conclusions</th>
            <td>{rapport?.conclusions || '-'}</td>
          </tr>
          <tr>
            <th>Recommandations</th>
            <td>{rapport?.recommandations || '-'}</td>
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
            <td className="text-center" style={{ height: 60 }}>
              {redacteur ? `${redacteur.prenom || ''} ${redacteur.nom || ''}`.trim() : 'Signature'}
            </td>
            <td className="text-center" style={{ height: 60 }}>Signature</td>
            <td className="text-center" style={{ height: 60 }}>Signature</td>
          </tr>
        </tbody>
      </table>
    </PrintLayout>
  );
}
