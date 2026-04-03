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

const UNITS = [
  'zero',
  'un',
  'deux',
  'trois',
  'quatre',
  'cinq',
  'six',
  'sept',
  'huit',
  'neuf',
  'dix',
  'onze',
  'douze',
  'treize',
  'quatorze',
  'quinze',
  'seize',
  'dix-sept',
  'dix-huit',
  'dix-neuf',
];

const TENS = [
  '',
  'dix',
  'vingt',
  'trente',
  'quarante',
  'cinquante',
  'soixante',
];

const twoDigitsToWords = (number: number) => {
  if (number < 20) return UNITS[number];
  if (number < 70) {
    const tens = Math.floor(number / 10);
    const unit = number % 10;
    if (unit === 1) return `${TENS[tens]} et un`;
    return unit ? `${TENS[tens]}-${UNITS[unit]}` : TENS[tens];
  }
  if (number < 80) {
    return `soixante-${twoDigitsToWords(number - 60)}`;
  }
  if (number < 100) {
    const base = number === 80 ? 'quatre-vingts' : 'quatre-vingt';
    const remainder = number - 80;
    if (!remainder) return base;
    return `${base}-${twoDigitsToWords(remainder)}`;
  }
  return '';
};

const threeDigitsToWords = (number: number) => {
  const hundreds = Math.floor(number / 100);
  const remainder = number % 100;
  if (!hundreds) return twoDigitsToWords(remainder);
  const hundredLabel = hundreds === 1 ? 'cent' : `${UNITS[hundreds]} cent`;
  if (!remainder) return hundreds > 1 ? `${hundredLabel}s` : hundredLabel;
  return `${hundredLabel} ${twoDigitsToWords(remainder)}`;
};

const numberToFrenchWords = (number: number) => {
  if (number === 0) return UNITS[0];
  const parts: string[] = [];

  const billions = Math.floor(number / 1_000_000_000);
  const millions = Math.floor((number % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((number % 1_000_000) / 1000);
  const remainder = number % 1000;

  if (billions) {
    parts.push(`${threeDigitsToWords(billions)} milliard${billions > 1 ? 's' : ''}`);
  }
  if (millions) {
    parts.push(`${threeDigitsToWords(millions)} million${millions > 1 ? 's' : ''}`);
  }
  if (thousands) {
    if (thousands === 1) {
      parts.push('mille');
    } else {
      parts.push(`${threeDigitsToWords(thousands)} mille`);
    }
  }
  if (remainder) {
    parts.push(threeDigitsToWords(remainder));
  }

  return parts.join(' ');
};

export const formatFCFAInWords = (amount?: number | null) => {
  const value = Math.round(Number(amount ?? 0));
  if (!Number.isFinite(value)) {
    return '-';
  }
  return `${numberToFrenchWords(Math.abs(value))} francs CFA`;
};
