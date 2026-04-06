"use server";

import { revalidatePath } from "next/cache";

import { sessionService } from "@/lib/auth/session";
import type { FinanceCategoryListItemDTO } from "@/features/expenses/model/financeCategoryTypes";
import {
  financeCategoryFilterSchema,
  financeCategoryCreateSchema,
  financeCategoryUpdateSchema,
} from "@/features/expenses/model/financeCategoryValidation";
import { financeCategoryService } from "@/features/expenses/services/financeCategoryService";

export type FinanceCategoryActionError =
  | "UNAUTHENTICATED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "DUPLICATE_SLUG"
  | "KIND_CHANGE_BLOCKED"
  | "DB_ERROR";

export async function listFinanceCategoriesAction(queryInput?: unknown): Promise<
  | { success: true; items: FinanceCategoryListItemDTO[]; totalCount: number }
  | { success: false; error: FinanceCategoryActionError; message?: string }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = financeCategoryFilterSchema.safeParse(queryInput ?? {});
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR", message: "Dữ liệu không hợp lệ" };

    const res = await financeCategoryService.getListPage({
      ownerId: user.id,
      limit: parsed.data.limit,
      search: parsed.data.search,
      kind: parsed.data.kind,
      isActive: parsed.data.isActive,
    });

    return { success: true, items: res.items, totalCount: res.totalCount };
  } catch (error) {
    console.error("[listFinanceCategoriesAction]", error);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function createFinanceCategoryAction(
  input: unknown,
): Promise<
  | { success: true; item: FinanceCategoryListItemDTO }
  | { success: false; error: FinanceCategoryActionError }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = financeCategoryCreateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

    const res = await financeCategoryService.create({ ownerId: user.id, data: parsed.data });
    if (!res.ok) {
      return { success: false, error: res.error === "DUPLICATE_SLUG" ? "DUPLICATE_SLUG" : "DB_ERROR" };
    }

    revalidatePath("/expenses/categories");
    return { success: true, item: res.item };
  } catch (error) {
    console.error("[createFinanceCategoryAction]", error);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function updateFinanceCategoryAction(
  categoryId: number,
  input: unknown,
): Promise<{ success: true } | { success: false; error: FinanceCategoryActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = financeCategoryUpdateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

    const res = await financeCategoryService.update({ ownerId: user.id, categoryId, data: parsed.data });
    if (!res.ok) {
      const mappedError: FinanceCategoryActionError =
        res.error === "NOT_FOUND"
          ? "NOT_FOUND"
          : res.error === "DUPLICATE_SLUG"
            ? "DUPLICATE_SLUG"
            : res.error === "KIND_CHANGE_BLOCKED"
              ? "KIND_CHANGE_BLOCKED"
              : "DB_ERROR";
      return { success: false, error: mappedError };
    }

    revalidatePath("/expenses/categories");
    return { success: true };
  } catch (error) {
    console.error("[updateFinanceCategoryAction]", error);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function deleteFinanceCategoryAction(
  categoryId: number,
): Promise<{ success: true } | { success: false; error: FinanceCategoryActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const res = await financeCategoryService.softDelete({ ownerId: user.id, categoryId });
    if (!res.ok) return { success: false, error: res.error };

    revalidatePath("/expenses/categories");
    return { success: true };
  } catch (error) {
    console.error("[deleteFinanceCategoryAction]", error);
    return { success: false, error: "DB_ERROR" };
  }
}
