import {
  dashboardRangeQuerySchema,
  type DashboardRangeQueryInput,
} from "@/features/expenses/model/financeDashboardValidation";

function first(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

/** Parse query từ URL searchParams hoặc `Record` từ `page` searchParams. */
export function parseDashboardRangeFromSearchParams(
  sp: Record<string, string | string[] | undefined>,
): { success: true; data: DashboardRangeQueryInput } | { success: false; error: string } {
  const raw = {
    preset: first(sp.preset),
    from: first(sp.from),
    to: first(sp.to),
    tz: first(sp.tz),
    currency: first(sp.currency),
    granularity: first(sp.granularity),
    recentLimit: first(sp.recentLimit),
  };
  const parsed = dashboardRangeQuerySchema.safeParse(raw);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join("; ");
    return { success: false, error: msg || "VALIDATION_ERROR" };
  }
  return { success: true, data: parsed.data };
}

/** Fallback an toàn khi query lỗi (ví dụ thủ công sửa URL). */
export function dashboardQueryOrDefault(
  sp: Record<string, string | string[] | undefined>,
): DashboardRangeQueryInput {
  const parsed = parseDashboardRangeFromSearchParams(sp);
  if (parsed.success) return parsed.data;
  return dashboardRangeQuerySchema.parse({});
}
