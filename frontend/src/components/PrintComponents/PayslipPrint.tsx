import React from 'react';

interface PayslipPrintProps {
  salary: any;
  onClose: () => void;
}

export const PayslipPrint: React.FC<PayslipPrintProps> = ({ salary, onClose }) => {
  React.useEffect(() => {
    const handlePrint = () => {
      window.print();
      onClose();
    };

    const timer = setTimeout(handlePrint, 500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF'
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatPeriod = (date: string | Date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long'
    });
  };

  return (
    <div className="print:block hidden">
      <div className="max-w-4xl mx-auto p-8 bg-white">
        {/* En-tête conforme */}
        <div className="border-b-2 border-blue-600 pb-6 mb-8">
          <div className="grid grid-cols-2 gap-8">
            {/* Informations employeur */}
            <div>
              <h1 className="text-2xl font-bold text-blue-600 mb-2">PARABELLUM GROUPS</h1>
              <div className="text-sm space-y-1">
                <p><strong>Raison sociale :</strong> Parabellum Groups SARL</p>
                <p><strong>Adresse :</strong> Abidjan, Côte d'Ivoire</p>
                <p><strong>Téléphone :</strong> +225 07 07 07 07 07</p>
                <p><strong>Email :</strong> contact@parabellum.com</p>
                <p><strong>SIRET :</strong> CI-123456789</p>
                <p><strong>N° CNPS Employeur :</strong> 1234567</p>
                <p><strong>N° CNAM Employeur :</strong> 7654321</p>
              </div>
            </div>
            
            {/* Titre et période */}
            <div className="text-right">
              <h2 className="text-3xl font-bold text-gray-800 mb-2">BULLETIN DE PAIE</h2>
              <div className="text-lg font-semibold text-gray-600 mb-4">
                Période : {formatPeriod(salary.paymentDate)}
              </div>
              <div className="text-sm text-gray-500">
                <p>Édité le {formatDate(new Date())}</p>
                <p>N° Bulletin : BP-{salary.employee.employeeNumber}-{new Date(salary.paymentDate).getFullYear()}{(new Date(salary.paymentDate).getMonth() + 1).toString().padStart(2, '0')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Informations salarié */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b border-gray-300 pb-2">
              INFORMATIONS SALARIÉ
            </h3>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2">
                <span className="text-gray-600">Nom et Prénom :</span>
                <span className="font-medium">{salary.employee.firstName} {salary.employee.lastName}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-gray-600">N° Matricule :</span>
                <span className="font-mono">{salary.employee.employeeNumber}</span>
              </div>
              {salary.employee.registrationNumber && (
                <div className="grid grid-cols-2">
                  <span className="text-gray-600">N° Registre :</span>
                  <span className="font-mono">{salary.employee.registrationNumber}</span>
                </div>
              )}
              <div className="grid grid-cols-2">
                <span className="text-gray-600">Poste :</span>
                <span>{salary.employee.position}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-gray-600">Service :</span>
                <span>{salary.employee.service?.name}</span>
              </div>
              {salary.employee.category && (
                <div className="grid grid-cols-2">
                  <span className="text-gray-600">Catégorie :</span>
                  <span>{salary.employee.category}</span>
                </div>
              )}
              {salary.employee.level && (
                <div className="grid grid-cols-2">
                  <span className="text-gray-600">Échelon :</span>
                  <span>{salary.employee.level}</span>
                </div>
              )}
              <div className="grid grid-cols-2">
                <span className="text-gray-600">Date d'embauche :</span>
                <span>{formatDate(salary.employee.hireDate)}</span>
              </div>
              {salary.employee.address && (
                <div className="grid grid-cols-2">
                  <span className="text-gray-600">Adresse :</span>
                  <span>{salary.employee.address}</span>
                </div>
              )}
              {salary.employee.cnpsNumber && (
                <div className="grid grid-cols-2">
                  <span className="text-gray-600">N° CNPS :</span>
                  <span className="font-mono">{salary.employee.cnpsNumber}</span>
                </div>
              )}
              {salary.employee.cnamNumber && (
                <div className="grid grid-cols-2">
                  <span className="text-gray-600">N° CNAM :</span>
                  <span className="font-mono">{salary.employee.cnamNumber}</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b border-gray-300 pb-2">
              INFORMATIONS PÉRIODE
            </h3>
            <div className="space-y-2 text-sm">
              <div className="grid grid-cols-2">
                <span className="text-gray-600">Période de paie :</span>
                <span className="font-medium">{formatPeriod(salary.paymentDate)}</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-gray-600">Jours travaillés :</span>
                <span className="font-medium">{salary.workingDays || 22} jours</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-gray-600">Date de paiement :</span>
                <span>{formatDate(salary.paymentDate)}</span>
              </div>
              {salary.paymentMethod && (
                <div className="grid grid-cols-2">
                  <span className="text-gray-600">Mode de paiement :</span>
                  <span>
                    {salary.paymentMethod === 'TRANSFER' ? 'Virement bancaire' :
                     salary.paymentMethod === 'CHECK' ? 'Chèque' :
                     salary.paymentMethod === 'CASH' ? 'Espèces' : 'Autre'}
                  </span>
                </div>
              )}
              {salary.reference && (
                <div className="grid grid-cols-2">
                  <span className="text-gray-600">Référence :</span>
                  <span className="font-mono">{salary.reference}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Détail des éléments de paie - Conforme réglementation */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 border-b border-gray-300 pb-2">
            DÉTAIL DE LA RÉMUNÉRATION
          </h3>
          
          <table className="w-full border-collapse border border-gray-400 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-400 px-3 py-2 text-left font-bold">LIBELLÉ</th>
                <th className="border border-gray-400 px-3 py-2 text-center font-bold">BASE/TAUX</th>
                <th className="border border-gray-400 px-3 py-2 text-right font-bold">GAINS</th>
                <th className="border border-gray-400 px-3 py-2 text-right font-bold">RETENUES</th>
              </tr>
            </thead>
            <tbody>
              {/* GAINS */}
              <tr className="bg-green-50">
                <td className="border border-gray-400 px-3 py-2 font-bold" colSpan={4}>
                  ÉLÉMENTS DE RÉMUNÉRATION
                </td>
              </tr>
              
              <tr>
                <td className="border border-gray-400 px-3 py-2">Salaire de base</td>
                <td className="border border-gray-400 px-3 py-2 text-center">
                  {salary.workingDays || 22} jours
                </td>
                <td className="border border-gray-400 px-3 py-2 text-right font-medium">
                  {formatCurrency(salary.baseSalary)}
                </td>
                <td className="border border-gray-400 px-3 py-2 text-right">-</td>
              </tr>

              {salary.overtime > 0 && (
                <tr>
                  <td className="border border-gray-400 px-3 py-2">Heures supplémentaires</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">-</td>
                  <td className="border border-gray-400 px-3 py-2 text-right font-medium">
                    {formatCurrency(salary.overtime)}
                  </td>
                  <td className="border border-gray-400 px-3 py-2 text-right">-</td>
                </tr>
              )}

              {salary.bonuses > 0 && (
                <tr>
                  <td className="border border-gray-400 px-3 py-2">Primes et gratifications</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">-</td>
                  <td className="border border-gray-400 px-3 py-2 text-right font-medium">
                    {formatCurrency(salary.bonuses)}
                  </td>
                  <td className="border border-gray-400 px-3 py-2 text-right">-</td>
                </tr>
              )}

              {salary.allowances > 0 && (
                <tr>
                  <td className="border border-gray-400 px-3 py-2">Indemnités diverses</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">-</td>
                  <td className="border border-gray-400 px-3 py-2 text-right font-medium">
                    {formatCurrency(salary.allowances)}
                  </td>
                  <td className="border border-gray-400 px-3 py-2 text-right">-</td>
                </tr>
              )}

              {salary.paidLeave > 0 && (
                <tr>
                  <td className="border border-gray-400 px-3 py-2">Congés payés</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">-</td>
                  <td className="border border-gray-400 px-3 py-2 text-right font-medium">
                    {formatCurrency(salary.paidLeave)}
                  </td>
                  <td className="border border-gray-400 px-3 py-2 text-right">-</td>
                </tr>
              )}

              {/* COTISATIONS SOCIALES */}
              <tr className="bg-red-50">
                <td className="border border-gray-400 px-3 py-2 font-bold" colSpan={4}>
                  COTISATIONS SALARIALES
                </td>
              </tr>

              {salary.cnpsEmployee > 0 && (
                <tr>
                  <td className="border border-gray-400 px-3 py-2">CNPS (Retraite)</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">3,6%</td>
                  <td className="border border-gray-400 px-3 py-2 text-right">-</td>
                  <td className="border border-gray-400 px-3 py-2 text-right font-medium">
                    {formatCurrency(salary.cnpsEmployee)}
                  </td>
                </tr>
              )}

              {salary.cnamEmployee > 0 && (
                <tr>
                  <td className="border border-gray-400 px-3 py-2">CNAM (Maladie)</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">3,5%</td>
                  <td className="border border-gray-400 px-3 py-2 text-right">-</td>
                  <td className="border border-gray-400 px-3 py-2 text-right font-medium">
                    {formatCurrency(salary.cnamEmployee)}
                  </td>
                </tr>
              )}

              {salary.fdfpEmployee > 0 && (
                <tr>
                  <td className="border border-gray-400 px-3 py-2">FDFP (Formation)</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">0,4%</td>
                  <td className="border border-gray-400 px-3 py-2 text-right">-</td>
                  <td className="border border-gray-400 px-3 py-2 text-right font-medium">
                    {formatCurrency(salary.fdfpEmployee)}
                  </td>
                </tr>
              )}

              {/* PRÉLÈVEMENTS FISCAUX */}
              <tr className="bg-yellow-50">
                <td className="border border-gray-400 px-3 py-2 font-bold" colSpan={4}>
                  PRÉLÈVEMENTS FISCAUX
                </td>
              </tr>

              {salary.taxes > 0 && (
                <tr>
                  <td className="border border-gray-400 px-3 py-2">Impôt sur le revenu (IGR)</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">Progressif</td>
                  <td className="border border-gray-400 px-3 py-2 text-right">-</td>
                  <td className="border border-gray-400 px-3 py-2 text-right font-medium">
                    {formatCurrency(salary.taxes)}
                  </td>
                </tr>
              )}

              {/* AUTRES DÉDUCTIONS */}
              {(salary.loanDeductions > 0 || salary.otherDeductions > 0) && (
                <>
                  <tr className="bg-orange-50">
                    <td className="border border-gray-400 px-3 py-2 font-bold" colSpan={4}>
                      AUTRES DÉDUCTIONS
                    </td>
                  </tr>

                  {salary.loanDeductions > 0 && (
                    <tr>
                      <td className="border border-gray-400 px-3 py-2">Remboursement prêt</td>
                      <td className="border border-gray-400 px-3 py-2 text-center">-</td>
                      <td className="border border-gray-400 px-3 py-2 text-right">-</td>
                      <td className="border border-gray-400 px-3 py-2 text-right font-medium">
                        {formatCurrency(salary.loanDeductions)}
                      </td>
                    </tr>
                  )}

                  {salary.otherDeductions > 0 && (
                    <tr>
                      <td className="border border-gray-400 px-3 py-2">Autres retenues</td>
                      <td className="border border-gray-400 px-3 py-2 text-center">-</td>
                      <td className="border border-gray-400 px-3 py-2 text-right">-</td>
                      <td className="border border-gray-400 px-3 py-2 text-right font-medium">
                        {formatCurrency(salary.otherDeductions)}
                      </td>
                    </tr>
                  )}
                </>
              )}

              {/* TOTAUX */}
              <tr className="bg-gray-100 font-bold text-base">
                <td className="border border-gray-400 px-3 py-3">TOTAUX</td>
                <td className="border border-gray-400 px-3 py-3 text-center">-</td>
                <td className="border border-gray-400 px-3 py-3 text-right text-green-600">
                  {formatCurrency(salary.grossSalary)}
                </td>
                <td className="border border-gray-400 px-3 py-3 text-right text-red-600">
                  {formatCurrency(salary.totalDeductions)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Récapitulatif des sommes */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-600 mb-1">SALAIRE BRUT</div>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(salary.grossSalary)}
            </div>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-600 mb-1">TOTAL RETENUES</div>
            <div className="text-xl font-bold text-red-600">
              {formatCurrency(salary.totalDeductions)}
            </div>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">
            <div className="text-sm text-gray-600 mb-1">NET À PAYER</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(salary.netSalary)}
            </div>
          </div>
        </div>

        {/* Sommes non soumises à cotisation */}
        {salary.nonTaxableAmount > 0 && (
          <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">SOMMES NON SOUMISES À COTISATION</h4>
            <div className="text-sm">
              <div className="flex justify-between">
                <span>Avantages en nature, frais professionnels :</span>
                <span className="font-medium">{formatCurrency(salary.nonTaxableAmount)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Informations bancaires */}
        {salary.employee.bankAccount && (
          <div className="mb-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">INFORMATIONS BANCAIRES</h4>
            <div className="text-sm">
              <div className="flex justify-between">
                <span>Compte bancaire (IBAN) :</span>
                <span className="font-mono">{salary.employee.bankAccount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {salary.notes && (
          <div className="mb-8">
            <h4 className="font-semibold text-gray-800 mb-2">OBSERVATIONS</h4>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm">
              {salary.notes}
            </div>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mb-6">
          <div className="text-center">
            <p className="font-medium mb-8">Signature de l'Employeur</p>
            <div className="border-b border-gray-400 w-48 mx-auto"></div>
            <p className="text-xs text-gray-500 mt-2">Cachet et signature</p>
          </div>
          <div className="text-center">
            <p className="font-medium mb-8">Signature du Salarié</p>
            <div className="border-b border-gray-400 w-48 mx-auto"></div>
            <p className="text-xs text-gray-500 mt-2">Pour réception</p>
          </div>
        </div>

        {/* Mentions légales */}
        <div className="border-t border-gray-400 pt-4 text-center text-xs text-gray-600 space-y-1">
          <p className="font-medium">
            Ce bulletin de paie est établi conformément aux dispositions du Code du Travail de Côte d'Ivoire
          </p>
          <p>
            Conservez ce bulletin sans limitation de durée - Article L.143-3 du Code du Travail
          </p>
          <p>
            Document généré électroniquement le {formatDate(new Date())} par le système Parabellum Groups
          </p>
          <div className="flex justify-center space-x-8 mt-2 text-xs">
            <span>CNPS Employeur : 1234567</span>
            <span>CNAM Employeur : 7654321</span>
            <span>FDFP : 9876543</span>
          </div>
        </div>
      </div>

      {/* Styles d'impression optimisés */}
      <style>{`
        @media print {
          body { 
            margin: 0; 
            font-family: 'Arial', sans-serif;
            font-size: 12px;
            line-height: 1.4;
          }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
          .print-avoid-break { page-break-inside: avoid; }
          table { 
            page-break-inside: auto;
            border-collapse: collapse;
          }
          tr { 
            page-break-inside: avoid; 
            page-break-after: auto; 
          }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          th, td {
            border: 1px solid #666 !important;
            padding: 6px !important;
          }
          .bg-gray-100 { background-color: #f5f5f5 !important; }
          .bg-green-50 { background-color: #f0f9f0 !important; }
          .bg-red-50 { background-color: #fef2f2 !important; }
          .bg-yellow-50 { background-color: #fffbeb !important; }
          .bg-orange-50 { background-color: #fff7ed !important; }
          .text-blue-600 { color: #2563eb !important; }
          .text-green-600 { color: #16a34a !important; }
          .text-red-600 { color: #dc2626 !important; }
          .border-blue-600 { border-color: #2563eb !important; }
        }
      `}</style>
    </div>
  );
};