"use server";

import { revalidatePath } from "next/cache";

import { sessionService } from "@/lib/auth/session";
import type { FinanceWalletListItemDTO } from "@/features/expenses/model/financeWalletTypes";
import { walletCreateSchema, walletFilterSchema, walletUpdateSchema } from "@/features/expenses/model/financeWalletValidation";
import { financeWalletService } from "@/features/expenses/services/financeWalletService";

const REVALIDATE_PATH = "/expenses/wallets";

type ActionError = "UNAUTHENTICATED" | "VALIDATION_ERROR" | "NOT_FOUND" | "DB_ERROR";

export async function listWalletsAction(queryInput?: unknown): Promise<
  | { success: true; items: FinanceWalletListItemDTO[]; totalCount: number }
  | { success: false; error: ActionError; message?: string }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = walletFilterSchema.safeParse(queryInput ?? {});
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR", message: "Dữ liệu không hợp lệ" };

    const res = await financeWalletService.getListPage({
      ownerId: user.id,
      limit: parsed.data.limit,
      search: parsed.data.search,
    });
    return { success: true, items: res.items, totalCount: res.totalCount };
  } catch (err) {
    console.error("[listWalletsAction]", err);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function createWalletAction(data: unknown) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" as const };

    const parsed = walletCreateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "VALIDATION_ERROR" as const, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
    }

    await financeWalletService.create({ ownerId: user.id, data: parsed.data });
    revalidatePath(REVALIDATE_PATH);
    revalidatePath("/expenses/entries"); // Revalidate entries too as it uses wallets
    return { success: true };
  } catch (err) {
    console.error("[createWalletAction]", err);
    return { success: false, error: "DB_ERROR" as const };
  }
}

export async function updateWalletAction(walletId: number, data: unknown) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" as const };

    const parsed = walletUpdateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: "VALIDATION_ERROR" as const, message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" };
    }

    const res = await financeWalletService.update({ ownerId: user.id, walletId, data: parsed.data });
    if (!res.ok) return { success: false, error: res.error === "NOT_FOUND" ? ("NOT_FOUND" as const) : ("DB_ERROR" as const) };

    revalidatePath(REVALIDATE_PATH);
    revalidatePath("/expenses/entries");
    return { success: true };
  } catch (err) {
    console.error("[updateWalletAction]", err);
    return { success: false, error: "DB_ERROR" as const };
  }
}

export async function deleteWalletAction(walletId: number) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" as const };

    const res = await financeWalletService.softDelete({ ownerId: user.id, walletId });
    if (!res.ok) return { success: false, error: res.error === "NOT_FOUND" ? ("NOT_FOUND" as const) : ("DB_ERROR" as const) };

    revalidatePath(REVALIDATE_PATH);
    revalidatePath("/expenses/entries");
    return { success: true };
  } catch (err) {
    console.error("[deleteWalletAction]", err);
    return { success: false, error: "DB_ERROR" as const };
  }
}
