import { randomUUID } from "crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

import {
  type ReceiptImportDraft,
  receiptImportDraftSchema,
} from "../model/receiptImportDraftValidation";

function moneyValidPositive(s: string): boolean {
  if (!/^\d+(\.\d+)?$/.test(s)) return false;
  return parseFloat(s) > 0;
}

export type CommitReceiptDraftError =
  | "INVALID_DRAFT"
  | "WALLET_NOT_FOUND"
  | "CATEGORY_INVALID"
  | "NO_VALID_ROWS"
  | "CREATE_FAILED";

export const financeImportService = {
  /**
   * Tạo FinanceImportBatch và các FinanceEntry EXPENSE từ draft đã phân tích (OCR → LLM).
   * Bỏ qua dòng thiếu amount hợp lệ hoặc occurredAt.
   */
  async commitReceiptDraft(
    ownerId: number,
    input: {
      walletId: number;
      categoryId?: number | null;
      draft: ReceiptImportDraft;
    }
  ): Promise<
    | { ok: true; batchId: number; createdIds: number[] }
    | { ok: false; error: CommitReceiptDraftError; message?: string }
  > {
    const draftParsed = receiptImportDraftSchema.safeParse(input.draft);
    if (!draftParsed.success) {
      return { ok: false, error: "INVALID_DRAFT", message: "Draft không hợp lệ" };
    }
    const draft = draftParsed.data;

    const wallet = await prisma.financeWallet.findFirst({
      where: { id: input.walletId, ownerId, deletedAt: null },
    });
    if (!wallet) {
      return { ok: false, error: "WALLET_NOT_FOUND", message: "Không tìm thấy ví" };
    }

    const categoryId: number | null = input.categoryId ?? null;
    if (categoryId != null) {
      const cat = await prisma.financeCategory.findFirst({
        where: { id: categoryId, ownerId, deletedAt: null, kind: "EXPENSE" },
      });
      if (!cat) {
        return { ok: false, error: "CATEGORY_INVALID", message: "Danh mục không hợp lệ" };
      }
    }

    const rows = draft.rows.filter((r) => moneyValidPositive(r.amount) && r.occurredAt !== "");
    if (rows.length === 0) {
      return {
        ok: false,
        error: "NO_VALID_ROWS",
        message: "Không có dòng nào có đủ số tiền và ngày hợp lệ",
      };
    }

    const splitGroupId = rows.length > 1 ? randomUUID() : null;

    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const batch = await tx.financeImportBatch.create({
          data: {
            ownerId,
            fileName: "receipt-ocr",
            status: "PROCESSING",
            metadata: {
              source: "receipt_ocr",
              merchantName: draft.extracted.merchantName,
              parseQuality: draft.extracted.parseQuality,
            },
          },
        });

        const createdIds: number[] = [];
        for (const row of rows) {
          const occurredAt = new Date(row.occurredAt);
          if (Number.isNaN(occurredAt.getTime())) continue;

          const created = await tx.financeEntry.create({
            data: {
              ownerId,
              walletId: input.walletId,
              categoryId,
              entryKind: "EXPENSE",
              lifecycleStatus: "POSTED",
              amount: new Prisma.Decimal(row.amount),
              currency: row.currency || draft.extracted.currency,
              occurredAt,
              note: row.note || null,
              importBatchId: batch.id,
              ...(splitGroupId ? { splitGroupId } : {}),
            },
            select: { id: true },
          });
          createdIds.push(created.id);
        }

        await tx.financeImportBatch.update({
          where: { id: batch.id },
          data: {
            status: createdIds.length > 0 ? "COMPLETED" : "FAILED",
            rowCount: createdIds.length,
            errorSummary: createdIds.length === 0 ? "Không tạo được giao dịch" : null,
          },
        });

        return { batchId: batch.id, createdIds };
      });

      if (outcome.createdIds.length === 0) {
        return { ok: false, error: "CREATE_FAILED", message: "Không tạo được giao dịch" };
      }

      return { ok: true, batchId: outcome.batchId, createdIds: outcome.createdIds };
    } catch (err) {
      console.error("[financeImportService.commitReceiptDraft]", err);
      return { ok: false, error: "CREATE_FAILED", message: "Lỗi khi ghi CSDL" };
    }
  },
};
