import { z } from "zod";
import type { JobStatus, PaymentStatus, JobPriority } from "@prisma/client";

const moneyString = z
  .string()
  .trim()
  .regex(/^\d+(\.\d+)?$/, "Số tiền không hợp lệ");

export const jobFilterSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  cursorId: z.number().int().positive().optional(),
  search: z.string().trim().optional(),
  clientId: z.number().int().positive().optional(),
  subjectId: z.number().int().positive().optional(),
  batchId: z.number().int().positive().optional(),
  status: z
    .union([z.literal("ALL"), z.custom<JobStatus>()])
    .optional(),
  paymentStatus: z
    .union([z.literal("ALL"), z.custom<PaymentStatus>()])
    .optional(),
});

export const jobCreateSchema = z.object({
  name: z.string().trim().min(2, "Tên việc làm tối thiểu 2 ký tự").max(200, "Tên việc làm quá dài"),
  clientId: z.number().int().positive().nullable().optional(),
  subjectId: z.number().int().positive().nullable().optional(),
  batchId: z.number().int().positive().nullable().optional(),
  status: z.custom<JobStatus>(),
  priority: z.custom<JobPriority>().default("MEDIUM"),
  startDate: z.string().optional().or(z.literal("")),
  deadline: z.string().optional().or(z.literal("")),
  amount: moneyString,
  deposit: moneyString.default("0"),
  referralFee: moneyString.default("0"),
  referrer: z.string().trim().max(200).optional().or(z.literal("")),
  note: z.string().max(2000).optional().or(z.literal("")),
});

export const jobUpdateSchema = jobCreateSchema.partial().extend({
  name: z.string().trim().min(2, "Tên việc làm tối thiểu 2 ký tự").max(200, "Tên việc làm quá dài").optional(),
});

export const jobManualPaymentSchema = z.object({
  jobId: z.number().int().positive(),
  date: z.string().min(1, "Vui lòng chọn ngày thanh toán"),
  amount: moneyString,
  type: z.enum(["DEPOSIT", "FULL"]),
  bankAccountId: z.number().int().positive(),
  content: z.string().trim().max(255, "Nội dung quá dài"),
});

export const quickClientCreateSchema = z.object({
  name: z.string().trim().min(2, "Tên khách hàng tối thiểu 2 ký tự"),
  phone: z.string().trim().optional().or(z.literal("")),
  zalo: z.string().trim().optional().or(z.literal("")),
});

export const quickSubjectCreateSchema = z.object({
  name: z.string().trim().min(2, "Tên môn học tối thiểu 2 ký tự"),
});

