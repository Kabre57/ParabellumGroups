/**
 * Format a date to a specific format
 * @param date - Date object, string, or timestamp
 * @param format - Format string: 'DD/MM/YYYY', 'DD/MM/YYYY HH:mm', 'YYYY-MM-DD', 'full'
 * @returns Formatted date string
 * 
 * @example
 * formatDate(new Date('2026-01-15'), 'DD/MM/YYYY') // => '15/01/2026'
 * formatDate('2026-01-15', 'DD/MM/YYYY HH:mm') // => '15/01/2026 00:00'
 */
export function formatDate(date: Date | string | number, format: string = 'DD/MM/YYYY'): string {
  const d = new Date(date);
  
  if (isNaN(d.getTime())) {
    return 'Date invalide';
  }

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'DD/MM/YYYY HH:mm':
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'full':
      return d.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    default:
      return `${day}/${month}/${year}`;
  }
}

/**
 * Format a number as currency
 * @param amount - Amount to format
 * @param currency - Currency code (default: 'XOF')
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(1500000) // => '1 500 000 XOF'
 * formatCurrency(2500, 'EUR') // => '2 500,00 F'
 */
export function formatCurrency(amount: number, currency: string = 'XOF'): string {
  if (isNaN(amount)) {
    return '0 XOF';
  }

  // XOF doesn't use decimals
  const options: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: currency === 'XOF' ? 0 : 2,
    maximumFractionDigits: currency === 'XOF' ? 0 : 2,
  };

  return new Intl.NumberFormat('fr-FR', options).format(amount);
}

/**
 * Format a number with thousand separators
 * @param num - Number to format
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(1500000) // => '1 500 000'
 * formatNumber(1234.56) // => '1 234,56'
 */
export function formatNumber(num: number): string {
  if (isNaN(num)) {
    return '0';
  }

  return new Intl.NumberFormat('fr-FR').format(num);
}

/**
 * Format a customer number with pattern CUST-YYYYMM-NNNN
 * @param num - Sequential number
 * @returns Formatted customer number
 * 
 * @example
 * formatCustomerNumber(42) // => 'CUST-202601-0042'
 */
export function formatCustomerNumber(num: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const sequential = String(num).padStart(4, '0');
  
  return `CUST-${year}${month}-${sequential}`;
}

/**
 * Format a mission number with pattern MIS-YYYYMM-NNNN
 * @param num - Sequential number
 * @returns Formatted mission number
 * 
 * @example
 * formatMissionNumber(123) // => 'MIS-202601-0123'
 */
export function formatMissionNumber(num: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const sequential = String(num).padStart(4, '0');
  
  return `MIS-${year}${month}-${sequential}`;
}

/**
 * Format an invoice number with pattern INV-YYYYMM-NNNN
 * @param num - Sequential number
 * @returns Formatted invoice number
 * 
 * @example
 * formatInvoiceNumber(456) // => 'INV-202601-0456'
 */
export function formatInvoiceNumber(num: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const sequential = String(num).padStart(4, '0');
  
  return `INV-${year}${month}-${sequential}`;
}
