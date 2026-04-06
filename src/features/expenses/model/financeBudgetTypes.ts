/**
 * DTO — danh sách kỳ ngân sách (chip / sidebar).
 * Không gồm aggregate chi tiêu; xem `FinanceBudgetPeriodDetailDTO` khi đang xem một kỳ.
 */
export type FinanceBudgetPeriodListItemDTO = {
  id: number;
  periodKey: string;
  currency: string;
  overallLimitAmount: number | null;
  note: string | null;
};

/** Một dòng hạn mức + thực chi */
export type FinanceBudgetLineDetailDTO = {
  id: number;
  categoryId: number;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  limitAmount: number;
  spentAmount: number;
  percentUsed: number;
  /** Danh mục ẩn / soft-deleted — chỉ hiển thị */
  categoryHidden: boolean;
};

/** Chi tiết một kỳ — editor + dashboard */
export type FinanceBudgetPeriodDetailDTO = {
  id: number;
  periodKey: string;
  currency: string;
  overallLimitAmount: number | null;
  note: string | null;
  lines: FinanceBudgetLineDetailDTO[];
  totalSpentInPeriod: number;
  overallPercentUsed: number | null;
  hasUnmatchedCurrencyExpenses: boolean;
};
