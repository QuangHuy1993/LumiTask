export type FinanceWalletIcon = "cash" | "bank" | "ewallet" | "savings";

export type FinanceWalletListQuery = {
  limit: number;
  search?: string;
};

export type FinanceWalletListItemDTO = {
  id: number;
  name: string;
  currency: string;
  sortOrder: number;
  isDefault: boolean;
  icon: FinanceWalletIcon | null;
};

