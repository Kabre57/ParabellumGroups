export const formatAccountingCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  })
    .format(value || 0)
    .replace('XOF', 'F CFA');

export const formatAccountingDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('fr-FR');
};

export const formatAccountingPercent = (value: number) =>
  `${Number.isFinite(value) ? value.toFixed(1) : '0.0'} %`;

export const accountingAccountTypeLabel = (type: string) => {
  const labels = {
    asset: 'Actif',
    liability: 'Passif',
    equity: 'Capitaux propres',
    revenue: 'Produits',
    expense: 'Charges',
  };

  return labels[type as keyof typeof labels] || type;
};
