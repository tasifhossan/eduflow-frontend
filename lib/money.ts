/**
 * Exact Money Arithmetic using BigInt minor units (cents / poisha).
 * Never uses floating-point numbers for money calculations.
 */

const ZERO = BigInt(0);
const TEN = BigInt(10);
const HUNDRED = BigInt(100);

/**
 * Converts a string, number, or bigint to minor units (e.g. "12.34" -> 1234n).
 */
export function toMinor(value: string | number | bigint | null | undefined): bigint {
  if (value === null || value === undefined) return ZERO;
  if (typeof value === 'bigint') return value;

  const raw = typeof value === 'number' ? value.toFixed(2) : String(value).trim();
  if (!raw || raw === '.') return ZERO;

  const isNegative = raw.startsWith('-');
  const clean = isNegative ? raw.slice(1) : raw;

  const parts = clean.split('.');
  const integerPart = parts[0] ? BigInt(parts[0].replace(/\D/g, '') || '0') : ZERO;

  let fractionalPart = ZERO;
  if (parts.length > 1) {
    const fraction = parts[1].slice(0, 3); // Take up to 3 for rounding if needed
    if (fraction.length === 1) {
      fractionalPart = BigInt(fraction) * TEN;
    } else if (fraction.length === 2) {
      fractionalPart = BigInt(fraction);
    } else if (fraction.length >= 3) {
      // Round half-up on 3rd digit
      const twoDigit = parseInt(fraction.slice(0, 2), 10);
      const thirdDigit = parseInt(fraction[2], 10);
      fractionalPart = BigInt(thirdDigit >= 5 ? twoDigit + 1 : twoDigit);
    }
  }

  const total = integerPart * HUNDRED + fractionalPart;
  return isNegative ? -total : total;
}

/**
 * Converts minor units back to a canonical 2-decimal string (e.g. 1234 -> "12.34").
 */
export function fromMinor(minor: bigint): string {
  const isNegative = minor < ZERO;
  const abs = isNegative ? -minor : minor;
  const units = abs / HUNDRED;
  const cents = abs % HUNDRED;
  const centsStr = cents.toString().padStart(2, '0');
  return `${isNegative ? '-' : ''}${units.toString()}.${centsStr}`;
}

/**
 * Adds two monetary values and returns the 2-decimal string result.
 */
export function add(
  a: string | number | bigint | null | undefined,
  b: string | number | bigint | null | undefined
): string {
  return fromMinor(toMinor(a) + toMinor(b));
}

/**
 * Subtracts b from a and returns the 2-decimal string result.
 */
export function subtract(
  a: string | number | bigint | null | undefined,
  b: string | number | bigint | null | undefined
): string {
  return fromMinor(toMinor(a) - toMinor(b));
}

/**
 * Compares two monetary values.
 * Returns -1 if a < b, 0 if a === b, 1 if a > b.
 */
export function compare(
  a: string | number | bigint | null | undefined,
  b: string | number | bigint | null | undefined
): number {
  const ma = toMinor(a);
  const mb = toMinor(b);
  if (ma < mb) return -1;
  if (ma > mb) return 1;
  return 0;
}

/**
 * Sums an array of monetary values.
 */
export function sum(amounts: (string | number | bigint | null | undefined)[]): string {
  let total = ZERO;
  for (const amt of amounts) {
    total += toMinor(amt);
  }
  return fromMinor(total);
}

/**
 * Checks if a monetary value is strictly greater than zero.
 */
export function isPositive(value: string | number | bigint | null | undefined): boolean {
  return toMinor(value) > ZERO;
}

/**
 * Checks if a monetary value is zero.
 */
export function isZero(value: string | number | bigint | null | undefined): boolean {
  return toMinor(value) === ZERO;
}

/**
 * Validates whether a string is a valid positive money string (digits and optional max 2 decimals).
 */
export function isValidMoneyString(value: string): boolean {
  if (!value) return false;
  return /^\d+(\.\d{1,2})?$/.test(value.trim());
}

/**
 * Splits a total monetary amount into `count` installments.
 * Uses exact integer division on minor units with HALF_UP rounding for the base split,
 * placing the remainder on the LAST installment to match backend FeeLedgerService.splitInstallments.
 */
export function splitInstallments(
  total: string | number | bigint,
  count: number
): string[] {
  if (count < 2 || count > 12) {
    throw new Error('Installment count must be between 2 and 12');
  }

  const totalMinor = toMinor(total);
  const countBig = BigInt(count);

  // Exact split in minor units with HALF_UP rounding: round(totalMinor / count)
  const exactSplitMinor = (totalMinor * BigInt(2) + countBig) / (countBig * BigInt(2));
  const firstPartSumMinor = exactSplitMinor * BigInt(count - 1);
  const lastAmountMinor = totalMinor - firstPartSumMinor;

  const result: string[] = [];
  for (let i = 0; i < count - 1; i++) {
    result.push(fromMinor(exactSplitMinor));
  }
  result.push(fromMinor(lastAmountMinor));
  return result;
}

