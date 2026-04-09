export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  })
    .format(value || 0)
    .replace('XOF', 'F CFA');

export const formatPercent = (value: number) => {
  const formatted = (value || 0).toFixed(2) + '%';
  return value > 0 ? '+' + formatted : formatted;
};

export const typeLabels: Record<string, string> = {
  ACTION: 'Action',
  OBLIGATION: 'Obligation',
  TCN: 'TCN',
  IMMOBILIER: 'Immobilier',
};
