"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type {
  FinanceBudgetPeriodDetailDTO,
  FinanceBudgetPeriodListItemDTO,
} from "@/features/expenses/model/financeBudgetTypes";
import {
  financeBudgetUpsertSchema,
  financeBudgetPeriodKeySchema,
} from "@/features/expenses/model/financeBudgetValidation";
import { financeBudgetService } from "@/features/expenses/services/financeBudgetService";
import { sessionService } from "@/lib/auth/session";

const PATH_BUDGETS = "/expenses/budgets";
const PATH_DASHBOARD = "/expenses/dashboard";

const listPeriodsQuerySchema = z.object({
  year: z.number().int().min(2000).max(2100).optional(),
});

export type FinanceBudgetActionError =
  | "UNAUTHENTICATED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "INVALID_CATEGORY"
  | "DB_ERROR";

function revalidateBudgetPaths() {
  revalidatePath(PATH_BUDGETS);
  revalidatePath(PATH_DASHBOARD);
}

export async function listFinanceBudgetPeriodsAction(
  queryInput?: unknown,
): Promise<
  | { success: true; items: FinanceBudgetPeriodListItemDTO[] }
  | { success: false; error: FinanceBudgetActionError }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = listPeriodsQuerySchema.safeParse(queryInput ?? {});
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

    const items = await financeBudgetService.listPeriods(user.id, {
      year: parsed.data.year,
    });
    return { success: true, items };
  } catch (e) {
    console.error("[listFinanceBudgetPeriodsAction]", e);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function getFinanceBudgetPeriodDetailAction(
  periodId: number,
): Promise<
  | { success: true; detail: FinanceBudgetPeriodDetailDTO }
  | { success: false; error: FinanceBudgetActionError }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    if (!Number.isFinite(periodId) || periodId <= 0) {
      return { success: false, error: "VALIDATION_ERROR" };
    }

    const detail = await financeBudgetService.getPeriodDetail(user.id, periodId);
    if (!detail) return { success: false, error: "NOT_FOUND" };

    return { success: true, detail };
  } catch (e) {
    console.error("[getFinanceBudgetPeriodDetailAction]", e);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function getFinanceBudgetPeriodDetailByKeyAction(
  periodKeyInput: unknown,
): Promise<
  | { success: true; detail: FinanceBudgetPeriodDetailDTO | null }
  | { success: false; error: FinanceBudgetActionError }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = financeBudgetPeriodKeySchema.safeParse(periodKeyInput);
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

    const detail = await financeBudgetService.getPeriodDetailByKey(user.id, parsed.data);
    return { success: true, detail };
  } catch (e) {
    console.error("[getFinanceBudgetPeriodDetailByKeyAction]", e);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function upsertFinanceBudgetPeriodAction(
  input: unknown,
): Promise<
  | { success: true; id: number; created: boolean; detail: FinanceBudgetPeriodDetailDTO | null }
  | { success: false; error: FinanceBudgetActionError }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = financeBudgetUpsertSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

    const upsertResult = await financeBudgetService.upsertPeriodWithLines(user.id, parsed.data);
    if (!upsertResult.ok) {
      if (upsertResult.error === "INVALID_CATEGORY") return { success: false, error: "INVALID_CATEGORY" };
      return { success: false, error: "DB_ERROR" };
    }

    const detail = await financeBudgetService.getPeriodDetailByKey(
      user.id,
      parsed.data.periodKey,
    );

    revalidateBudgetPaths();
    return { success: true, id: upsertResult.id, created: upsertResult.created, detail };
  } catch (e) {
    console.error("[upsertFinanceBudgetPeriodAction]", e);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function deleteFinanceBudgetPeriodAction(
  periodId: number,
): Promise<{ success: true } | { success: false; error: FinanceBudgetActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    if (!Number.isFinite(periodId) || periodId <= 0) {
      return { success: false, error: "VALIDATION_ERROR" };
    }

    const res = await financeBudgetService.deletePeriod(user.id, periodId);
    if (!res.ok) {
      if (res.error === "NOT_FOUND") return { success: false, error: "NOT_FOUND" };
      return { success: false, error: "DB_ERROR" };
    }

    revalidateBudgetPaths();
    return { success: true };
  } catch (e) {
    console.error("[deleteFinanceBudgetPeriodAction]", e);
    return { success: false, error: "DB_ERROR" };
  }
}
