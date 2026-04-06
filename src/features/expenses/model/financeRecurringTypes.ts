import type { FinanceRecurringFrequency } from "@prisma/client";

import type { FinanceEntryKind } from "@/features/expenses/model/financeEntryKind";

export type FinanceRecurringListItemDTO = {
  id: number;
  walletId: number;
  walletName: string;
  categoryId: number | null;
  categoryName: string | null;
  /** Emoji hoặc ký tự icon danh mục (đồng bộ với màn Danh mục). */
  categoryIcon: string | null;
  entryKind: FinanceEntryKind;
  frequency: FinanceRecurringFrequency;
  interval: number;
  frequencyLabel: string;
  nextRunAt: string;
  /** Giá trị cho input `datetime-local` (Asia/Ho_Chi_Minh). */
  nextRunAtLocal: string;
  nextRunAtText: string;
  amountRaw: number;
  amountText: string;
  currency: string;
  note: string | null;
  displayTitle: string;
  isActive: boolean;
  lastGeneratedAt: string | null;
  lastGeneratedAtText: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FinanceRecurringDetailDTO = FinanceRecurringListItemDTO;
