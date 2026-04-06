"use server";

import { revalidatePath } from "next/cache";

import { sessionService } from "@/lib/auth/session";
import type { SavingsGoalDetailDTO, SavingsGoalListItemDTO } from "@/features/expenses/model/financeSavingsGoalTypes";
import {
  contributeToGoalSchema,
  savingsGoalCreateSchema,
  savingsGoalUpdateSchema,
} from "@/features/expenses/model/financeSavingsGoalValidation";
import { financeSavingsGoalService } from "@/features/expenses/services/financeSavingsGoalService";

const PATH_GOALS = "/expenses/goals";
const PATH_ENTRIES = "/expenses/entries";

export type FinanceSavingsGoalActionError =
  | "UNAUTHENTICATED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "GOAL_NOT_FOUND"
  | "WALLET_NOT_FOUND"
  | "CATEGORY_NOT_FOUND"
  | "CATEGORY_KIND_MISMATCH"
  | "CONTRIBUTION_NOT_FOUND"
  | "DB_ERROR";

function revalidateGoalsAndEntries() {
  revalidatePath(PATH_GOALS);
  revalidatePath(PATH_ENTRIES);
}

export async function listGoalsAction(): Promise<
  | { success: true; items: SavingsGoalListItemDTO[] }
  | { success: false; error: FinanceSavingsGoalActionError }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const items = await financeSavingsGoalService.getList(user.id);
    return { success: true, items };
  } catch (e) {
    console.error("[listGoalsAction]", e);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function getGoalDetailAction(goalId: number): Promise<
  | { success: true; detail: SavingsGoalDetailDTO }
  | { success: false; error: FinanceSavingsGoalActionError }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const detail = await financeSavingsGoalService.getDetail(user.id, goalId);
    if (!detail) return { success: false, error: "NOT_FOUND" };

    return { success: true, detail };
  } catch (e) {
    console.error("[getGoalDetailAction]", e);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function createGoalAction(
  input: unknown,
): Promise<{ success: true; id: number } | { success: false; error: FinanceSavingsGoalActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = savingsGoalCreateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

    const res = await financeSavingsGoalService.create(user.id, parsed.data);
    if (!res.ok) return { success: false, error: "DB_ERROR" };

    revalidatePath(PATH_GOALS);
    return { success: true, id: res.id };
  } catch (e) {
    console.error("[createGoalAction]", e);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function updateGoalAction(
  goalId: number,
  input: unknown,
): Promise<{ success: true } | { success: false; error: FinanceSavingsGoalActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = savingsGoalUpdateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

    const res = await financeSavingsGoalService.update(user.id, goalId, parsed.data);
    if (!res.ok) {
      return { success: false, error: res.error === "NOT_FOUND" ? "NOT_FOUND" : "DB_ERROR" };
    }

    revalidatePath(PATH_GOALS);
    return { success: true };
  } catch (e) {
    console.error("[updateGoalAction]", e);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function deleteGoalAction(
  goalId: number,
): Promise<{ success: true } | { success: false; error: FinanceSavingsGoalActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const res = await financeSavingsGoalService.softDelete(user.id, goalId);
    if (!res.ok) {
      return { success: false, error: res.error === "NOT_FOUND" ? "NOT_FOUND" : "DB_ERROR" };
    }

    revalidatePath(PATH_GOALS);
    return { success: true };
  } catch (e) {
    console.error("[deleteGoalAction]", e);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function contributeToGoalAction(
  input: unknown,
): Promise<{ success: true } | { success: false; error: FinanceSavingsGoalActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = contributeToGoalSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

    const res = await financeSavingsGoalService.contribute(user.id, parsed.data);
    if (!res.ok) {
      const map: Record<string, FinanceSavingsGoalActionError> = {
        GOAL_NOT_FOUND: "GOAL_NOT_FOUND",
        WALLET_NOT_FOUND: "WALLET_NOT_FOUND",
        CATEGORY_NOT_FOUND: "CATEGORY_NOT_FOUND",
        CATEGORY_KIND_MISMATCH: "CATEGORY_KIND_MISMATCH",
        NOT_FOUND: "NOT_FOUND",
        DB_ERROR: "DB_ERROR",
        CONTRIBUTION_NOT_FOUND: "CONTRIBUTION_NOT_FOUND",
      };
      return { success: false, error: map[res.error] ?? "DB_ERROR" };
    }

    revalidateGoalsAndEntries();
    return { success: true };
  } catch (e) {
    console.error("[contributeToGoalAction]", e);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function deleteContributionAction(
  contributionId: number,
): Promise<{ success: true } | { success: false; error: FinanceSavingsGoalActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const res = await financeSavingsGoalService.deleteContribution(user.id, contributionId);
    if (!res.ok) {
      return {
        success: false,
        error:
          res.error === "CONTRIBUTION_NOT_FOUND"
            ? "CONTRIBUTION_NOT_FOUND"
            : res.error === "DB_ERROR"
              ? "DB_ERROR"
              : "DB_ERROR",
      };
    }

    revalidateGoalsAndEntries();
    return { success: true };
  } catch (e) {
    console.error("[deleteContributionAction]", e);
    return { success: false, error: "DB_ERROR" };
  }
}
