export const formatFcfa = (value?: number | string | null) => {
  if (value === null || value === undefined || value === '') return '-';
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);
  return `${num.toLocaleString('fr-FR')} F CFA`;
};

export const formatDateFr = (value?: string | Date | null) => {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fr-FR');
};
