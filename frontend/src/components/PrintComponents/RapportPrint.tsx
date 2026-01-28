import React, { useEffect } from "react";

interface RapportPrintProps {
  rapport: any;
  onClose: () => void;
}

export default function RapportPrint({ rapport, onClose }: RapportPrintProps) {
  useEffect(() => {
    // Styles CSS pour l'impression
    const style = document.createElement("style");
    style.innerHTML = `
      @media print {
        /* Cacher tout sauf le contenu d'impression */
        body * {
          visibility: hidden;
        }
        .print-container, .print-container * {
          visibility: visible;
        }
        .print-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          max-width: 100%;
          margin: 0;
          padding: 0;
        }
        /* Désactiver le header/footer du navigateur */
        @page {
          margin: 0;
          size: A4 portrait;
        }
        /* Supprimer les marges par défaut */
        body {
          margin: 0;
          padding: 0;
        }
      }
    `;
    document.head.appendChild(style);

    const timer = setTimeout(() => {
      window.print();

      // Restaurer après l'impression
      setTimeout(() => {
        document.head.removeChild(style);
        onClose();
      }, 100);
    }, 500);

    return () => {
      clearTimeout(timer);
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, [onClose]);

  const formatDate = (date?: string) => {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (date?: string) => {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Données extraites selon le schéma de base de données
  const intervention = rapport.intervention;
  const redacteur = rapport.redacteur;
  const mission = intervention?.mission;

  // Matériel utilisé (à remplir depuis sorties_materiel si disponible)
  const materielUtilise = intervention?.materielUtilise || [];

  return (
    <div className="print-container" style={{ display: "none" }}>
      <style jsx global>{`
        .print-container {
          font-family: "Arial", sans-serif;
          color: #000000;
          line-height: 1.1;
          page-break-inside: avoid;
          page-break-after: always;
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          margin: 0 auto;
          background: white;
          box-sizing: border-box;
        }

        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          .print-container {
            display: block !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 15mm !important;
          }
        }

        .table-print {
          width: 100%;
          border-collapse: collapse;
          margin: 8px 0;
          page-break-inside: avoid;
        }
        .table-print th,
        .table-print td {
          border: 1px solid #000;
          padding: 6px 8px;
          font-size: 11px;
          text-align: left;
          vertical-align: top;
        }
        .table-print th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        .table-cell-25 {
          width: 25%;
        }
        .table-cell-15 {
          width: 15%;
        }
        .table-cell-35 {
          width: 35%;
        }
        .table-cell-33 {
          width: 33%;
        }
        .table-cell-34 {
          width: 34%;
        }
        .section-title {
          font-size: 14px;
          font-weight: bold;
          margin: 16px 0 8px 0;
          padding-bottom: 4px;
          border-bottom: 2px solid #000;
          text-transform: uppercase;
          page-break-after: avoid;
        }
        .underline {
          text-decoration: underline;
          font-weight: bold;
          margin-bottom: 8px;
          display: block;
        }
        .signature-box {
          height: 80px;
          border-bottom: 1px solid #000;
          margin-top: 60px;
          position: relative;
        }
        .signature-label {
          position: absolute;
          bottom: -25px;
          font-size: 10px;
          text-align: center;
          width: 100%;
        }
        .text-center {
          text-align: center;
        }
        .text-right {
          text-align: right;
        }
        .text-xs {
          font-size: 10px;
        }
        .font-bold {
          font-weight: bold;
        }
        .whitespace-pre-wrap {
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .italic {
          font-style: italic;
        }
        .border-black {
          border: 1px solid #000;
        }
        .mb-2 {
          margin-bottom: 0.5rem;
        }
        .mb-4 {
          margin-bottom: 1rem;
        }
        .mb-8 {
          margin-bottom: 2rem;
        }
        .mt-1 {
          margin-top: 0.25rem;
        }
        .mt-8 {
          margin-top: 2rem;
        }
        .pt-2 {
          padding-top: 0.5rem;
        }
        .p-3 {
          padding: 0.75rem;
        }
        .p-4 {
          padding: 1rem;
        }
        .min-h-40 {
          min-height: 40px;
        }
        .min-h-150 {
          min-height: 150px;
        }
        .flex {
          display: flex;
        }
        .items-center {
          align-items: center;
        }
        .justify-between {
          justify-content: space-between;
        }
        .mr-4 {
          margin-right: 1rem;
        }
        .w-16 {
          width: 64px;
        }
        .h-16 {
          height: 64px;
        }
        .bg-gradient-to-br {
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
        }
        .rounded-lg {
          border-radius: 0.5rem;
        }
        .border-gray-300 {
          border-color: #d1d5db;
        }
        .border-t {
          border-top: 1px solid #d1d5db;
        }
        .text-gray-600 {
          color: #4b5563;
        }
      `}</style>

      <div>
        {/* En-tête avec logo et informations */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
              {/* Logo Parabellum */}
              <div className="mr-4">
                <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-green-600">
                  <img
                    src="/parabellum.jpg"
                    alt="Parabellum Logo"
                    className="h-16 mb-4"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-1">PARABELLUM GROUP</h1>
                <p className="text-sm">
                  Service Technique - Division Interventions
                </p>
                <p className="text-sm">ERP Parabellum - Fiche Technique</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm border-black px-3 py-1 inline-block">
                <p className="font-bold">
                  Réf. Fiche: {rapport.id.slice(0, 8).toUpperCase()}
                </p>
                <p>Date: {formatDate(rapport.dateCreation)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tableau Informations Générales */}
        <div className="mb-8">
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
                <td>{rapport.id.slice(0, 8).toUpperCase()}</td>
                <td>{formatDate(intervention?.dateDebut)}</td>
                <td>{formatTime(intervention?.dateDebut)}</td>
                <td>
                  {intervention?.dateFin
                    ? formatTime(intervention.dateFin)
                    : "En cours"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tableau Informations du Technicien */}
        <div className="mb-8">
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
                  {redacteur
                    ? `${redacteur.prenom} ${redacteur.nom}`
                    : "Non spécifié"}
                  {redacteur?.matricule && <br />}
                  {redacteur?.matricule && (
                    <span className="text-xs">
                      Matricule: {redacteur.matricule}
                    </span>
                  )}
                </td>
                <td>
                  {redacteur?.competences?.join(", ") || "Non spécifié"}
                  {redacteur?.specialite && <br />}
                  {redacteur?.specialite && (
                    <span className="text-xs">
                      Spécialité: {redacteur.specialite.nom}
                    </span>
                  )}
                </td>
                <td>
                  {redacteur?.telephone && (
                    <div>Tél: {redacteur.telephone}</div>
                  )}
                  {redacteur?.email && <div>Email: {redacteur.email}</div>}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tableau Informations de l'Intervention */}
        <div className="mb-8">
          <div className="section-title">
            Informations de l&apos;Intervention
          </div>
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
                <td>{mission?.clientNom || "Non spécifié"}</td>
                <td>{mission?.adresse || "Non spécifié"}</td>
                <td>{mission?.clientContact || "Non spécifié"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Détails de la Mission */}
        <div className="mb-8">
          <div className="section-title">Détails de la Mission</div>

          <div className="mb-4">
            <p className="underline">Nature de l&apos;intervention</p>
            <table className="table-print">
              <thead>
                <tr>
                  <th className="table-cell-25">Installation</th>
                  <th className="table-cell-25">Inspection</th>
                  <th className="table-cell-25">Dépannage</th>
                  <th className="table-cell-25">Visite Technique</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-center">
                    {intervention?.description
                      ?.toLowerCase()
                      .includes("installation")
                      ? "✓"
                      : ""}
                  </td>
                  <td className="text-center">
                    {intervention?.description
                      ?.toLowerCase()
                      .includes("inspection")
                      ? "✓"
                      : ""}
                  </td>
                  <td className="text-center">
                    {intervention?.description
                      ?.toLowerCase()
                      .includes("dépannage") ||
                    intervention?.description
                      ?.toLowerCase()
                      .includes("depannage")
                      ? "✓"
                      : ""}
                  </td>
                  <td className="text-center">
                    {intervention?.description?.toLowerCase().includes("visite")
                      ? "✓"
                      : ""}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mb-4">
            <p className="underline">Équipements concernés</p>
            <div className="border-black p-3 min-h-40 text-sm">
              {mission?.description ||
                intervention?.description ||
                "Non spécifié"}
            </div>
          </div>

          {/* Tableau Matériel / Outillage emporté */}
          <div>
            <p className="underline">Matériel / Outillage emporté</p>
            <table className="table-print">
              <thead>
                <tr>
                  <th className="table-cell-15">Référence</th>
                  <th className="table-cell-35">Désignation</th>
                  <th className="table-cell-15">Quantité</th>
                  <th className="table-cell-35">Observations</th>
                </tr>
              </thead>
              <tbody>
                {materielUtilise.length > 0 ? (
                  materielUtilise.map((item: any, index: number) => (
                    <tr key={index}>
                      <td>{item.materiel?.reference || "N/A"}</td>
                      <td>{item.materiel?.nom || "Non spécifié"}</td>
                      <td className="text-center">{item.quantite}</td>
                      <td>{item.notes || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center italic">
                      Aucun matériel enregistré
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Observations / Commentaires du Technicien */}
        <div className="mb-8">
          <div className="section-title">
            Observations / Commentaires du Technicien
          </div>
          <div className="border-black p-4 min-h-150">
            <div className="mb-4">
              <p className="font-bold mb-2">Travaux effectués:</p>
              <div className="whitespace-pre-wrap text-sm">
                {rapport.contenu || "Non renseigné"}
              </div>
            </div>

            {rapport.conclusions && (
              <div className="mb-4">
                <p className="font-bold mb-2">Résultats/Conclusions:</p>
                <div className="whitespace-pre-wrap text-sm">
                  {rapport.conclusions}
                </div>
              </div>
            )}

            {rapport.recommandations && (
              <div>
                <p className="font-bold mb-2">Recommandations:</p>
                <div className="whitespace-pre-wrap text-sm">
                  {rapport.recommandations}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Signatures */}
        <div className="mb-8">
          <div className="section-title">Signatures</div>
          <table className="table-print">
            <thead>
              <tr>
                <th className="table-cell-33">Technicien</th>
                <th className="table-cell-33">Responsable Technique</th>
                <th className="table-cell-34">Client (si sur site)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <div className="signature-box">
                    <div className="signature-label">
                      {redacteur
                        ? `${redacteur.prenom} ${redacteur.nom}`
                        : "Signature"}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="signature-box">
                    <div className="signature-label">Responsable Technique</div>
                  </div>
                </td>
                <td>
                  <div className="signature-box">
                    <div className="signature-label">Signature client</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

{/* Pied de page - Modifié selon l'image fournie */}
<div className="text-center text-xs text-gray-600 pt-2 mt-8 border-t border-gray-300">
  <div className="mb-1">
    <p className="font-semibold">PARABELLUM GROUP • Service Technique Professionnel</p>
    <p className="text-[10px]">
      Siège Social : Abidjan, Plateau • RCCM N° CI-ABJ-2024-M2-001 • NIF : 2024001A
    </p>
    <p className="text-[10px]">
      Email : contact@parabellumgroup.ci • Tél : +225 27 20 21 22 23
    </p>
    <p className="text-[10px]">
      Compte Bancaire : CI001 01010 10101010101 01 • UBA COTE D&apos;IVOIRE
    </p>
  </div>
  <div className="mt-1 pt-1 border-t border-gray-200">
    <p className="font-bold">PARABELLUM GROUP ERP - Version 1.0.0</p>
    <p className="text-[9px]">
      Document généré le {new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })} • Référence : {rapport.id.slice(0, 8).toUpperCase()}
    </p>
    <p className="text-[9px] italic">
      Localhost:3000/dashboard/technical/rapports • Page 1/1
    </p>
  </div>
</div>
      </div>
    </div>
  );
}
