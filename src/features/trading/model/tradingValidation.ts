import { z } from "zod";

const moneyString = z.string().trim().regex(/^\d+(\.\d+)?$/, "Số tiền không hợp lệ");

const dateInput = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ (YYYY-MM-DD)");

// -----------------------------
// Contacts
// -----------------------------
export const saleContactFilterSchema = z.object({
  limit: z.number().int().min(1).max(200).default(20),
  search: z.string().trim().optional(),
  contactMethod: z.union([z.literal("ALL"), z.enum(["ZALO", "FACEBOOK"])]).optional(),
  status: z.union([z.literal("ALL"), z.enum(["ACTIVE", "PAUSED", "DORMANT"])]).optional(),
});

export const saleContactCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  contactMethod: z.enum(["ZALO", "FACEBOOK"]),
  zalo: z.string().trim().max(50).optional().or(z.literal("")),
  facebookUrl: z.string().trim().max(500).optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "PAUSED", "DORMANT"]).default("ACTIVE"),
});

export const saleContactUpdateSchema = saleContactCreateSchema.partial().extend({
  name: z.string().trim().min(2).max(120).optional(),
});

// -----------------------------
// Categories
// -----------------------------
export const serviceCategoryFilterSchema = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  search: z.string().trim().optional(),
  isActive: z.union([z.literal("ALL"), z.coerce.boolean()]).optional(),
});

export const serviceCategoryCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug chỉ chứa chữ thường, số và dấu '-'"),
  sortOrder: z.number().int().min(0).max(1000).default(0),
  isActive: z.coerce.boolean().default(true),
});

export const serviceCategoryUpdateSchema = serviceCategoryCreateSchema.partial().extend({
  name: serviceCategoryCreateSchema.shape.name.optional(),
});

// -----------------------------
// Subscriptions
// -----------------------------
export const subscriptionListSchema = z.object({
  limit: z.number().int().min(1).max(200).default(25),
  page: z.number().int().min(1).max(10_000).default(1),
  search: z.string().trim().optional(),
  categoryId: z.number().int().positive().optional(),
  usageMode: z
    .union([z.literal("ALL"), z.literal("PERSONAL_FAMILY"), z.literal("RESELL")])
    .default("ALL")
    .optional(),
  status: z
    .union([z.literal("UPCOMING"), z.literal("OVERDUE"), z.literal("ALL")])
    .default("UPCOMING")
    .optional(),
  activeOnly: z.coerce.boolean().default(true).optional(),
});

export const subscriptionCreateSchema = z.object({
  title: z.string().trim().min(2).max(160),
  categoryId: z.number().int().positive(),
  usageMode: z.enum(["PERSONAL_FAMILY", "RESELL"]),
  contactId: z.number().int().positive().nullable().optional(),
  purchaseStartAt: z.union([dateInput, z.literal("")]).optional(),
  renewalOrExpiryAt: dateInput,
  remindDaysBefore: z.number().int().min(0).max(90).default(7),
  remindAfterExpiryDays: z.number().int().min(0).max(90).default(3),

  purchasePrice: z.string().trim().optional().or(z.literal("")).nullable(),
  salePrice: z.string().trim().optional().or(z.literal("")).nullable(),
  currency: z.string().trim().max(10).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),

  // Credential fields (plaintext)
  youtubeAccountEmail: z.string().trim().email().optional().or(z.literal("")),
  netflixAccountEmail: z.string().trim().email().optional().or(z.literal("")),
  netflixAccountPassword: z.string().trim().max(500).optional().or(z.literal("")),
});

export const subscriptionUpdateSchema = subscriptionCreateSchema
  .partial()
  .extend({
    purchaseStartAt: z.union([dateInput, z.literal("")]).optional(),
    renewalOrExpiryAt: dateInput.optional(),
    purchasePrice: z.string().trim().optional().or(z.literal("")).nullable(),
    salePrice: z.string().trim().optional().or(z.literal("")).nullable(),
  })
  .refine(() => true);

export const subscriptionRenewSchema = z.object({
  subscriptionId: z.number().int().positive(),
  renewalOrExpiryAt: dateInput,
  remindDaysBefore: z.number().int().min(0).max(90).default(7),
  remindAfterExpiryDays: z.number().int().min(0).max(90).default(3),

  purchasePrice: moneyString.optional().nullable(),
  salePrice: moneyString.optional().nullable(),
  currency: z.string().trim().max(10).optional().or(z.literal("")),

  // Credential updates optional
  youtubeAccountEmail: z.string().trim().email().optional().or(z.literal("")),
  netflixAccountEmail: z.string().trim().email().optional().or(z.literal("")),
  netflixAccountPassword: z.string().trim().max(500).optional().or(z.literal("")),
});

export const subscriptionToggleActiveSchema = z.object({
  subscriptionId: z.number().int().positive(),
  isActive: z.coerce.boolean(),
});

export const subscriptionContactMethodLabelsSchema = z.object({
  // reserved for future
});

