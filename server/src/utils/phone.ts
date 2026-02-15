import { parsePhoneNumberFromString } from 'libphonenumber-js';

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)]/g, '');
}

export function maskPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  if (normalized.length <= 4) return normalized;
  return '*'.repeat(normalized.length - 4) + normalized.slice(-4);
}

export function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(phone);
}

/**
 * Attempts to convert any phone format to E.164.
 * Returns null if parsing fails.
 */
export function toE164(phone: string, defaultCountry?: string): string | null {
  if (!phone) return null;
  const cleaned = normalizePhone(phone);
  // Already E.164
  if (isValidE164(cleaned)) return cleaned;
  // Try parsing with optional country hint
  const parsed = parsePhoneNumberFromString(cleaned, defaultCountry?.toUpperCase() as any);
  if (parsed && parsed.isValid()) return parsed.format('E.164');
  return null;
}
