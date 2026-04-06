import { z } from "zod";

export const walletFilterSchema = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  search: z.string().trim().optional(),
});

export const walletCreateSchema = z.object({
  name: z.string().trim().min(1, "Tên ví không được để trống").max(50),
  currency: z.string().trim().min(1).max(10).default("VND"),
  sortOrder: z.number().int().default(0),
  isDefault: z.boolean().default(false),
  // Icon based on ICON_MAP in FinanceWalletsClient.tsx
  icon: z.enum(["cash", "bank", "ewallet", "savings"]).default("cash"),
});

export const walletUpdateSchema = walletCreateSchema.partial();
