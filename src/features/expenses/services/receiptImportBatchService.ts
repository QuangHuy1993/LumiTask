import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

import { Prisma } from "@prisma/client";

import { entryCreateSchema } from "@/features/expenses/model/financeEntryValidation";
import type { ReceiptImportDraft } from "@/features/expenses/model/receiptImportDraftValidation";
import { prisma } from "@/lib/db/prisma";

import { receiptOcrDraftService } from "./receiptOcrDraftService";
import { receiptOcrService } from "./receiptOcrService";

const IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type DraftRowPatch = {
  amount: string;
  occurredAt: string;
  note: string;
  currency: string;
  confidence: number;
  walletId: number | null;
  categoryId: number | null;
  mergeKey: string | null;
};

function normalizeFileName(fileName: string): string {
  const base = fileName.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
  if (base) return base.slice(0, 120);
  return "receipt.jpg";
}

function extForMime(type: string): string {
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  return ".jpg";
}

function moneyToNumber(maybeMoney: string): number {
  const n = Number.parseFloat(maybeMoney);
  if (!Number.isFinite(n)) return 0;
  return n;
}

type DraftMetadata = {
  source: "receipt_ocr";
  imagePath: string;
  imageMimeType: string;
  ocrText: string;
  ocrConfidence: number;
  extracted: ReceiptImportDraft["extracted"];
  rows: DraftRowPatch[];
  mismatch: {
    extractedTotal: number;
    rowsTotal: number;
    diff: number;
    hasMismatch: boolean;
  };
};

function toDraftRows(draft: ReceiptImportDraft): DraftRowPatch[] {
  return draft.rows.map((row) => ({
    amount: row.amount,
    occurredAt: row.occurredAt,
    note: row.note,
    currency: row.currency,
    confidence: row.confidence,
    walletId: null,
    categoryId: null,
    mergeKey: null,
  }));
}

function computeMismatch(extractedTotal: string, rows: DraftRowPatch[]) {
  const extracted = moneyToNumber(extractedTotal);
  const rowSum = rows.reduce((sum, row) => sum + moneyToNumber(row.amount), 0);
  const diff = Math.abs(extracted - rowSum);
  return {
    extractedTotal: extracted,
    rowsTotal: rowSum,
    diff,
    hasMismatch: extracted > 0 && diff > Math.max(extracted * 0.02, 2000),
  };
}

function metadataFromDraft(params: {
  imagePath: string;
  imageMimeType: string;
  ocrText: string;
  ocrConfidence: number;
  draft: ReceiptImportDraft;
}): DraftMetadata {
  const rows = toDraftRows(params.draft);
  return {
    source: "receipt_ocr",
    imagePath: params.imagePath,
    imageMimeType: params.imageMimeType,
    ocrText: params.ocrText,
    ocrConfidence: params.ocrConfidence,
    extracted: params.draft.extracted,
    rows,
    mismatch: computeMismatch(params.draft.extracted.totalAmount, rows),
  };
}

function parseDraftMetadata(meta: Prisma.JsonValue | null): DraftMetadata | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const val = meta as Partial<DraftMetadata>;
  if (!val.extracted || !Array.isArray(val.rows)) return null;
  return {
    source: "receipt_ocr",
    imagePath: String(val.imagePath ?? ""),
    imageMimeType: String(val.imageMimeType ?? ""),
    ocrText: String(val.ocrText ?? ""),
    ocrConfidence: Number(val.ocrConfidence ?? 0),
    extracted: val.extracted,
    rows: val.rows.map((row) => ({
      amount: String(row.amount ?? ""),
      occurredAt: String(row.occurredAt ?? ""),
      note: String(row.note ?? ""),
      currency: String(row.currency ?? "VND"),
      confidence: Number(row.confidence ?? 0),
      walletId: typeof row.walletId === "number" ? row.walletId : null,
      categoryId: typeof row.categoryId === "number" ? row.categoryId : null,
      mergeKey: row.mergeKey ? String(row.mergeKey) : null,
    })),
    mismatch: {
      extractedTotal: Number(val.mismatch?.extractedTotal ?? 0),
      rowsTotal: Number(val.mismatch?.rowsTotal ?? 0),
      diff: Number(val.mismatch?.diff ?? 0),
      hasMismatch: Boolean(val.mismatch?.hasMismatch),
    },
  };
}

async function saveImage(file: File): Promise<{ filePath: string; mimeType: string }> {
  const bytes = await file.arrayBuffer();
  const input = Buffer.from(bytes);
  const dir = path.join(process.cwd(), ".cache", "receipt-import");
  await mkdir(dir, { recursive: true });
  const ext = extForMime(file.type);
  const stamped = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${normalizeFileName(file.name)}`;
  const finalName = stamped.endsWith(ext) ? stamped : `${stamped}${ext}`;
  const filePath = path.join(dir, finalName);
  await writeFile(filePath, input);
  return { filePath, mimeType: file.type };
}

async function validateWalletForOwner(walletId: number, ownerId: number): Promise<boolean> {
  const wallet = await prisma.financeWallet.findFirst({
    where: { id: walletId, ownerId, deletedAt: null },
    select: { id: true },
  });
  return Boolean(wallet);
}

async function validateCategoryForOwner(categoryId: number, ownerId: number): Promise<boolean> {
  const category = await prisma.financeCategory.findFirst({
    where: { id: categoryId, ownerId, deletedAt: null, kind: "EXPENSE" },
    select: { id: true },
  });
  return Boolean(category);
}

function groupedRows(rows: DraftRowPatch[]): DraftRowPatch[] {
  const merged = new Map<string, DraftRowPatch>();
  const passThrough: DraftRowPatch[] = [];

  for (const row of rows) {
    if (!row.mergeKey) {
      passThrough.push(row);
      continue;
    }
    const prev = merged.get(row.mergeKey);
    if (!prev) {
      merged.set(row.mergeKey, { ...row });
      continue;
    }
    const nextAmount = moneyToNumber(prev.amount) + moneyToNumber(row.amount);
    prev.amount = String(nextAmount);
    prev.note = [prev.note, row.note].filter(Boolean).join(" | ").slice(0, 2000);
    if (!prev.occurredAt && row.occurredAt) prev.occurredAt = row.occurredAt;
    prev.confidence = Math.min(prev.confidence, row.confidence);
  }

  return [...passThrough, ...merged.values()];
}

export const receiptImportBatchService = {
  validateUpload(file: File): { ok: true } | { ok: false; message: string } {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return { ok: false, message: "Only JPEG/PNG/WEBP images are supported." };
    }
    if (file.size > IMAGE_MAX_BYTES) {
      return { ok: false, message: "Image exceeds max size 8MB." };
    }
    return { ok: true };
  },

  async createAndProcessBatch(
    ownerId: number,
    file: File
  ): Promise<{ batchId: number; filePath: string; mimeType: string }> {
    const saved = await saveImage(file);
    const created = await prisma.financeImportBatch.create({
      data: {
        ownerId,
        fileName: normalizeFileName(file.name),
        status: "PROCESSING",
        metadata: {
          source: "receipt_ocr",
          imagePath: saved.filePath,
          imageMimeType: saved.mimeType,
          extracted: {},
          rows: [],
        },
      },
      select: { id: true },
    });

    return { batchId: created.id, filePath: saved.filePath, mimeType: saved.mimeType };
  },

  async processBatch(batchId: number, ownerId: number, filePath: string, mimeType: string): Promise<void> {
    try {
      const image = await readFile(filePath);
      const ocr = await receiptOcrService.recognizeImage(image);
      const llm = await receiptOcrDraftService.extractDraftFromOcrText(ownerId, ocr.text);
      if (!llm.ok) {
        await prisma.financeImportBatch.update({
          where: { id: batchId },
          data: {
            status: "FAILED",
            errorSummary: llm.message,
            metadata: {
              source: "receipt_ocr",
              imagePath: filePath,
              imageMimeType: mimeType,
              ocrText: ocr.text,
              ocrConfidence: ocr.meanConfidence,
              extracted: {},
              rows: [],
            },
          },
        });
        return;
      }

      const metadata = metadataFromDraft({
        imagePath: filePath,
        imageMimeType: mimeType,
        ocrText: ocr.text,
        ocrConfidence: ocr.meanConfidence,
        draft: llm.data,
      });

      await prisma.financeImportBatch.update({
        where: { id: batchId },
        data: {
          status: "PENDING",
          rowCount: metadata.rows.length,
          metadata,
          errorSummary: null,
        },
      });
    } catch (err) {
      console.error("[receiptImportBatchService.processBatch]", err);
      await prisma.financeImportBatch.update({
        where: { id: batchId },
        data: {
          status: "FAILED",
          errorSummary: "OCR processing failed",
        },
      });
    }
  },

  async getBatch(ownerId: number, batchId: number) {
    const batch = await prisma.financeImportBatch.findFirst({
      where: { id: batchId, ownerId },
      select: {
        id: true,
        status: true,
        rowCount: true,
        errorSummary: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!batch) return null;
    const metadata = parseDraftMetadata(batch.metadata);
    return { ...batch, metadata };
  },

  async confirmBatch(
    ownerId: number,
    batchId: number,
    rows: DraftRowPatch[]
  ): Promise<{ ok: true; createdIds: number[] } | { ok: false; message: string }> {
    const batch = await prisma.financeImportBatch.findFirst({
      where: { id: batchId, ownerId },
      select: { id: true, status: true, metadata: true },
    });
    if (!batch) return { ok: false, message: "Import batch not found." };
    if (batch.status === "PROCESSING") return { ok: false, message: "Batch is still processing." };

    const validRows = groupedRows(rows).filter((row) => row.amount && row.occurredAt && row.walletId);
    if (validRows.length === 0) {
      return { ok: false, message: "No valid rows to import." };
    }

    for (const row of validRows) {
      if (!(await validateWalletForOwner(row.walletId!, ownerId))) {
        return { ok: false, message: "One or more wallets are invalid." };
      }
      if (row.categoryId && !(await validateCategoryForOwner(row.categoryId, ownerId))) {
        return { ok: false, message: "One or more categories are invalid." };
      }
    }

    const createdIds = await prisma.$transaction(async (tx) => {
      const ids: number[] = [];
      for (const row of validRows) {
        const parsed = entryCreateSchema.safeParse({
          walletId: row.walletId,
          categoryId: row.categoryId,
          entryKind: "EXPENSE",
          lifecycleStatus: "POSTED",
          amount: row.amount,
          currency: row.currency || "VND",
          occurredAt: row.occurredAt,
          note: row.note,
          importBatchId: batchId,
        });
        if (!parsed.success) continue;
        const created = await tx.financeEntry.create({
          data: {
            ownerId,
            walletId: parsed.data.walletId,
            categoryId: parsed.data.categoryId ?? null,
            entryKind: "EXPENSE",
            lifecycleStatus: "POSTED",
            amount: new Prisma.Decimal(parsed.data.amount),
            currency: parsed.data.currency,
            occurredAt: new Date(parsed.data.occurredAt),
            note: parsed.data.note || null,
            importBatchId: batchId,
          },
          select: { id: true },
        });
        ids.push(created.id);
      }

      const prevMeta = parseDraftMetadata(batch.metadata);
      await tx.financeImportBatch.update({
        where: { id: batchId },
        data: {
          status: ids.length > 0 ? "COMPLETED" : "FAILED",
          rowCount: ids.length,
          errorSummary: ids.length > 0 ? null : "No rows passed validation.",
          metadata: prevMeta ? { ...prevMeta, rows } : { rows },
        },
      });
      return ids;
    });

    if (createdIds.length === 0) return { ok: false, message: "No rows were created." };
    return { ok: true, createdIds };
  },
};
