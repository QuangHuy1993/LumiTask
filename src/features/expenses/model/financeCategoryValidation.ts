import { z } from "zod";

export const financeCategoryFilterSchema = z.object({
  /** coerce: server action / query có thể truyền limit dạng chuỗi */
  limit: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().trim().optional(),
  kind: z.union([z.literal("ALL"), z.enum(["INCOME", "EXPENSE"])]).optional(),
  isActive: z.union([z.literal("ALL"), z.coerce.boolean()]).optional(),
});

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ chứa chữ thường, số và dấu '-'");

export const financeCategoryCreateSchema = z.object({
  kind: z.enum(["INCOME", "EXPENSE"]),
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Màu HEX không hợp lệ")
    .optional()
    .or(z.literal("")),
  icon: z.string().trim().max(50).optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  isActive: z.coerce.boolean().default(true),
});

export const financeCategoryUpdateSchema = financeCategoryCreateSchema.partial().extend({
  name: financeCategoryCreateSchema.shape.name.optional(),
});

export type FinanceCategoryCreateInput = z.infer<typeof financeCategoryCreateSchema>;
export type FinanceCategoryUpdateInput = z.infer<typeof financeCategoryUpdateSchema>;
export type FinanceCategoryFilterInput = z.infer<typeof financeCategoryFilterSchema>;
