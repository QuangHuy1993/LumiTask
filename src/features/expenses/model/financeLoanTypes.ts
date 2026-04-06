import type { FinanceLoanStatus } from "@prisma/client";

export type FinanceLoanDirection = "BORROWED" | "LENT";

export type FinanceLoanListQuery = {
  limit: number;
  search?: string;
  direction?: FinanceLoanDirection | "ALL";
  status?: FinanceLoanStatus | "ALL";
};

export type FinanceLoanListItemDTO = {
  id: number;
  name: string;
  icon: string | null;
  note: string | null;

  loanDirection: FinanceLoanDirection;
  status: FinanceLoanStatus;

  principalAmount: number;
  remainingAmount: number;
  totalPaidAmount: number;

  currency: string;
  interestRateApr: number | null;

  startDate: string; // ISO
  dueDate: string | null; // ISO

  paymentCount: number;
};

export type FinanceLoanPaymentItemDTO = {
  id: number;
  paidAt: string; // ISO
  paidAtText: string; // dd/mm/yyyy
  amount: number;
  amountText: string;
  principalPaid: number | null;
  interestPaid: number | null;
  note: string | null;
  entryId: number | null;
};

export type FinanceLoanDetailDTO = FinanceLoanListItemDTO & {
  payments: FinanceLoanPaymentItemDTO[];
};

export type FinanceLoanStatsDTO = {
  totalBorrowedPrincipal: number;
  totalBorrowedRemaining: number;
  totalLentPrincipal: number;
  totalLentRemaining: number;
};

