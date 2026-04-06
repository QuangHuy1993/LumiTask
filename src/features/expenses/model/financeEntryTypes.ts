import type { FinanceEntryLifecycle } from "@prisma/client";

import type { FinanceEntryKind } from "@/features/expenses/model/financeEntryKind";

// — Query types —
export type EntryListSortKey = "NEWEST" | "OLDEST" | "AMOUNT_DESC" | "AMOUNT_ASC";

export type EntryListQuery = {
  limit: number;
  cursorId?: number;
  search?: string;
  sortKey?: EntryListSortKey;
  walletId?: number;
  categoryId?: number;
  entryKind?: FinanceEntryKind | "ALL";
  lifecycleStatus?: FinanceEntryLifecycle | "ALL";
  dateFrom?: string;    // ISO date string YYYY-MM-DD
  dateTo?: string;
  periodKey?: string;   // YYYY-MM shortcut
};

export type MonthOverviewQuery = {
  periodKey: string; // YYYY-MM
  timezone?: string; // e.g. "Asia/Ho_Chi_Minh"
};

// — DTO types (dữ liệu trả về cho UI) —
export type EntryListItemDTO = {
  id: number;
  entryKind: FinanceEntryKind;
  lifecycleStatus: FinanceEntryLifecycle;
  amountText: string;           // "1.500.000 VND"
  amountRaw: number;
  currency: string;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  walletId: number;
  categoryId: number | null;
  walletName: string;
  occurredAt: string;           // ISO string
  occurredAtText: string;       // "03/04/2026"
  note: string | null;
  tagNames: string[];
  isTransfer: boolean;
  transferPairId: string | null;
};

export type EntryListStatsDTO = {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  totalIncomeText: string;
  totalExpenseText: string;
  netBalanceText: string;
  entryCount: number;
};

export type EntryListPageDTO = {
  items: EntryListItemDTO[];
  stats: EntryListStatsDTO;
  nextCursorId: number | null;
};

export type MonthDayCountsDTO = Record<string, number>; // YYYY-MM-DD -> count

export type MonthOverviewDTO = {
  periodKey: string;
  dayCounts: MonthDayCountsDTO;
  stats: {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    entryCount: number;
  };
};

/** Gộp chi EXPENSE (POSTED) trong tháng — dùng cho ngân sách; chỉ cộng đúng currency với kỳ */
export type ExpenseMonthAggregateQuery = {
  periodKey: string;
  currency: string;
  timezone?: string;
};

export type ExpenseMonthAggregateDTO = {
  totalExpensePosted: number;
  byCategoryId: Record<number, number>;
  /** Số giao dịch chi khác currency — không gộp vào totalExpensePosted / byCategoryId */
  foreignCurrencyExpenseCount: number;
};

export type EntryDetailDTO = EntryListItemDTO & {
  splitGroupId: string | null;
  parentEntryId: number | null;
  recurringRuleId: number | null;
  goalContributions: { goalId: number; goalTitle: string; amount: string }[];
  loanPayments: { loanId: number; loanName: string; amount: string }[];
  attachments: { id: number; fileName: string; fileUrl: string; fileType: string | null }[];
  createdAt: string;
  updatedAt: string;
};

// — Form types (dữ liệu từ UI form) —
export type EntryFormInput = {
  walletId: number;
  categoryId?: number | null;
  entryKind: FinanceEntryKind;
  lifecycleStatus?: FinanceEntryLifecycle;
  amount: string;          // string để dễ nhập (Zod sẽ validate)
  currency?: string;
  occurredAt: string;      // YYYY-MM-DD
  note?: string;
  tagIds?: number[];
};

export type TransferFormInput = {
  fromWalletId: number;
  toWalletId: number;
  amount: string;
  occurredAt: string;
  note?: string;
};
