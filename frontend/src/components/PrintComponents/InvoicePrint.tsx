import React from 'react';

interface InvoicePrintProps {
  invoice: any;
  onClose: () => void;
}

export const InvoicePrint: React.FC<InvoicePrintProps> = ({ invoice, onClose }) => {
  React.useEffect(() => {
    const handlePrint = () => {
      window.print();
      onClose();
    };

    // Auto-print après un court délai
    const timer = setTimeout(handlePrint, 500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="print:block hidden">
      <div className="max-w-4xl mx-auto p-8 bg-white">
        {/* En-tête de l'entreprise */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Parabellum Groups</h1>
            <p className="text-gray-600">Abidjan, Côte d'Ivoire</p>
            <p className="text-gray-600">+225 07 07 07 07 07</p>
            <p className="text-gray-600">contact@parabellum.com</p>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-blue-600">FACTURE</h2>
            <p className="text-lg font-semibold">{invoice.invoiceNumber}</p>
          </div>
        </div>

        {/* Informations client et facture */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-2">Facturé à :</h3>
            <div className="text-gray-700">
              <p className="font-medium">{invoice.customer.name}</p>
              {invoice.customer.legalName && (
                <p>{invoice.customer.legalName}</p>
              )}
              {invoice.customerAddress && (
                <>
                  <p>{invoice.customerAddress.addressLine1}</p>
                  {invoice.customerAddress.addressLine2 && (
                    <p>{invoice.customerAddress.addressLine2}</p>
                  )}
                  <p>{invoice.customerAddress.postalCode} {invoice.customerAddress.city}</p>
                  <p>{invoice.customerAddress.country}</p>
                </>
              )}
              {invoice.customer.email && <p>Email: {invoice.customer.email}</p>}
              {invoice.customer.phone && <p>Tél: {invoice.customer.phone}</p>}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Détails de la facture :</h3>
            <div className="text-gray-700 space-y-1">
              <p><span className="font-medium">Date de facture:</span> {new Date(invoice.invoiceDate).toLocaleDateString()}</p>
              <p><span className="font-medium">Date d'échéance:</span> {new Date(invoice.dueDate).toLocaleDateString()}</p>
              <p><span className="font-medium">Conditions de paiement:</span> {invoice.paymentTerms} jours</p>
              {invoice.quote && (
                <p><span className="font-medium">Devis de référence:</span> {invoice.quote.quoteNumber}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tableau des articles */}
        <div className="mb-8">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left">Description</th>
                <th className="border border-gray-300 px-4 py-2 text-center">Qté</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Prix unitaire HT</th>
                <th className="border border-gray-300 px-4 py-2 text-center">TVA</th>
                <th className="border border-gray-300 px-4 py-2 text-right">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item: any, index: number) => (
                <tr key={index}>
                  <td className="border border-gray-300 px-4 py-2">
                    <div className="font-medium">{item.description}</div>
                    {item.product && (
                      <div className="text-sm text-gray-500">SKU: {item.product.sku}</div>
                    )}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {item.quantity}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'XOF'
                    }).format(item.unitPriceHt)}
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center">
                    {item.vatRate}%
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {new Intl.NumberFormat('fr-FR', {
                      style: 'currency',
                      currency: 'XOF'
                    }).format(item.totalHt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totaux */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between py-2">
              <span>Sous-total HT:</span>
              <span className="font-medium">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF'
                }).format(invoice.subtotalHt)}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span>TVA:</span>
              <span className="font-medium">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF'
                }).format(invoice.totalVat)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-t border-gray-300 font-bold text-lg">
              <span>Total TTC:</span>
              <span>
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF'
                }).format(invoice.totalTtc)}
              </span>
            </div>
          </div>
        </div>

        {/* Conditions */}
        {invoice.terms && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Conditions de paiement :</h3>
            <p className="text-gray-700">{invoice.terms}</p>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-2">Notes :</h3>
            <p className="text-gray-700">{invoice.notes}</p>
          </div>
        )}

        {/* Pied de page */}
        <div className="border-t border-gray-300 pt-4 text-center text-sm text-gray-500">
          <p>Merci pour votre confiance !</p>
          <p>Cette facture est générée électroniquement et ne nécessite pas de signature.</p>
        </div>
      </div>
    </div>
  );
};