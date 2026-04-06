import type { FinanceEntryKind } from "@/features/expenses/model/financeEntryKind";

/** Query chung cho dashboard (preset hoặc from/to theo lịch trong tz). */
export type DashboardRangeQuery = {
  preset?: "last30d" | "thisMonth";
  /** YYYY-MM-DD hoặc ISO datetime — nếu dùng from/to thì bắt cặp. */
  from?: string;
  to?: string;
  tz: string;
  currency: string;
  granularity?: "day" | "week";
  recentLimit?: number;
};

export type DashboardSummaryDTO = {
  range: { from: string; to: string; tz: string; currency: string };
  incomeTotal: string;
  expenseTotal: string;
  net: string;
  priorRange: { from: string; to: string };
  priorIncomeTotal: string;
  priorExpenseTotal: string;
  deltaPct: { income: number | null; expense: number | null };
  walletBalanceTotal?: string;
  entryCount: number;
};

export type DashboardTimeseriesDTO = {
  granularity: "day" | "week";
  labels: string[];
  income: string[];
  expense: string[];
};

export type DashboardCategorySliceDTO = {
  categoryId: number;
  name: string;
  color: string | null;
  icon: string | null;
  amount: string;
  pctOfExpense: number;
};

export type DashboardWalletSliceDTO = {
  walletId: number;
  name: string;
  income: string;
  expense: string;
  net: string;
};

export type DashboardRecentEntryDTO = {
  id: number;
  occurredAt: string;
  entryKind: Extract<FinanceEntryKind, "INCOME" | "EXPENSE">;
  amount: string;
  currency: string;
  note: string | null;
  categoryName: string | null;
  walletName: string;
};

export type DashboardBundleDTO = {
  summary: DashboardSummaryDTO;
  timeseries: DashboardTimeseriesDTO;
  byCategory: DashboardCategorySliceDTO[];
  byWallet: DashboardWalletSliceDTO[];
  recentEntries: DashboardRecentEntryDTO[];
};
