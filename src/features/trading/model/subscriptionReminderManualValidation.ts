import { z } from "zod";

export const manualReminderPreviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  stage: z.union([z.literal("LEAD"), z.literal("AFTER"), z.literal("ALL")]).default("ALL"),
  q: z.string().trim().max(200).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
});

export const manualReminderSendBodySchema = z.object({
  selectedSubscriptionIds: z.array(z.number().int().positive()).min(1).max(500),
  nowISO: z.string().datetime().optional(),
  windowMinutes: z.coerce.number().int().min(1).max(60 * 24 * 30).optional(),
});

export const manualReminderJobIdParamsSchema = z.object({
  jobRunId: z.coerce.number().int().positive(),
});

