"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sessionService } from "@/lib/auth/session";

import { financeLoanService } from "@/features/expenses/services/financeLoanService";
import type { FinanceLoanDetailDTO, FinanceLoanListItemDTO, FinanceLoanStatsDTO } from "@/features/expenses/model/financeLoanTypes";
import {
  financeLoanCreateSchema,
  financeLoanRepaySchema,
  financeLoanUpdateSchema,
} from "@/features/expenses/model/financeLoanValidation";

const REVALIDATE_LOANS = "/expenses/loans";
// /dashboard (admin) đang lấy dữ liệu chủ yếu từ jobs, không phụ thuộc trực tiếp finance loans/payments.
// Revalidate không cần thiết có thể làm chậm phản hồi khi người dùng bấm "Xác nhận".
const REVALIDATE_ENTRY_IMPACT_PATHS = ["/expenses/entries"];

type FinanceLoanActionError =
  | "UNAUTHENTICATED"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "LOAN_CLOSED"
  | "WALLET_NOT_FOUND"
  | "CATEGORY_NOT_FOUND"
  | "CATEGORY_KIND_MISMATCH"
  | "DB_ERROR";

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().trim().optional(),
  direction: z.union([z.literal("ALL"), z.enum(["BORROWED", "LENT"])]).optional(),
  status: z.union([z.literal("ALL"), z.enum(["ACTIVE", "CLOSED"])]).optional(),
});

export async function getLoanStatsAction(): Promise<
  | { success: true; data: FinanceLoanStatsDTO }
  | { success: false; error: FinanceLoanActionError }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };
    const data = await financeLoanService.getStats(user.id);
    return { success: true, data };
  } catch (err) {
    console.error("[getLoanStatsAction]", err);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function listLoansAction(queryInput?: unknown): Promise<
  | { success: true; items: FinanceLoanListItemDTO[]; totalCount: number }
  | { success: false; error: FinanceLoanActionError; message?: string }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = listQuerySchema.safeParse(queryInput ?? {});
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR", message: "Dữ liệu không hợp lệ" };

    const res = await financeLoanService.listLoans({
      ownerId: user.id,
      limit: parsed.data.limit,
      search: parsed.data.search,
      direction: parsed.data.direction ?? "ALL",
      status: parsed.data.status ?? "ALL",
    });

    return { success: true, items: res.items, totalCount: res.totalCount };
  } catch (err) {
    console.error("[listLoansAction]", err);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function getLoanDetailAction(loanId: number): Promise<
  | { success: true; data: FinanceLoanDetailDTO }
  | { success: false; error: FinanceLoanActionError }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    if (!loanId || loanId <= 0) return { success: false, error: "VALIDATION_ERROR" };

    const data = await financeLoanService.getLoanDetail(user.id, loanId);
    if (!data) return { success: false, error: "NOT_FOUND" };
    return { success: true, data };
  } catch (err) {
    console.error("[getLoanDetailAction]", err);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function createLoanAction(input: unknown): Promise<
  | { success: true; item: FinanceLoanListItemDTO }
  | { success: false; error: FinanceLoanActionError; message?: string }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = financeLoanCreateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      };
    }

    const res = await financeLoanService.createLoan(user.id, parsed.data);
    if (!res.ok) return { success: false, error: res.error };

    revalidatePath(REVALIDATE_LOANS);
    REVALIDATE_ENTRY_IMPACT_PATHS.forEach((p) => revalidatePath(p));

    return { success: true, item: res.item };
  } catch (err) {
    console.error("[createLoanAction]", err);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function updateLoanAction(loanId: number, input: unknown): Promise<
  | { success: true }
  | { success: false; error: FinanceLoanActionError; message?: string }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = financeLoanUpdateSchema.safeParse(input);
    if (!parsed.success)
      return {
        success: false,
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ",
      };

    const res = await financeLoanService.updateLoan(user.id, loanId, parsed.data);
    if (!res.ok) return { success: false, error: res.error };

    revalidatePath(REVALIDATE_LOANS);
    REVALIDATE_ENTRY_IMPACT_PATHS.forEach((p) => revalidatePath(p));

    return { success: true };
  } catch (err) {
    console.error("[updateLoanAction]", err);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function deleteLoanAction(loanId: number): Promise<
  | { success: true }
  | { success: false; error: FinanceLoanActionError }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const res = await financeLoanService.softDeleteLoan(user.id, loanId);
    if (!res.ok) return { success: false, error: res.error };

    revalidatePath("/expenses/entries");
    return { success: true };
  } catch (err) {
    console.error("[deleteLoanAction]", err);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function recordPaymentAction(input: unknown): Promise<
  | { success: true; remainingAmountAfter: number; statusAfter: "ACTIVE" | "CLOSED"; loanId: number }
  | { success: false; error: FinanceLoanActionError }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = financeLoanRepaySchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

    const res = await financeLoanService.recordPayment(user.id, parsed.data);
    if (!res.ok) return { success: false, error: res.error };

    revalidatePath(REVALIDATE_LOANS);
    REVALIDATE_ENTRY_IMPACT_PATHS.forEach((p) => revalidatePath(p));

    return {
      success: true,
      remainingAmountAfter: res.remainingAmountAfter,
      statusAfter: res.statusAfter,
      loanId: res.loanId,
    };
  } catch (err) {
    console.error("[recordPaymentAction]", err);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function deletePaymentAction(paymentId: number): Promise<
  | { success: true; remainingAmountAfter: number; statusAfter: "ACTIVE" | "CLOSED" }
  | { success: false; error: FinanceLoanActionError }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const res = await financeLoanService.softDeletePayment(user.id, paymentId);
    if (!res.ok) return { success: false, error: res.error };

    revalidatePath(REVALIDATE_LOANS);
    REVALIDATE_ENTRY_IMPACT_PATHS.forEach((p) => revalidatePath(p));

    return {
      success: true,
      remainingAmountAfter: res.remainingAmountAfter,
      statusAfter: res.statusAfter,
    };
  } catch (err) {
    console.error("[deletePaymentAction]", err);
    return { success: false, error: "DB_ERROR" };
  }
}

