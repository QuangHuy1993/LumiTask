"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { sessionService } from "@/lib/auth/session";
import type { FinanceCategoryListItemDTO } from "@/features/expenses/model/financeCategoryTypes";
import type { FinanceRecurringListItemDTO } from "@/features/expenses/model/financeRecurringTypes";
import {
  recurringCreateSchema,
  recurringIdSchema,
  recurringListFilterSchema,
  recurringToggleSchema,
  recurringUpdateSchema,
} from "@/features/expenses/model/financeRecurringValidation";
import type { FinanceWalletListItemDTO } from "@/features/expenses/model/financeWalletTypes";
import { financeCategoryService } from "@/features/expenses/services/financeCategoryService";
import { financeRecurringService } from "@/features/expenses/services/financeRecurringService";
import { financeWalletService } from "@/features/expenses/services/financeWalletService";

const REVALIDATE_PATHS = ["/expenses/recurring", "/expenses/entries", "/dashboard"];

type ActionError =
  | "UNAUTHENTICATED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "WALLET_INVALID"
  | "CATEGORY_INVALID"
  | "CURRENCY_MISMATCH"
  | "INACTIVE"
  | "DB_ERROR";

function revalidateRecurring() {
  REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
}

const RECURRING_PAGE_LIMIT = 200;

/**
 * Một lần gọi: tải quy tắc + ví + danh mục cho màn định kỳ.
 * Giảm số POST song song và bỏ COUNT khi không cần tổng số chính xác.
 */
export async function loadFinanceRecurringPageDataAction(): Promise<
  | {
      success: true;
      rules: FinanceRecurringListItemDTO[];
      wallets: FinanceWalletListItemDTO[];
      categories: FinanceCategoryListItemDTO[];
    }
  | { success: false; error: ActionError; message?: string }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const [rulesRes, walletsRes, categoriesRes] = await Promise.all([
      financeRecurringService.listPage(
        { ownerId: user.id, query: { limit: RECURRING_PAGE_LIMIT } },
        { skipTotalCount: true },
      ),
      financeWalletService.getListPage({
        ownerId: user.id,
        limit: RECURRING_PAGE_LIMIT,
        skipTotalCount: true,
      }),
      financeCategoryService.getListPage({
        ownerId: user.id,
        limit: RECURRING_PAGE_LIMIT,
        kind: "ALL",
        isActive: "ALL",
        skipTotalCount: true,
        skipEntryCount: true,
      }),
    ]);

    return {
      success: true,
      rules: rulesRes.items,
      wallets: walletsRes.items,
      categories: categoriesRes.items,
    };
  } catch (err) {
    console.error("[loadFinanceRecurringPageDataAction]", err);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function listFinanceRecurringRulesAction(queryInput?: unknown): Promise<
  | { success: true; items: FinanceRecurringListItemDTO[]; totalCount: number }
  | { success: false; error: ActionError; message?: string }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = recurringListFilterSchema.safeParse(queryInput ?? {});
    if (!parsed.success) {
      return { success: false, error: "VALIDATION_ERROR", message: "Dữ liệu không hợp lệ" };
    }

    const res = await financeRecurringService.listPage({ ownerId: user.id, query: parsed.data });
    return { success: true, items: res.items, totalCount: res.totalCount };
  } catch (err) {
    console.error("[listFinanceRecurringRulesAction]", err);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function createFinanceRecurringRuleAction(data: unknown) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" as const };

    const parsed = recurringCreateSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: "VALIDATION_ERROR" as const,
        message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      };
    }

    const nextRunAt = new Date(parsed.data.nextRunAt);
    if (Number.isNaN(nextRunAt.getTime())) {
      return { success: false, error: "VALIDATION_ERROR" as const, message: "Ngày giờ không hợp lệ" };
    }

    const res = await financeRecurringService.create({
      ownerId: user.id,
      data: parsed.data,
      nextRunAt,
      amount: new Prisma.Decimal(parsed.data.amount),
    });

    if (!res.ok) {
      const msg =
        res.error === "CURRENCY_MISMATCH"
          ? "Tiền tệ phải trùng với ví"
          : res.error === "WALLET_INVALID"
            ? "Ví không hợp lệ hoặc đã bị xóa"
            : res.error === "CATEGORY_INVALID"
              ? "Danh mục không hợp lệ hoặc không khớp loại thu/chi"
              : "Không thể tạo quy tắc";
      return { success: false, error: res.error, message: msg };
    }

    revalidateRecurring();
    return { success: true as const, id: res.id };
  } catch (err) {
    console.error("[createFinanceRecurringRuleAction]", err);
    return { success: false, error: "DB_ERROR" as const };
  }
}

export async function updateFinanceRecurringRuleAction(ruleId: number, data: unknown) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" as const };

    const parsed = recurringUpdateSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: "VALIDATION_ERROR" as const,
        message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      };
    }

    let nextRunAt: Date | undefined;
    if (parsed.data.nextRunAt !== undefined) {
      nextRunAt = new Date(parsed.data.nextRunAt);
      if (Number.isNaN(nextRunAt.getTime())) {
        return { success: false, error: "VALIDATION_ERROR" as const, message: "Ngày giờ không hợp lệ" };
      }
    }

    const amount =
      parsed.data.amount !== undefined ? new Prisma.Decimal(parsed.data.amount) : undefined;

    const res = await financeRecurringService.update({
      ownerId: user.id,
      ruleId,
      data: parsed.data,
      nextRunAt,
      amount,
    });

    if (!res.ok) {
      const msg =
        res.error === "NOT_FOUND"
          ? "Không tìm thấy quy tắc"
          : res.error === "CURRENCY_MISMATCH"
            ? "Tiền tệ phải trùng với ví"
            : res.error === "WALLET_INVALID"
              ? "Ví không hợp lệ hoặc đã bị xóa"
              : res.error === "CATEGORY_INVALID"
                ? "Danh mục không hợp lệ hoặc không khớp loại thu/chi"
                : "Không thể cập nhật";
      return { success: false, error: res.error, message: msg };
    }

    revalidateRecurring();
    return { success: true as const };
  } catch (err) {
    console.error("[updateFinanceRecurringRuleAction]", err);
    return { success: false, error: "DB_ERROR" as const };
  }
}

export async function deleteFinanceRecurringRuleAction(ruleId: number) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" as const };

    const res = await financeRecurringService.softDelete({ ownerId: user.id, ruleId });
    if (!res.ok) return { success: false, error: "NOT_FOUND" as const };

    revalidateRecurring();
    return { success: true as const };
  } catch (err) {
    console.error("[deleteFinanceRecurringRuleAction]", err);
    return { success: false, error: "DB_ERROR" as const };
  }
}

export async function toggleFinanceRecurringRuleAction(input: unknown) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" as const };

    const parsed = recurringToggleSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "VALIDATION_ERROR" as const, message: "Dữ liệu không hợp lệ" };
    }

    const res = await financeRecurringService.setActive({
      ownerId: user.id,
      ruleId: parsed.data.ruleId,
      isActive: parsed.data.isActive,
    });
    if (!res.ok) return { success: false, error: "NOT_FOUND" as const };

    revalidateRecurring();
    return { success: true as const };
  } catch (err) {
    console.error("[toggleFinanceRecurringRuleAction]", err);
    return { success: false, error: "DB_ERROR" as const };
  }
}

export async function runFinanceRecurringRuleAction(input: unknown) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" as const };

    const parsed = recurringIdSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "VALIDATION_ERROR" as const, message: "Dữ liệu không hợp lệ" };
    }

    const res = await financeRecurringService.runDueRule({
      ownerId: user.id,
      ruleId: parsed.data.ruleId,
    });

    if (!res.ok) {
      const msg =
        res.error === "NOT_FOUND"
          ? "Không tìm thấy quy tắc"
          : res.error === "INACTIVE"
            ? "Quy tắc đang tắt"
            : "Không thể chạy quy tắc";
      return { success: false, error: res.error, message: msg };
    }

    if (!res.ran) {
      return { success: true as const, ran: false as const, reason: "NOT_DUE" as const };
    }

    revalidateRecurring();
    return { success: true as const, ran: true as const, entryId: res.entryId };
  } catch (err) {
    console.error("[runFinanceRecurringRuleAction]", err);
    return { success: false, error: "DB_ERROR" as const };
  }
}

export async function runDueFinanceRecurringRulesAction() {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" as const };

    const summary = await financeRecurringService.runAllDueRulesForOwner(user.id);

    if (summary.stoppedReason === "ERROR") {
      return { success: false, error: "DB_ERROR" as const, message: "Có lỗi khi chạy quy tắc" };
    }

    if (summary.entriesCreated > 0) {
      revalidateRecurring();
    }

    return {
      success: true as const,
      entriesCreated: summary.entriesCreated,
      processedRules: summary.processedRules,
      stoppedReason: summary.stoppedReason,
    };
  } catch (err) {
    console.error("[runDueFinanceRecurringRulesAction]", err);
    return { success: false, error: "DB_ERROR" as const };
  }
}
