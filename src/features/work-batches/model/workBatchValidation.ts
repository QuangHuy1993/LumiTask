import { z } from "zod";

export const workBatchCreateSchema = z.object({
  name: z.string().trim().min(2, "Tên đợt tối thiểu 2 ký tự").max(120, "Tên đợt quá dài"),
  startDate: z.string().min(1, "Vui lòng chọn ngày bắt đầu"),
  endDate: z.string().optional().or(z.literal("")),
  note: z.string().max(2000, "Ghi chú quá dài").optional().or(z.literal("")),
});

export const workBatchUpdateSchema = workBatchCreateSchema.partial().extend({
  name: z.string().trim().min(2, "Tên đợt tối thiểu 2 ký tự").max(120, "Tên đợt quá dài").optional(),
});

export const workBatchCloseSchema = z.object({
  closeDate: z.string().min(1, "Vui lòng chọn ngày đóng"),
});

export const workBatchAddJobsSchema = z.object({
  batchId: z.number().int().positive(),
  jobIds: z.array(z.number().int().positive()).min(1).max(200),
});

export const workBatchMoveJobsSchema = z.object({
  sourceBatchId: z.number().int().positive(),
  targetBatchId: z.number().int().positive(),
  jobIds: z.array(z.number().int().positive()).min(1).max(200),
});

export const workBatchRemoveJobsSchema = z.object({
  batchId: z.number().int().positive(),
  jobIds: z.array(z.number().int().positive()).min(1).max(200),
});

