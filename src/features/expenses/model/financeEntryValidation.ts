import { z } from "zod";
import type { FinanceEntryLifecycle } from "@prisma/client";

import type { FinanceEntryKind } from "@/features/expenses/model/financeEntryKind";

const moneyString = z
  .string().trim()
  .regex(/^\d+(\.\d+)?$/, "Số tiền không hợp lệ")
  .refine((v) => parseFloat(v) > 0, "Số tiền phải lớn hơn 0");

export const entryFilterSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  cursorId: z.number().int().positive().optional(),
  search: z.string().trim().optional(),
  sortKey: z.enum(["NEWEST","OLDEST","AMOUNT_DESC","AMOUNT_ASC"]).default("NEWEST"),
  walletId: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  entryKind: z.union([z.literal("ALL"), z.custom<FinanceEntryKind>()]).optional(),
  lifecycleStatus: z.union([z.literal("ALL"), z.custom<FinanceEntryLifecycle>()]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  periodKey: z.string().regex(/^\d{4}-\d{2}$/).optional(),
});

export const monthOverviewSchema = z.object({
  periodKey: z.string().regex(/^\d{4}-\d{2}$/, "periodKey phải có dạng YYYY-MM"),
  timezone: z.string().trim().min(1).optional(),
});

/** Gộp tổng quan tháng + danh sách giao dịch (một lần auth) */
export const monthAndEntriesSchema = z.object({
  periodKey: z.string().regex(/^\d{4}-\d{2}$/),
  timezone: z.string().trim().min(1).optional(),
  limit: z.number().int().min(1).max(50).default(50),
  cursorId: z.number().int().positive().optional(),
  sortKey: z.enum(["NEWEST", "OLDEST", "AMOUNT_DESC", "AMOUNT_ASC"]).default("NEWEST"),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const entryCreateSchema = z.object({
  walletId: z.number().int().positive("Vui lòng chọn ví"),
  categoryId: z.number().int().positive().nullable().optional(),
  entryKind: z.custom<FinanceEntryKind>(),
  lifecycleStatus: z.custom<FinanceEntryLifecycle>().default("POSTED"),
  amount: moneyString,
  currency: z.string().length(3).default("VND"),
  occurredAt: z.string().min(1, "Vui lòng chọn ngày"),
  note: z.string().max(2000).optional().or(z.literal("")),
  tagIds: z.array(z.number().int().positive()).optional(),
  importBatchId: z.number().int().positive().optional(),
  splitGroupId: z.string().uuid().optional(),
});

export const entryUpdateSchema = entryCreateSchema.partial().extend({
  walletId: z.number().int().positive().optional(),
});

export const transferCreateSchema = z.object({
  fromWalletId: z.number().int().positive("Vui lòng chọn ví nguồn"),
  toWalletId: z.number().int().positive("Vui lòng chọn ví đích"),
  amount: moneyString,
  occurredAt: z.string().min(1, "Vui lòng chọn ngày"),
  note: z.string().max(2000).optional().or(z.literal("")),
}).refine((d) => d.fromWalletId !== d.toWalletId, {
  message: "Ví nguồn và ví đích phải khác nhau",
  path: ["toWalletId"],
});
