import { z } from "zod";

const periodKeyRegex = /^\d{4}-(0[1-9]|1[0-2])$/;

export const financeBudgetPeriodKeySchema = z
  .string()
  .regex(periodKeyRegex, "Kỳ phải là YYYY-MM (ví dụ 2026-03)");

const positiveMoney = z.coerce.number().positive("Hạn mức phải lớn hơn 0");

const budgetLineInputSchema = z.object({
  categoryId: z.number().int().positive(),
  limitAmount: positiveMoney,
});

export const financeBudgetUpsertSchema = z
  .object({
    periodKey: financeBudgetPeriodKeySchema,
    currency: z.string().trim().min(1).max(10).default("VND"),
    overallLimitAmount: z
      .union([z.coerce.number().positive(), z.literal(""), z.null()])
      .optional()
      .transform((v) => {
        if (v === "" || v === undefined) return undefined;
        if (v === null) return null;
        return v;
      }),
    note: z.string().max(5000).nullable().optional(),
    lines: z.array(budgetLineInputSchema).default([]),
  })
  .superRefine((data, ctx) => {
    const ids = data.lines.map((l) => l.categoryId);
    const uniq = new Set(ids);
    if (uniq.size !== ids.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Không trùng danh mục trong cùng một kỳ",
        path: ["lines"],
      });
    }
  });

export type FinanceBudgetUpsertInput = z.infer<typeof financeBudgetUpsertSchema>;
