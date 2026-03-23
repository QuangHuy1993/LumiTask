export type SubscriptionUsageMode = "PERSONAL_FAMILY" | "RESELL";

export type SubscriptionStatusFilter = "UPCOMING" | "OVERDUE" | "ALL";

export type SubscriptionUsageModeFilter = "ALL" | SubscriptionUsageMode;

export type SubscriptionReminderStage = "LEAD" | "AFTER";

export type SubscriptionListQuery = {
  limit: number;
  /** Trang 1-based; kết hợp `skip` ở tầng service */
  page?: number;
  search?: string;
  categoryId?: number;
  usageMode?: SubscriptionUsageModeFilter;
  status?: SubscriptionStatusFilter;
  activeOnly?: boolean;
};

export type SubscriptionListStatsDTO = {
  activeCount: number;
  expiringSoonCount: number;
  buyerReminderCount: number;
};

export type SubscriptionListItemDTO = {
  id: number;
  title: string;

  categoryId: number;
  categoryName: string;

  contactId: number | null;

  usageMode: SubscriptionUsageMode;

  purchaseStartAtISO?: string | null;
  renewalOrExpiryAtISO: string;
  remindDaysBefore: number;
  remindAfterExpiryDays: number;

  nextReminderAtISO: string | null;
  nextReminderStage: SubscriptionReminderStage | null;

  isActive: boolean;

  contactName?: string | null;
  contactEmail?: string | null;

  // Raw digits (UI modal input expects integer-string)
  purchasePriceRaw?: string | null;
  salePriceRaw?: string | null;

  currency: string;

  // Credential fields (plaintext, theo yêu cầu)
  youtubeAccountEmail?: string | null;
  netflixAccountEmail?: string | null;
  netflixAccountPassword?: string | null;

  /** Ghi chú (có trong list để form sửa nhanh từ bảng) */
  notes?: string | null;
};

export type SubscriptionListPageDTO = {
  items: SubscriptionListItemDTO[];
  stats: SubscriptionListStatsDTO;
  totalCount: number;
  page: number;
  pageSize: number;
};

export type SubscriptionDetailDTO = {
  id: number;
  title: string;
  categoryId: number;
  categoryName: string;
  contactId: number | null;
  usageMode: SubscriptionUsageMode;

  purchaseStartAtISO: string | null;
  renewalOrExpiryAtISO: string;
  remindDaysBefore: number;
  remindAfterExpiryDays: number;

  nextReminderAtISO: string | null;
  nextReminderStage: SubscriptionReminderStage | null;

  purchasePriceRaw: string | null;
  salePriceRaw: string | null;
  currency: string;

  isActive: boolean;

  contactName: string | null;
  contactEmail: string | null;

  notes: string | null;

  youtubeAccountEmail: string | null;
  netflixAccountEmail: string | null;
  netflixAccountPassword: string | null;

  createdAtISO: string;
  updatedAtISO: string;
};

