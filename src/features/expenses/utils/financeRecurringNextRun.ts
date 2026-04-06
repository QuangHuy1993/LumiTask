import { addDays, addMonths, addWeeks, addYears } from "date-fns";

import type { FinanceRecurringFrequency } from "@prisma/client";

/**
 * Mốc chạy kế tiếp sau `from` theo frequency + interval (mỗi lần sinh entry advance một bước).
 */
export function computeNextRecurringRunAt(
  from: Date,
  frequency: FinanceRecurringFrequency,
  interval: number,
): Date {
  const n = Math.max(1, interval);
  switch (frequency) {
    case "DAILY":
      return addDays(from, n);
    case "WEEKLY":
      return addWeeks(from, n);
    case "MONTHLY":
      return addMonths(from, n);
    case "YEARLY":
      return addYears(from, n);
    default: {
      const _exhaustive: never = frequency;
      return _exhaustive;
    }
  }
}
