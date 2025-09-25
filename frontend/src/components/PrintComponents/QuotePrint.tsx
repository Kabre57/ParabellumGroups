import React from 'react';

interface QuotePrintProps {
  quote: any;
  onClose: () => void;
}

export const QuotePrint: React.FC<QuotePrintProps> = ({ quote, onClose }) => {
  React.useEffect(() => {
    const handlePrint = () => {
      window.print();
      onClose();
    };

    const timer = setTimeout(handlePrint, 500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="print:block hidden">
      <div className="max-w-4xl mx-auto p-8 bg-white">
        {/* En-tête */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Parabellum Groups</h1>
            <p className="text-gray-600">Abidjan, Côte d'Ivoire</p>
            <p className="text-gray-600">+225 07 07 07 07 07</p>
            <p className="text-gray-600">contact@parabellum.com</p>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-blue-600">DEVIS</h2>
            <p className="text-lg font-semibold">{quote.quoteNumber}</p>
          </div>
        </div>

        {/* Informations client et devis */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-2">Client :</h3>
            <div className="text-gray-700">
              <p className="font-medium">{quote.customer.name}</p>
              {quote.customer.legalName && <p>{quote.customer.legalName}</p>}
              {quote.customerAddress && (
                <>
                  <p>{quote.customerAddress.addressLine1}</p>
                  {quote.customerAddress.addressLine2 && <p>{quote.customerAddress.addressLine2}</p>}
                  <p>{quote.customerAddress.postalCode} {quote.customerAddress.city}</p>
                </>
              )}
              {quote.customer.email && <p>Email: {quote.customer.email}</p>}
              {quote.customer.phone && <p>Tél: {quote.customer.phone}</p>}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Détails du devis :</h3>
            <div className="text-gray-700 space-y-1">
              <p><span className="font-medium">Date du devis:</span> {new Date(quote.quoteDate).toLocaleDateString('fr-FR')}</p>
              <p><span className="font-medium">Valide jusqu'au:</span> {new Date(quote.validUntil).toLocaleDateString('fr-FR')}</p>
              <p><span className="font-medium">Créé par:</span> {quote.creator.firstName} {quote.creator.lastName}</p>
            </div>
          </div>
        </div>

        {/* Tableau des articles */}
        <table className="w-full border-collapse border border-gray-300 mb-8">
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
            {quote.items?.map((item: any, index: number) => (
              <tr key={index}>
                <td className="border border-gray-300 px-4 py-2">
                  <div className="font-medium">{item.description}</div>
                  {item.product && (
                    <div className="text-sm text-gray-500">SKU: {item.product.sku}</div>
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">{item.quantity}</td>
                <td className="border border-gray-300 px-4 py-2 text-right">
                  {new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF'
                  }).format(item.unitPriceHt)}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center">{item.vatRate}%</td>
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

        {/* Totaux */}
        <div className="flex justify-end mb-8">
          <table className="w-64 border border-gray-300">
            <tr>
              <td className="border-b border-gray-300 px-4 py-2">Sous-total HT:</td>
              <td className="border-b border-gray-300 px-4 py-2 text-right font-medium">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF'
                }).format(quote.subtotalHt)}
              </td>
            </tr>
            <tr>
              <td className="border-b border-gray-300 px-4 py-2">TVA:</td>
              <td className="border-b border-gray-300 px-4 py-2 text-right font-medium">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF'
                }).format(quote.totalVat)}
              </td>
            </tr>
            <tr className="bg-blue-600 text-white">
              <td className="px-4 py-3 font-bold">Total TTC:</td>
              <td className="px-4 py-3 text-right font-bold text-lg">
                {new Intl.NumberFormat('fr-FR', {
                  style: 'currency',
                  currency: 'XOF'
                }).format(quote.totalTtc)}
              </td>
            </tr>
          </table>
        </div>

        {/* Conditions et notes */}
        {quote.terms && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Conditions :</h3>
            <p className="text-gray-700">{quote.terms}</p>
          </div>
        )}

        {quote.notes && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Notes :</h3>
            <p className="text-gray-700">{quote.notes}</p>
          </div>
        )}

        {/* Pied de page */}
        <div className="border-t border-gray-300 pt-4 text-center text-sm text-gray-500">
          <p>Ce devis est valable jusqu'au {new Date(quote.validUntil).toLocaleDateString('fr-FR')}</p>
          <p>Merci de nous faire confiance pour vos projets !</p>
        </div>
      </div>
    </div>
  );
};