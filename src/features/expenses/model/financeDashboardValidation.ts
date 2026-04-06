import { z } from "zod";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "from/to phải dạng YYYY-MM-DD");

export const dashboardRangeQuerySchema = z
  .object({
    preset: z.enum(["last30d", "thisMonth"]).optional(),
    from: ymd.optional(),
    to: ymd.optional(),
    tz: z.string().trim().min(1).default("Asia/Ho_Chi_Minh"),
    currency: z.string().trim().min(1).default("VND"),
    granularity: z.enum(["day", "week"]).default("day"),
    recentLimit: z.coerce.number().int().min(1).max(20).default(10),
  })
  .transform((d) => {
    if (d.from && d.to) return d;
    return { ...d, preset: d.preset ?? ("last30d" as const) };
  })
  .refine((d) => d.preset != null || (d.from != null && d.to != null), {
    message: "Cần preset hoặc cả from và to (YYYY-MM-DD)",
    path: ["from"],
  })
  .refine((d) => !(d.from && d.to) || d.from <= d.to, {
    message: "from phải trước hoặc bằng to",
    path: ["to"],
  });

export type DashboardRangeQueryInput = z.infer<typeof dashboardRangeQuerySchema>;
