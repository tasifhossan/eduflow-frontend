import { toMinor } from './money';

export const DEFAULT_CURRENCY = 'BDT';
export const DEFAULT_CURRENCY_SYMBOL = '৳';

/**
 * Currency, Date, and Time formatting helpers based on center settings
 */

/**
 * Formats a monetary amount with currency symbol or code without floating-point math.
 * @example formatMoney("1500.00", "BDT", "৳") => "৳1,500.00"
 */
export function formatMoney(
  amount: number | string | bigint | null | undefined,
  currency = 'BDT',
  symbol = '৳',
  locale = 'en-US'
): string {
  void currency;
  if (amount === null || amount === undefined) {
    return `${symbol}0.00`;
  }

  const ZERO = BigInt(0);
  const HUNDRED = BigInt(100);

  const minor = toMinor(amount);
  const isNegative = minor < ZERO;
  const abs = isNegative ? -minor : minor;
  const units = abs / HUNDRED;
  const cents = abs % HUNDRED;

  const formattedUnits = new Intl.NumberFormat(locale, {
    useGrouping: true,
  }).format(units);

  const formattedAmount = `${formattedUnits}.${cents.toString().padStart(2, '0')}`;
  return `${isNegative ? '-' : ''}${symbol}${formattedAmount}`;
}

/**
 * Formats a date string or object into a localized date string using the center's timezone.
 * @example formatDate('2026-10-25T10:00:00Z', 'Asia/Dhaka') => 'Oct 25, 2026'
 */
export function formatDate(
  date: string | number | Date | null | undefined,
  timezone = 'Asia/Dhaka',
  locale = 'en-US',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';

    return new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: timezone,
    }).format(d);
  } catch {
    return '—';
  }
}

/**
 * Formats a date string or object into a localized date and time using the center's timezone.
 * @example formatDateTime('2026-10-25T10:00:00Z', 'Asia/Dhaka') => 'Oct 25, 2026, 4:00 PM'
 */
export function formatDateTime(
  date: string | number | Date | null | undefined,
  timezone = 'Asia/Dhaka',
  locale = 'en-US',
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }
): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';

    return new Intl.DateTimeFormat(locale, {
      ...options,
      timeZone: timezone,
    }).format(d);
  } catch {
    return '—';
  }
}

/**
 * Normalizes Bangladeshi phone numbers into canonical 11-digit format: 01XXXXXXXXX
 */
export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const trimmed = phone.trim();
  if (!trimmed) return null;

  let cleaned = trimmed.replace(/[\s-]/g, '');
  if (cleaned.startsWith('+880')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('880')) {
    cleaned = '0' + cleaned.slice(3);
  }

  return cleaned;
}

/**
 * Formats a Bangladeshi phone number into standard display format: 01XXX-XXXXXX
 */
export function formatPhone(phone: string | null | undefined): string {
  const norm = normalizePhone(phone);
  if (!norm) return phone || '—';
  if (norm.length === 11) {
    return `${norm.slice(0, 5)}-${norm.slice(5)}`;
  }
  return norm;
}

/**
 * Validates whether a phone string conforms to standard 11-digit Bangladeshi mobile format.
 */
export function isValidBangladeshiPhone(phone: string): boolean {
  const norm = normalizePhone(phone);
  if (!norm) return false;
  return /^01[3-9]\d{8}$/.test(norm);
}

