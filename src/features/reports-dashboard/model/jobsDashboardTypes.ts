import type { TransactionDirection, TransactionStatus, PaymentStatus, JobStatus } from "@prisma/client";

export type JobsDashboardPreset =
  | "LAST_7_DAYS"
  | "LAST_30_DAYS"
  | "THIS_MONTH"
  | "THIS_QUARTER"
  | "THIS_YEAR"
  | "CUSTOM";

export type JobsDashboardFilters = {
  preset: JobsDashboardPreset;
  from?: string | null;
  to?: string | null;
  batchId?: number | null;
};

export type JobsDashboardKpis = {
  grossRevenue: string;
  netRevenue: string;
  commissionPaid: string;
  unpaidRemaining: string;
  overdueJobs: number;
  totalJobs: number;
  topReferrer: {
    name: string;
    commission: string;
  } | null;
};

export type RevenueTrendPoint = {
  bucketLabel: string;
  gross: number;
  net: number;
  commission: number;
};

export type JobStatusTrendPoint = {
  bucketLabel: string;
  notStarted: number;
  inProgress: number;
  completed: number;
  cancelled: number;
};

export type PaymentStatusBreakdownItem = {
  status: PaymentStatus;
  count: number;
};

export type TopClientItem = {
  clientName: string;
  netRevenue: number;
};

export type TopBatchItem = {
  batchName: string;
  gross: number;
  net: number;
  commission: number;
};

export type TopReferrerItem = {
  referrer: string;
  commission: number;
  jobs: number;
};

export type JobsDashboardSeries = {
  revenueTrend: RevenueTrendPoint[];
  jobStatusTrend: JobStatusTrendPoint[];
  paymentStatusBreakdown: PaymentStatusBreakdownItem[];
};

export type JobsDashboardTopLists = {
  topClients: TopClientItem[];
  topBatches: TopBatchItem[];
  topReferrers: TopReferrerItem[];
};

export type JobsDashboardVM = {
  kpis: JobsDashboardKpis;
  series: JobsDashboardSeries;
  topLists: JobsDashboardTopLists;
  filtersResolved: {
    from: string;
    to: string;
    preset: JobsDashboardPreset;
    batchId: number | null;
  };
};

