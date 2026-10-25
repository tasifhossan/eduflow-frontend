/**
 * Timezone helpers for EduFlow (zero-dependency, Intl-only).
 * All center times must be computed and displayed in the center's configured timezone,
 * never in the user's browser timezone.
 */

interface DateTimeParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getPartsInTimezone(date: Date, timezone: string): DateTimeParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = parseInt(part.value, 10);
    }
  }

  return {
    year: map.year || 0,
    month: map.month || 1,
    day: map.day || 1,
    hour: map.hour || 0,
    minute: map.minute || 0,
    second: map.second || 0,
  };
}

/**
 * Converts a UTC ISO string (or Date) to an HTML `<input type="datetime-local" />` string (YYYY-MM-DDTHH:mm)
 * evaluated in the center's timezone.
 */
export function utcToCenterDateTimeInput(
  utcDate: string | number | Date | null | undefined,
  timezone = 'Asia/Dhaka'
): string {
  if (!utcDate) return '';
  const d = typeof utcDate === 'string' || typeof utcDate === 'number' ? new Date(utcDate) : utcDate;
  if (isNaN(d.getTime())) return '';

  const parts = getPartsInTimezone(d, timezone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

/**
 * Converts a `<input type="datetime-local" />` value (YYYY-MM-DDTHH:mm), which the user entered
 * in the center's timezone, into a UTC ISO string (e.g. 2026-11-09T04:00:00.000Z).
 */
export function centerDateTimeInputToUtc(
  localDateTimeString: string,
  timezone = 'Asia/Dhaka'
): string {
  if (!localDateTimeString) return '';
  const match = localDateTimeString.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return '';

  const [, yr, mo, dy, hr, mn, sc] = match;
  const targetYear = parseInt(yr, 10);
  const targetMonth = parseInt(mo, 10);
  const targetDay = parseInt(dy, 10);
  const targetHour = parseInt(hr, 10);
  const targetMinute = parseInt(mn, 10);
  const targetSecond = sc ? parseInt(sc, 10) : 0;

  // Initial naive UTC assumption
  let utcMs = Date.UTC(targetYear, targetMonth - 1, targetDay, targetHour, targetMinute, targetSecond);

  // Iteratively adjust offset to match target timezone representation
  for (let i = 0; i < 3; i++) {
    const parts = getPartsInTimezone(new Date(utcMs), timezone);
    const tzMs = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    const diff = tzMs - Date.UTC(targetYear, targetMonth - 1, targetDay, targetHour, targetMinute, targetSecond);
    if (diff === 0) break;
    utcMs -= diff;
  }

  return new Date(utcMs).toISOString();
}

/**
 * Converts a UTC ISO string (or Date) to an HTML `<input type="date" />` string (YYYY-MM-DD)
 * in the center's timezone.
 */
export function utcToCenterDateInput(
  utcDate: string | number | Date | null | undefined,
  timezone = 'Asia/Dhaka'
): string {
  if (!utcDate) return '';
  const d = typeof utcDate === 'string' || typeof utcDate === 'number' ? new Date(utcDate) : utcDate;
  if (isNaN(d.getTime())) return '';

  const parts = getPartsInTimezone(d, timezone);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

/**
 * Converts a `<input type="date" />` value (YYYY-MM-DD) in the center's timezone
 * to a UTC ISO string starting at 00:00:00 of that day.
 */
export function centerDateInputToUtc(
  localDateString: string,
  timezone = 'Asia/Dhaka'
): string {
  if (!localDateString) return '';
  return centerDateTimeInputToUtc(`${localDateString}T00:00`, timezone);
}

/**
 * Formats time only (e.g. "10:00 AM") in the center's timezone.
 */
export function formatCenterTime(
  date: string | number | Date | null | undefined,
  timezone = 'Asia/Dhaka',
  locale = 'en-US'
): string {
  if (!date) return '—';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';

  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '—';
  }
}

/**
 * Returns a human-friendly display name of the center timezone (e.g. "Asia/Dhaka (GMT+6)").
 */
export function getTimezoneDisplay(timezone = 'Asia/Dhaka'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(new Date());
    const offsetPart = parts.find((p) => p.type === 'timeZoneName')?.value;
    return offsetPart ? `${timezone} (${offsetPart})` : timezone;
  } catch {
    return timezone;
  }
}

export { formatDate, formatDateTime } from './format';
