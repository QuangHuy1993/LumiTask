"use server";

import { revalidatePath } from "next/cache";

import { sessionService } from "@/lib/auth/session";
import type { ServiceCategoryListItemDTO } from "@/features/trading/model/categoryTypes";
import {
  serviceCategoryFilterSchema,
  serviceCategoryCreateSchema,
  serviceCategoryUpdateSchema,
} from "@/features/trading/model/tradingValidation";
import { serviceCategoryService } from "@/features/trading/services/serviceCategoryService";

type ActionError = "UNAUTHENTICATED" | "VALIDATION_ERROR" | "DB_ERROR" | "NOT_FOUND" | "DUPLICATE_SLUG";

export async function getCategoriesAction(queryInput?: unknown): Promise<
  | { success: true; items: ServiceCategoryListItemDTO[]; totalCount: number }
  | { success: false; error: ActionError; message?: string }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = serviceCategoryFilterSchema.safeParse(queryInput ?? {});
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR", message: "Dữ liệu không hợp lệ" };

    const res = await serviceCategoryService.getListPage({
      ownerId: user.id,
      limit: parsed.data.limit,
      search: parsed.data.search,
      isActive: parsed.data.isActive,
    });

    return { success: true, items: res.items, totalCount: res.totalCount };
  } catch (error) {
    console.error("Error [getCategoriesAction]:", error);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function createCategoryAction(
  input: unknown,
): Promise<{ success: true; item: ServiceCategoryListItemDTO } | { success: false; error: ActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = serviceCategoryCreateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

    const res = await serviceCategoryService.create({ ownerId: user.id, data: parsed.data });
    if (!res.ok) {
      return { success: false, error: res.error === "DUPLICATE_SLUG" ? "DUPLICATE_SLUG" : "DB_ERROR" };
    }

    revalidatePath("/trading/categories");
    return { success: true, item: res.item };
  } catch (error) {
    console.error("Error [createCategoryAction]:", error);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function updateCategoryAction(categoryId: number, input: unknown): Promise<{ success: true } | { success: false; error: ActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = serviceCategoryUpdateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

    const res = await serviceCategoryService.update({ ownerId: user.id, categoryId, data: parsed.data });
    if (!res.ok) {
      const mappedError: ActionError =
        res.error === "NOT_FOUND" ? "NOT_FOUND" : res.error === "DUPLICATE_SLUG" ? "DUPLICATE_SLUG" : "DB_ERROR";
      return { success: false, error: mappedError };
    }

    revalidatePath("/trading/categories");
    return { success: true };
  } catch (error) {
    console.error("Error [updateCategoryAction]:", error);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function deleteCategoryAction(categoryId: number): Promise<{ success: true } | { success: false; error: ActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const res = await serviceCategoryService.softDelete({ ownerId: user.id, categoryId });
    if (!res.ok) return { success: false, error: res.error };

    revalidatePath("/trading/categories");
    return { success: true };
  } catch (error) {
    console.error("Error [deleteCategoryAction]:", error);
    return { success: false, error: "DB_ERROR" };
  }
}

