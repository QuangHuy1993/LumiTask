"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { sessionService } from "@/lib/auth/session";

import { receiptImportDraftSchema } from "../model/receiptImportDraftValidation";
import { financeImportService } from "../services/financeImportService";

const commitReceiptDraftInputSchema = z.object({
  walletId: z.number().int().positive(),
  categoryId: z.number().int().positive().nullable().optional(),
  draft: receiptImportDraftSchema,
});

const REVALIDATE_PATHS = ["/expenses/entries", "/expenses/dashboard", "/expenses/import", "/dashboard"];

export async function commitReceiptDraftAction(input: unknown) {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" } as const;

    const parsed = commitReceiptDraftInputSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "VALIDATION_ERROR" } as const;
    }

    const res = await financeImportService.commitReceiptDraft(user.id, parsed.data);
    if (!res.ok) {
      return { success: false, error: res.error, message: res.message } as const;
    }

    REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
    return {
      success: true as const,
      data: { batchId: res.batchId, createdIds: res.createdIds },
    };
  } catch (err) {
    console.error("[commitReceiptDraftAction]", err);
    return { success: false, error: "DB_ERROR" } as const;
  }
}
