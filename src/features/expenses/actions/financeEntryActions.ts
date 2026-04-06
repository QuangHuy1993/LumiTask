"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type FinanceEntryLifecycle } from "@prisma/client";
import { sessionService } from "@/lib/auth/session";
import { financeEntryService } from "../services/financeEntryService";
import {
  entryFilterSchema,
  entryCreateSchema,
  entryUpdateSchema,
  monthOverviewSchema,
  monthAndEntriesSchema,
  transferCreateSchema,
} from "../model/financeEntryValidation";

const REVALIDATE_PATHS = ["/expenses/entries", "/expenses/dashboard", "/dashboard", "/payment-gen"];

export async function getMonthOverviewAction(query?: unknown) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" } as const;

    const parsed = monthOverviewSchema.safeParse(query ?? {});
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" } as const;

    const res = await financeEntryService.getMonthOverview(user.id, parsed.data);
    return { success: true, data: res } as const;
  } catch (err) {
    console.error("[getMonthOverviewAction]", err);
    return { success: false, error: "DB_ERROR" } as const;
  }
}

// ── Đọc danh sách ─────────────────────────────────────────────────────────────
export async function getEntriesAction(query?: unknown) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" } as const;

    const parsed = entryFilterSchema.safeParse(query ?? {});
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" } as const;

    const res = await financeEntryService.getListPage(user.id, parsed.data);
    return { success: true, ...res } as const;
  } catch (err) {
    console.error("[getEntriesAction]", err);
    return { success: false, error: "DB_ERROR" } as const;
  }
}

/** Lite: chỉ dùng cho drawer chi tiết danh mục theo tháng (nhanh hơn getEntriesAction) */
export async function getCategoryMonthEntriesLiteAction(query?: unknown) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" } as const;

    const parsed = entryFilterSchema.safeParse(query ?? {});
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" } as const;
    if (!parsed.data.periodKey || !parsed.data.categoryId) {
      return { success: false, error: "VALIDATION_ERROR" } as const;
    }

    const res = await financeEntryService.getCategoryMonthExpensePostedPageLite(user.id, {
      periodKey: parsed.data.periodKey,
      categoryId: parsed.data.categoryId,
      limit: parsed.data.limit ?? 20,
      cursorId: parsed.data.cursorId,
    });

    return {
      success: true,
      items: res.items,
      nextCursorId: res.nextCursorId,
      entryCount: res.entryCount,
      totalExpense: res.totalExpense,
    } as const;
  } catch (err) {
    console.error("[getCategoryMonthEntriesLiteAction]", err);
    return { success: false, error: "DB_ERROR" } as const;
  }
}

/** Một round-trip: tổng quan tháng + danh sách giao dịch (sau CRUD) */
export async function getMonthAndEntriesAction(input?: unknown) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" } as const;

    const parsed = monthAndEntriesSchema.safeParse(input ?? {});
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" } as const;

    const [monthOverview, listPage] = await Promise.all([
      financeEntryService.getMonthOverview(user.id, {
        periodKey: parsed.data.periodKey,
        timezone: parsed.data.timezone,
      }),
      financeEntryService.getListPage(user.id, {
        limit: parsed.data.limit,
        cursorId: parsed.data.cursorId,
        sortKey: parsed.data.sortKey,
        dateFrom: parsed.data.dateFrom,
        dateTo: parsed.data.dateTo,
      }),
    ]);

    return {
      success: true,
      monthOverview,
      items: listPage.items,
      stats: listPage.stats,
      nextCursorId: listPage.nextCursorId,
    } as const;
  } catch (err) {
    console.error("[getMonthAndEntriesAction]", err);
    return { success: false, error: "DB_ERROR" } as const;
  }
}

// ── Tạo giao dịch thu/chi ────────────────────────────────────────────────────
export async function createEntryAction(input: unknown) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" } as const;

    const parsed = entryCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Lỗi xác thực" } as const;
    }

    const occurredAt = new Date(parsed.data.occurredAt);
    if (isNaN(occurredAt.getTime())) return { success: false, error: "Ngày không hợp lệ" } as const;

    const res = await financeEntryService.create(user.id, {
      walletId: parsed.data.walletId,
      categoryId: parsed.data.categoryId ?? null,
      entryKind: parsed.data.entryKind as "INCOME" | "EXPENSE",
      lifecycleStatus: parsed.data.lifecycleStatus as FinanceEntryLifecycle,
      amount: new Prisma.Decimal(parsed.data.amount),
      currency: parsed.data.currency,
      occurredAt,
      note: parsed.data.note || null,
      tagIds: parsed.data.tagIds,
      importBatchId: parsed.data.importBatchId,
      splitGroupId: parsed.data.splitGroupId,
    });

    if (!res.ok) return { success: false, error: "Lỗi hệ thống" } as const;

    REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
    return { success: true, data: { id: res.id } } as const;
  } catch (err) {
    console.error("[createEntryAction]", err);
    return { success: false, error: "DB_ERROR" } as const;
  }
}

// ── Tạo chuyển khoản ─────────────────────────────────────────────────────────
export async function createTransferAction(input: unknown) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" } as const;

    const parsed = transferCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Lỗi xác thực" } as const;
    }

    const occurredAt = new Date(parsed.data.occurredAt);
    if (isNaN(occurredAt.getTime())) return { success: false, error: "Ngày không hợp lệ" } as const;

    const res = await financeEntryService.createTransfer(user.id, {
      fromWalletId: parsed.data.fromWalletId,
      toWalletId: parsed.data.toWalletId,
      amount: new Prisma.Decimal(parsed.data.amount),
      occurredAt,
      note: parsed.data.note || null,
    });

    if (!res.ok) return { success: false, error: "Lỗi hệ thống" } as const;

    REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
    return { success: true } as const;
  } catch (err) {
    console.error("[createTransferAction]", err);
    return { success: false, error: "DB_ERROR" } as const;
  }
}

// ── Cập nhật giao dịch ────────────────────────────────────────────────────────
export async function updateEntryAction(entryId: number, input: unknown) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" } as const;

    const parsed = entryUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Lỗi xác thực" } as const;
    }

    const occurredAt = parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : undefined;
    const res = await financeEntryService.update(user.id, entryId, {
      walletId: parsed.data.walletId,
      categoryId: parsed.data.categoryId,
      lifecycleStatus: parsed.data.lifecycleStatus as FinanceEntryLifecycle | undefined,
      amount: parsed.data.amount ? new Prisma.Decimal(parsed.data.amount) : undefined,
      currency: parsed.data.currency,
      occurredAt,
      note: parsed.data.note !== undefined ? (parsed.data.note || null) : undefined,
      tagIds: parsed.data.tagIds,
    });

    if (!res.ok) return { success: false, error: res.error } as const;

    REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
    return { success: true } as const;
  } catch (err) {
    console.error("[updateEntryAction]", err);
    return { success: false, error: "DB_ERROR" } as const;
  }
}

// ── Xóa giao dịch ─────────────────────────────────────────────────────────────
export async function deleteEntryAction(entryId: number) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" } as const;

    const res = await financeEntryService.softDelete(user.id, entryId);
    if (!res.ok) return { success: false, error: res.error } as const;

    REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
    return { success: true } as const;
  } catch (err) {
    console.error("[deleteEntryAction]", err);
    return { success: false, error: "DB_ERROR" } as const;
  }
}
