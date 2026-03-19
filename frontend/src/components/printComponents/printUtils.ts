export const formatPrintDate = (value?: string | Date | null, withTime = false) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(withTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
        }
      : {}),
  });
};

export const formatFCFA = (amount?: number | null) => {
  const value = Number(amount ?? 0);
  return `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)} F CFA`;
};

export const resolvePrintLogo = (logoSrc?: string | null) => {
  if (!logoSrc || !logoSrc.trim()) {
    return '/parabellum.jpg';
  }

  return logoSrc;
};

export const textOrDash = (value?: string | number | null) => {
  if (value === undefined || value === null) {
    return '-';
  }

  const normalized = String(value).trim();
  return normalized || '-';
};
