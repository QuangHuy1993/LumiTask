import { z } from "zod";

const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/, "Số tiền không hợp lệ")
  .refine((v) => parseFloat(v) > 0, "Số tiền phải lớn hơn 0");

const recurringFrequencySchema = z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);

export const recurringListFilterSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  search: z.string().trim().optional(),
  isActive: z.union([z.literal("ALL"), z.coerce.boolean()]).optional(),
});

export const recurringCreateSchema = z.object({
  walletId: z.coerce.number().int().positive("Vui lòng chọn ví"),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  entryKind: z.enum(["INCOME", "EXPENSE"]),
  frequency: recurringFrequencySchema,
  interval: z.coerce.number().int().min(1, "Chu kỳ tối thiểu là 1").max(366, "Chu kỳ tối đa 366"),
  nextRunAt: z.string().trim().min(1, "Vui lòng chọn ngày giờ chạy tiếp theo"),
  amount: moneyString,
  currency: z.string().trim().length(3, "Mã tiền tệ phải 3 ký tự").default("VND"),
  note: z.string().max(2000).optional().or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
});

export const recurringUpdateSchema = recurringCreateSchema.partial().extend({
  walletId: z.coerce.number().int().positive().optional(),
  entryKind: z.enum(["INCOME", "EXPENSE"]).optional(),
});

export const recurringToggleSchema = z.object({
  ruleId: z.coerce.number().int().positive(),
  isActive: z.coerce.boolean(),
});

export const recurringIdSchema = z.object({
  ruleId: z.coerce.number().int().positive(),
});

export type RecurringCreateInput = z.infer<typeof recurringCreateSchema>;
export type RecurringUpdateInput = z.infer<typeof recurringUpdateSchema>;
export type RecurringListFilterInput = z.infer<typeof recurringListFilterSchema>;
