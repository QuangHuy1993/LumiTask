"use server";

import { sessionService } from "@/lib/auth/session";
import { financeDashboardService } from "../services/financeDashboardService";
import { dashboardRangeQuerySchema } from "../model/financeDashboardValidation";

export async function getExpensesDashboardBundleAction(query?: unknown) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" } as const;

    const parsed = dashboardRangeQuerySchema.safeParse(query ?? {});
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" } as const;

    const data = await financeDashboardService.getDashboardBundle(user.id, parsed.data);
    return { success: true, data } as const;
  } catch (err) {
    console.error("[getExpensesDashboardBundleAction]", err);
    return { success: false, error: "DB_ERROR" } as const;
  }
}

export async function getExpensesDashboardSummaryAction(query?: unknown) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" } as const;
    const parsed = dashboardRangeQuerySchema.safeParse(query ?? {});
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" } as const;
    const data = await financeDashboardService.getSummary(user.id, parsed.data);
    return { success: true, data } as const;
  } catch (err) {
    console.error("[getExpensesDashboardSummaryAction]", err);
    return { success: false, error: "DB_ERROR" } as const;
  }
}
