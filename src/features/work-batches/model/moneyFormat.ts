import type { Prisma } from "@prisma/client";

type Decimalish = Prisma.Decimal | { toFixed: (digits: number) => string } | null | undefined;

function addThousandsSeparators(intPart: string) {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Format money safely without converting to JS number.
 * Assumes VND display with no fractional digits.
 */
export function formatMoneyVND(value: Decimalish): string {
  if (!value) return "0 ₫";
  const raw = value.toFixed(0);
  const sign = raw.startsWith("-") ? "-" : "";
  const unsigned = sign ? raw.slice(1) : raw;
  const formatted = addThousandsSeparators(unsigned);
  return `${sign}${formatted} ₫`;
}

