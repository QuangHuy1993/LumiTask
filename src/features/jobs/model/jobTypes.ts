import type { JobStatus, PaymentStatus, JobPriority } from "@prisma/client";

export type JobListSortKey = "NEWEST" | "OLDEST" | "AMOUNT_DESC" | "AMOUNT_ASC";

export type JobListQuery = {
  limit: number;
  cursorId?: number;
  search?: string;
  sortKey?: JobListSortKey;
  clientId?: number;
  subjectId?: number;
  batchId?: number;
  status?: JobStatus | "ALL";
  paymentStatus?: PaymentStatus | "ALL";
};

export type JobListItemDTO = {
  id: number;
  name: string;
  clientName: string | null;
  subjectName: string | null;
  batchName: string | null;

  status: JobStatus;
  paymentStatus: PaymentStatus;
  priority: JobPriority;

  amountText: string;
  depositText: string;
  totalPaidText: string;
  remainingText: string;

  createdAt: string; // ISO
  deadline: string | null; // ISO
};

export type JobListStatsDTO = {
  totalJobs: number;
  unpaidJobs: number;
  depositPaidJobs: number;
  completedJobs: number;
  totalAmountText: string;
  totalUnpaidText: string;
};

export type JobListPageDTO = {
  items: JobListItemDTO[];
  stats: JobListStatsDTO;
  nextCursorId: number | null;
};

export type JobFormInput = {
  name: string;
  clientId?: number | null;
  subjectId?: number | null;
  batchId?: number | null;
  status: JobStatus;
  priority: JobPriority;
  startDate?: string | null;
  deadline?: string | null;
  amount: string;
  deposit: string;
  referralFee: string;
  referrer?: string;
  note?: string;
};

export type JobDetailDTO = {
  id: number;
  name: string;
  clientId: number | null;
  subjectId: number | null;
  batchId: number | null;
  clientName: string | null;
  subjectName: string | null;
  batchName: string | null;

  status: JobStatus;
  paymentStatus: PaymentStatus;
  priority: JobPriority;
  isPaid: boolean;

  amountText: string;
  depositText: string;
  totalPaidText: string;
  remainingText: string;

  startDate: string | null;
  deadline: string | null;

  referrer: string | null;
  referralFeeText: string;
  note: string | null;

  createdAt: string;
  updatedAt: string;
};

export type JobPaymentQRTab = "DEPOSIT" | "FULL";

export type JobPaymentQRData = {
  jobId: number;
  jobName: string;
  paymentStatus: PaymentStatus;
  amount: string;
  deposit: string;
  totalPaid: string;
  activeTab: JobPaymentQRTab;
};

