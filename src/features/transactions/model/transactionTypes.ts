import type { TransactionDirection, TransactionStatus } from "@prisma/client";

export interface TransactionListQuery {
  startDate?: string;
  endDate?: string;
  direction?: TransactionDirection | "ALL";
  status?: TransactionStatus | "ALL";
  source?: "SEPAY" | "MANUAL" | "ALL";
  searchContent?: string;
  jobId?: number;
  clientId?: number;
  bankAccountId?: number;
  
  // Pagination
  take?: number;
  cursor?: number;
}

export interface TransactionListItemDTO {
  id: number;
  transactionDate: Date;
  amount: number;
  direction: TransactionDirection;
  content: string;
  status: TransactionStatus;
  gatewayTransId: string | null;
  bankAccount: {
    bankId: string;
    accountNo: string;
  } | null;
  job: {
    id: number;
    name: string;
    client: {
      id: number;
      name: string;
    } | null;
  } | null;
}

export interface TransactionStatsDTO {
  totalCount: number;
  totalIncoming: number;
  totalOutgoing: number;
  netDifference: number;
}

export interface TransactionListResult {
  items: TransactionListItemDTO[];
  hasMore: boolean;
  nextCursor: number | null;
}

export interface TransactionDetailDTO extends TransactionListItemDTO {
  rawPayload: string | null;
  user: {
    id: number;
    fullName: string | null;
  } | null;
}
