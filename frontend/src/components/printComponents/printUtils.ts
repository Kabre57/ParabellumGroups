/**
 * Utilitaires pour le formatage des impressions (PDF, Bons de caisse, etc.)
 */

export const formatPrintDate = (value?: string | Date | null, withTime = false): string => {
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

export const formatFCFA = (amount?: number | null): string => {
  const value = Number(amount ?? 0);
  return `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)} F CFA`;
};

export const resolvePrintLogo = (logoSrc?: string | null): string => {
  if (!logoSrc || !logoSrc.trim()) {
    return '/parabellum.jpg';
  }

  return logoSrc;
};

export const textOrDash = (value?: string | number | null): string => {
  if (value === undefined || value === null) {
    return '-';
  }

  const normalized = String(value).trim();
  return normalized || '-';
};

const UNITS = [
  'zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept',
  'dix-huit', 'dix-neuf',
];

const TENS = [
  '', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante',
];

/**
 * Convertit un nombre de deux chiffres en lettres (Français)
 * Correction : Ajout du type de retour explicite : string
 */
const twoDigitsToWords = (number: number): string => {
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

/**
 * Convertit un nombre de trois chiffres en lettres
 */
const threeDigitsToWords = (number: number): string => {
  const hundreds = Math.floor(number / 100);
  const remainder = number % 100;
  if (!hundreds) return twoDigitsToWords(remainder);
  const hundredLabel = hundreds === 1 ? 'cent' : `${UNITS[hundreds]} cent`;
  if (!remainder) return hundreds > 1 ? `${hundredLabel}s` : hundredLabel;
  return `${hundredLabel} ${twoDigitsToWords(remainder)}`;
};

/**
 * Convertit un nombre complet en lettres
 */
const numberToFrenchWords = (number: number): string => {
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

/**
 * Formate un montant en FCFA écrit en toutes lettres
 */
export const formatFCFAInWords = (amount?: number | null): string => {
  const value = Math.round(Number(amount ?? 0));
  if (!Number.isFinite(value)) {
    return '-';
  }
  return `${numberToFrenchWords(Math.abs(value))} francs CFA`;
};
