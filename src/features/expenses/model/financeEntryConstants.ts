export const ENTRY_KIND_LABELS = {
  INCOME: "Thu nhập",
  EXPENSE: "Chi tiêu",
  TRANSFER: "Chuyển khoản",
} as const;

export const LIFECYCLE_LABELS = {
  POSTED: "Đã thực hiện",
  PLANNED: "Dự kiến",
  VOIDED: "Đã hủy",
} as const;

export const SORT_KEY_LABELS = {
  NEWEST: "Mới nhất",
  OLDEST: "Cũ nhất",
  AMOUNT_DESC: "Số tiền giảm dần",
  AMOUNT_ASC: "Số tiền tăng dần",
} as const;

export const DEFAULT_ENTRY_FILTER = {
  limit: 20,
  sortKey: "NEWEST",
  entryKind: "ALL",
  lifecycleStatus: "ALL",
} as const;
