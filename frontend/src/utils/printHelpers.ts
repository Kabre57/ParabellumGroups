// Utilitaires pour l'impression et l'export

export const printHelpers = {
  // Imprimer une facture
  printInvoice: (invoice: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Facture ${invoice.invoiceNumber}</title>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              color: #333;
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #3B82F6;
              padding-bottom: 20px;
            }
            .company-info h1 { 
              color: #3B82F6; 
              margin: 0 0 10px 0; 
              font-size: 24px;
            }
            .company-info p { margin: 2px 0; color: #666; }
            .invoice-title { 
              text-align: right; 
            }
            .invoice-title h2 { 
              color: #3B82F6; 
              margin: 0; 
              font-size: 32px;
            }
            .invoice-number { 
              font-size: 18px; 
              font-weight: bold; 
              margin-top: 5px;
            }
            .details { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 40px; 
              margin-bottom: 30px; 
            }
            .section h3 { 
              color: #374151; 
              margin-bottom: 10px; 
              font-size: 16px;
            }
            .section p { margin: 3px 0; }
            .table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px; 
            }
            .table th, .table td { 
              border: 1px solid #D1D5DB; 
              padding: 12px 8px; 
              text-align: left; 
            }
            .table th { 
              background-color: #F9FAFB; 
              font-weight: bold; 
              color: #374151;
            }
            .table .text-right { text-align: right; }
            .table .text-center { text-align: center; }
            .totals { 
              margin-left: auto; 
              width: 300px; 
              border: 1px solid #D1D5DB;
            }
            .totals tr td { 
              padding: 8px 12px; 
              border-bottom: 1px solid #E5E7EB; 
            }
            .totals .total-final { 
              background-color: #3B82F6; 
              color: white; 
              font-weight: bold; 
              font-size: 18px;
            }
            .footer { 
              margin-top: 40px; 
              text-align: center; 
              color: #6B7280; 
              font-size: 12px; 
              border-top: 1px solid #E5E7EB; 
              padding-top: 20px;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <h1>Parabellum Groups</h1>
              <p>Abidjan, Côte d'Ivoire</p>
              <p>+225 07 07 07 07 07</p>
              <p>contact@parabellum.com</p>
            </div>
            <div class="invoice-title">
              <h2>FACTURE</h2>
              <div class="invoice-number">${invoice.invoiceNumber}</div>
            </div>
          </div>

          <div class="details">
            <div class="section">
              <h3>Facturé à :</h3>
              <p><strong>${invoice.customer.name}</strong></p>
              ${invoice.customer.legalName ? `<p>${invoice.customer.legalName}</p>` : ''}
              ${invoice.customerAddress ? `
                <p>${invoice.customerAddress.addressLine1}</p>
                ${invoice.customerAddress.addressLine2 ? `<p>${invoice.customerAddress.addressLine2}</p>` : ''}
                <p>${invoice.customerAddress.postalCode} ${invoice.customerAddress.city}</p>
                <p>${invoice.customerAddress.country}</p>
              ` : ''}
              ${invoice.customer.email ? `<p>Email: ${invoice.customer.email}</p>` : ''}
              ${invoice.customer.phone ? `<p>Tél: ${invoice.customer.phone}</p>` : ''}
            </div>
            <div class="section">
              <h3>Détails de la facture :</h3>
              <p><strong>Date de facture:</strong> ${new Date(invoice.invoiceDate).toLocaleDateString('fr-FR')}</p>
              <p><strong>Date d'échéance:</strong> ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</p>
              <p><strong>Conditions:</strong> ${invoice.paymentTerms} jours</p>
              ${invoice.quote ? `<p><strong>Devis:</strong> ${invoice.quote.quoteNumber}</p>` : ''}
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-center">Qté</th>
                <th class="text-right">Prix unitaire HT</th>
                <th class="text-center">TVA</th>
                <th class="text-right">Total HT</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items?.map((item: any) => `
                <tr>
                  <td>
                    <div style="font-weight: 500;">${item.description}</div>
                    ${item.product ? `<div style="font-size: 12px; color: #6B7280;">SKU: ${item.product.sku}</div>` : ''}
                  </td>
                  <td class="text-center">${item.quantity}</td>
                  <td class="text-right">${new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF'
                  }).format(item.unitPriceHt)}</td>
                  <td class="text-center">${item.vatRate}%</td>
                  <td class="text-right">${new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: 'XOF'
                  }).format(item.totalHt)}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>

          <table class="totals">
            <tr>
              <td>Sous-total HT:</td>
              <td class="text-right">${new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'XOF'
              }).format(invoice.subtotalHt)}</td>
            </tr>
            <tr>
              <td>TVA:</td>
              <td class="text-right">${new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'XOF'
              }).format(invoice.totalVat)}</td>
            </tr>
            <tr class="total-final">
              <td><strong>Total TTC:</strong></td>
              <td class="text-right"><strong>${new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: 'XOF'
              }).format(invoice.totalTtc)}</strong></td>
            </tr>
          </table>

          ${invoice.terms ? `
            <div style="margin-top: 30px;">
              <h3>Conditions de paiement :</h3>
              <p style="color: #374151;">${invoice.terms}</p>
            </div>
          ` : ''}

          ${invoice.notes ? `
            <div style="margin-top: 20px;">
              <h3>Notes :</h3>
              <p style="color: #374151;">${invoice.notes}</p>
            </div>
          ` : ''}

          <div class="footer">
            <p>Merci pour votre confiance !</p>
            <p>Cette facture est générée électroniquement et ne nécessite pas de signature.</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  };

  return null;
};