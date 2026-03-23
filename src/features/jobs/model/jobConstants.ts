import type { JobStatus, PaymentStatus } from "@prisma/client";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang làm",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  UNPAID: "Chưa thanh toán",
  DEPOSIT_PAID: "Đã cọc",
  COMPLETED: "Đã thanh toán đủ",
};

export const PAYMENT_STATUS_BADGE_VARIANT: Record<PaymentStatus, "default" | "warning" | "success"> = {
  UNPAID: "warning",
  DEPOSIT_PAID: "default",
  COMPLETED: "success",
};

