import type { BatchStatus, JobStatus, PaymentStatus } from "@prisma/client";

export type WorkBatchListItemDTO = {
  id: number;
  name: string;
  status: BatchStatus;
  startDate: string; // ISO
  endDate: string | null; // ISO
  note: string | null;

  jobCount: number;
  unpaidJobCount: number;

  totalAmountText: string;
  totalPaidText: string;
  remainingText: string;
};

export type WorkBatchStatsDTO = {
  openCount: number;
  batchesWithUnpaidCount: number;
  totalUnpaidJobs: number;
};

export type WorkBatchListSortKey = "NEWEST" | "OLDEST" | "UNPAID_DESC" | "NAME_ASC";
export type WorkBatchListStatusFilter = "ALL" | BatchStatus;

export type WorkBatchListQuery = {
  limit: number;
  cursorId?: number;
  search?: string;
  status?: WorkBatchListStatusFilter;
  unpaidOnly?: boolean;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  sortKey?: WorkBatchListSortKey;
};

export type WorkBatchListPageDTO = {
  items: WorkBatchListItemDTO[];
  stats: WorkBatchStatsDTO;
  nextCursorId: number | null;
};

export type WorkBatchJobRowDTO = {
  id: number;
  name: string;
  status: JobStatus;
  paymentStatus: PaymentStatus;
  isPaid: boolean;

  clientName: string | null;
  subjectName: string | null;

  amountText: string;
  totalPaidText: string;
  remainingText: string;
  deadline: string | null; // ISO
};

export type WorkBatchDetailDTO = {
  id: number;
  name: string;
  status: BatchStatus;
  startDate: string; // ISO
  endDate: string | null; // ISO
  note: string | null;

  jobCount: number;
  unpaidJobCount: number;
  totalAmountText: string;
  totalPaidText: string;
  remainingText: string;

  jobs: WorkBatchJobRowDTO[];
};

export type WorkBatchOptionDTO = {
  id: number;
  name: string;
};

export type AssignableJobDTO = {
  id: number;
  name: string;
  clientName: string | null;
  subjectName: string | null;
  paymentStatus: PaymentStatus;
  isPaid: boolean;
  amountText: string;
  totalPaidText: string;
  remainingText: string;
};

