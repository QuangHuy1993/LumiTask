/**
 * Khớp enum Prisma `FinanceEntryKind` — dùng ở client và DTO thay vì import từ `@prisma/client`.
 * Cập nhật khi đổi enum trong prisma/schema.prisma.
 */
export type FinanceEntryKind = "INCOME" | "EXPENSE" | "TRANSFER_OUT" | "TRANSFER_IN";
