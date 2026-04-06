import { z } from "zod";

const positiveMoney = z.coerce.number().positive("Số tiền phải lớn hơn 0");

const optionalDateYmd = z
  .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ")])
  .optional()
  .transform((v) => (v === "" || v === undefined ? undefined : v));

export const savingsGoalCreateSchema = z.object({
  title: z.string().trim().min(1, "Tên mục tiêu không được để trống").max(200),
  icon: z.string().trim().max(16).optional().or(z.literal("")),
  targetAmount: positiveMoney,
  currency: z.string().trim().min(1).max(10).default("VND"),
  targetDate: optionalDateYmd,
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export const savingsGoalUpdateSchema = savingsGoalCreateSchema.partial().extend({
  title: z.string().trim().min(1).max(200).optional(),
  targetDate: z
    .union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.null()])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      if (v === "" || v === null) return null;
      return v;
    }),
});

export const contributeToGoalSchema = z
  .object({
    goalId: z.number().int().positive(),
    amount: positiveMoney,
    contributedAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Thời điểm không hợp lệ"),
    note: z.string().max(2000).optional().or(z.literal("")),
    linkEntry: z.boolean().default(false),
    walletId: z.number().int().positive().optional(),
    categoryId: z.number().int().positive().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.linkEntry) {
      if (!data.walletId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Vui lòng chọn ví", path: ["walletId"] });
      }
      if (!data.categoryId) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Vui lòng chọn danh mục chi", path: ["categoryId"] });
      }
    }
  });

export type SavingsGoalCreateInput = z.infer<typeof savingsGoalCreateSchema>;
export type SavingsGoalUpdateInput = z.infer<typeof savingsGoalUpdateSchema>;
export type ContributeToGoalInput = z.infer<typeof contributeToGoalSchema>;
