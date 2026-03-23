import { Prisma } from "@prisma/client";

export function parseDateInputToLocalMidnight(dateInput: string): Date | null {
  // dateInput format: YYYY-MM-DD (from <input type="date">)
  const d = new Date(`${dateInput}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export function addDaysLocal(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function toIsoOrNull(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

export function normalizeMoneyDigits(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  return digits ? String(Number.parseInt(digits, 10)) : "0";
}

export function parseMoneyDigitsToDecimal(raw: string | null | undefined): Prisma.Decimal {
  if (!raw) return new Prisma.Decimal(0);
  const normalized = normalizeMoneyDigits(raw);
  return new Prisma.Decimal(normalized);
}

export function decimalToDigitsString(value: Prisma.Decimal | null | undefined): string | null {
  if (!value) return null;
  // UI currently treats values as integer-string.
  // We keep 0 decimals and avoid float conversion.
  return value.toFixed(0);
}

