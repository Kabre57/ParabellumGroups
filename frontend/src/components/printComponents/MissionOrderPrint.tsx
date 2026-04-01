'use client';

import React from 'react';
import PrintLayout from './PrintLayout';

interface MissionOrderPrintProps {
  mission: any;
  technicien: any;
  missionOrder?: any;
  interventionTitle?: string;
  onClose: () => void;
}

const formatDate = (date?: string) => {
  if (!date) return '........../........../............';
  return new Date(date).toLocaleDateString('fr-FR');
};

const formatPrintDate = () => new Date().toLocaleDateString('fr-FR');

const getTechnicienName = (technicien: any) =>
  [technicien?.prenom, technicien?.nom].filter(Boolean).join(' ').trim() || technicien?.nom || 'TECHNICIEN À AFFECTER';

const getTechnicienRole = (technicien: any) =>
  technicien?.specialite?.nom || technicien?.poste || 'TECHNICIEN D’INTERVENTION';

const getDestination = (adresse?: string) => {
  if (!adresse) return 'DESTINATION À PRÉCISER';
  return adresse.toUpperCase();
};

const lineStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '220px 18px 1fr',
  gap: '8px',
  alignItems: 'baseline',
  marginBottom: '10px',
  fontSize: '14px',
};

const valueStyle: React.CSSProperties = {
  borderBottom: '1px dotted #222',
  minHeight: '20px',
  paddingBottom: '2px',
  fontWeight: 500,
};

export default function MissionOrderPrint({
  mission,
  technicien,
  missionOrder,
  interventionTitle,
  onClose,
}: MissionOrderPrintProps) {
  const technicianName = getTechnicienName(technicien);
  const technicianRole = getTechnicienRole(technicien);
  const missionNumber = missionOrder?.numeroOrdre || mission?.numeroMission || 'MISSION';
  const destination = getDestination(missionOrder?.destination || mission?.adresse);
  const missionTitle = `MISSION À ${destination}`;
  const vehiculeLabel = missionOrder?.vehiculeLabel || missionOrder?.vehiculeType || mission?.notes || 'VEHICULE DE SERVICE';
  const orderObject = missionOrder?.objetMission || mission?.description || mission?.titre || 'MISSION TECHNIQUE';
  const dateDepart = missionOrder?.dateDepart || mission?.dateDebut;
  const dateRetour = missionOrder?.dateRetour || mission?.dateFin;
  const pieceIdentite = missionOrder?.pieceIdentite || technicien?.matricule || technicien?.employeeNumber || 'NON RENSEIGNÉ';
  const fonction = missionOrder?.fonction || technicianRole;
  const qualite = missionOrder?.qualite || interventionTitle || 'TECHNICIEN D’INTERVENTION';

  return (
    <PrintLayout
      title="Ordre de mission"
      subtitle={`Ordre nominatif - ${technicianName}`}
      meta=""
      onClose={onClose}
      showFooter={false}
    >
      <div style={{ paddingTop: 8, minHeight: '244mm', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18, fontSize: 14 }}>
          <div style={{ fontStyle: 'italic' }}>Ordre de mission N° {missionNumber}</div>
          <div>Abidjan, le {formatPrintDate()}</div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              display: 'inline-block',
              border: '2px solid #111',
              padding: '10px 28px',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 1,
              marginBottom: 14,
            }}
          >
            ORDRE DE MISSION
          </div>
          <div style={{ fontSize: 20, fontWeight: 500, textTransform: 'uppercase', marginBottom: 10 }}>
            {missionTitle}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, textTransform: 'uppercase' }}>
            LE DIRECTEUR GENERAL DE LA SOCIETE PROGITECK SARL
          </div>
        </div>

        <div style={{ marginTop: 26 }}>
          <div style={lineStyle}>
            <strong>Donne ordre à</strong>
            <span>:</span>
            <span style={valueStyle}>{technicianName.toUpperCase()}</span>
          </div>
          <div style={lineStyle}>
            <strong>Pièce d&apos;identité</strong>
            <span>:</span>
            <span style={valueStyle}>{pieceIdentite}</span>
          </div>
          <div style={lineStyle}>
            <strong>Fonction</strong>
            <span>:</span>
            <span style={valueStyle}>{fonction.toUpperCase()}</span>
          </div>
          <div style={lineStyle}>
            <strong>En Qualité de</strong>
            <span>:</span>
            <span style={valueStyle}>{qualite.toUpperCase()}</span>
          </div>
          <div style={lineStyle}>
            <strong style={{ whiteSpace: 'nowrap' }}>De se rendre en mission à</strong>
            <span>:</span>
            <span style={valueStyle}>{destination}</span>
          </div>
          <div style={lineStyle}>
            <strong>Objet de la mission</strong>
            <span>:</span>
            <span style={valueStyle}>{orderObject}</span>
          </div>
          <div style={lineStyle}>
            <strong>Moyen de transport</strong>
            <span>:</span>
            <span style={valueStyle}>{vehiculeLabel.toUpperCase()}</span>
          </div>
          <div style={lineStyle}>
            <strong>Date de départ</strong>
            <span>:</span>
            <span style={valueStyle}>{formatDate(dateDepart)}</span>
          </div>
          <div style={lineStyle}>
            <strong>Date de retour</strong>
            <span>:</span>
            <span style={valueStyle}>{formatDate(dateRetour)}</span>
          </div>
        </div>

        <p style={{ marginTop: 24, fontSize: 13 }}>
          En foi de quoi, nous lui délivrons cet ordre de mission, pour servir et valoir ce que de droit.
        </p>

        <div style={{ marginTop: 'auto', paddingTop: 56, textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 52 }}>LE DIRECTEUR</div>
          <div style={{ fontSize: 14, fontStyle: 'italic' }}>Signature et cachet</div>
        </div>
      </div>
    </PrintLayout>
  );
}
