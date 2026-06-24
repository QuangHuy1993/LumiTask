/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

import type {
  FinanceLoanDirection,
  FinanceLoanDetailDTO,
  FinanceLoanListItemDTO,
  FinanceLoanListQuery,
  FinanceLoanPaymentItemDTO,
  FinanceLoanStatsDTO,
} from "../model/financeLoanTypes";

import type { FinanceLoanCreateInput, FinanceLoanRepayInput as FinanceLoanRepayInputZod, FinanceLoanUpdateInput } from "../model/financeLoanValidation";

type FinanceLoanServiceError =
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "LOAN_CLOSED"
  | "WALLET_NOT_FOUND"
  | "CATEGORY_NOT_FOUND"
  | "CATEGORY_KIND_MISMATCH"
  | "DB_ERROR";

function formatYmd(date: Date): string {
  const dd = new Intl.DateTimeFormat("vi-VN", { day: "2-digit" }).format(date);
  const mm = new Intl.DateTimeFormat("vi-VN", { month: "2-digit" }).format(date);
  const yy = new Intl.DateTimeFormat("vi-VN", { year: "numeric" }).format(date);
  return `${dd}/${mm}/${yy}`;
}

function formatMoney(amount: Prisma.Decimal, currency = "VND"): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(Number(amount));
}

function loanDirectionToEntryKind(dir: FinanceLoanDirection): "INCOME" | "EXPENSE" {
  return dir === "BORROWED" ? "EXPENSE" : "INCOME";
}

function entryKindToCategoryKind(kind: "INCOME" | "EXPENSE"): "INCOME" | "EXPENSE" {
  // FinanceCategory.kind matches FinanceEntry.entryKind (INCOME/EXPENSE)
  return kind;
}

// Prisma type-generation có thể bị Cursor/IDE cache, nên ép kiểu "loose" cho query quan hệ
// để tránh diagnostics giả (runtime vẫn dựa trên schema DB + Prisma).
const prismaAny = prisma as any;

export const financeLoanService = {
  async listLoans(
    input: {
      ownerId: number;
      limit: number;
      search?: string;
      direction?: FinanceLoanListQuery["direction"];
      status?: FinanceLoanListQuery["status"];
    },
  ): Promise<{ items: FinanceLoanListItemDTO[]; totalCount: number }> {
    const limit = Math.min(Math.max(input.limit, 1), 200);
    const term = (input.search ?? "").trim();
    const direction = input.direction ?? "ALL";
    const status = input.status ?? "ALL";

    const whereParts: Prisma.Sql[] = [
      Prisma.sql`l."ownerId" = ${input.ownerId} AND l."deletedAt" IS NULL`,
    ];

    if (term) {
      whereParts.push(Prisma.sql`AND lower(l."name") LIKE ${`%${term.toLowerCase()}%`}`);
    }

    if (direction !== "ALL") {
      whereParts.push(Prisma.sql`AND l."loanDirection" = ${direction}::"FinanceLoanDirection"`);
    }

    if (status !== "ALL") {
      whereParts.push(Prisma.sql`AND l."status" = ${status}::"FinanceLoanStatus"`);
    }

    const whereSql = Prisma.join(whereParts, " ");

    const rows = await prisma.$queryRaw<Array<{
      id: number;
      name: string;
      icon: string | null;
      note: string | null;
      loanDirection: FinanceLoanDirection;
      status: "ACTIVE" | "CLOSED";
      principalAmount: Prisma.Decimal;
      currency: string;
      interestRateApr: Prisma.Decimal | null;
      startDate: Date;
      dueDate: Date | null;
      totalPaidAmount: Prisma.Decimal;
      paidPrincipalSum: Prisma.Decimal;
      paymentCount: number;
      createdAt: Date;
      totalCount: number;
    }>>(
      Prisma.sql`
        WITH loan_rows AS (
          SELECT
            l."id",
            l."name",
            l."icon",
            l."note",
            l."loanDirection",
            l."status",
            l."principalAmount",
            l."currency",
            l."interestRateApr",
            l."startDate",
            l."dueDate",
            l."createdAt",
            COALESCE(SUM(p."amount"), 0)::numeric(14,2) AS "totalPaidAmount",
            COALESCE(SUM(COALESCE(p."principalPaid", p."amount")), 0)::numeric(14,2) AS "paidPrincipalSum",
            COALESCE(COUNT(p."id"), 0)::int AS "paymentCount"
          FROM "FinanceLoan" l
          LEFT JOIN "FinanceLoanPayment" p
            ON p."loanId" = l."id"
           AND p."deletedAt" IS NULL
          WHERE ${whereSql}
          GROUP BY
            l."id", l."name", l."icon", l."note", l."loanDirection", l."status",
            l."principalAmount", l."currency", l."interestRateApr",
            l."startDate", l."dueDate",
            l."createdAt"
        )
        SELECT
          lr."id",
          lr."name",
          lr."icon",
          lr."note",
          lr."loanDirection",
          lr."status",
          lr."principalAmount",
          lr."currency",
          lr."interestRateApr",
          lr."startDate",
          lr."dueDate",
          lr."totalPaidAmount",
          lr."paidPrincipalSum",
          lr."paymentCount",
          lr."createdAt",
          COUNT(*) OVER()::int AS "totalCount"
        FROM loan_rows lr
        ORDER BY lr."createdAt" DESC
        LIMIT ${limit}
      `,
    );

    const totalCount = rows[0]?.totalCount ?? 0;

    const items: FinanceLoanListItemDTO[] = rows.map((r) => {
      const principal = Number(r.principalAmount);
      const paidPrincipal = Number(r.paidPrincipalSum);
      const remaining = principal - paidPrincipal;
      return {
        id: r.id,
        name: r.name,
        icon: r.icon,
        note: r.note,
        loanDirection: r.loanDirection,
        status: r.status,
        principalAmount: principal,
        remainingAmount: Math.max(0, remaining),
        totalPaidAmount: Number(r.totalPaidAmount),
        currency: r.currency,
        interestRateApr: r.interestRateApr ? Number(r.interestRateApr) : null,
        startDate: r.startDate.toISOString(),
        dueDate: r.dueDate ? r.dueDate.toISOString() : null,
        paymentCount: r.paymentCount,
      };
    });

    return { items, totalCount };
  },

  async getLoanDetail(ownerId: number, loanId: number): Promise<FinanceLoanDetailDTO | null> {
    const loan = await prismaAny.financeLoan.findFirst({
      where: { id: loanId, ownerId, deletedAt: null },
      select: {
        id: true,
        name: true,
        icon: true,
        note: true,
        loanDirection: true,
        status: true,
        principalAmount: true,
        currency: true,
        interestRateApr: true,
        startDate: true,
        dueDate: true,
        payments: {
          where: { deletedAt: null },
          select: { id: true, paidAt: true, amount: true, principalPaid: true, interestPaid: true, note: true, entryId: true },
        },
      },
    });

    if (!loan) return null;

    const loanPayments = loan.payments as Array<{
      id: number;
      paidAt: Date;
      amount: Prisma.Decimal;
      principalPaid: Prisma.Decimal | null;
      interestPaid: Prisma.Decimal | null;
      note: string | null;
      entryId: number | null;
    }>;

    const totalPaidAmount = loanPayments.reduce(
      (s: Prisma.Decimal, p) => s.plus(p.amount),
      new Prisma.Decimal(0),
    );
    const paidPrincipalSum = loanPayments.reduce(
      (s: Prisma.Decimal, p) => s.plus(p.principalPaid ?? p.amount),
      new Prisma.Decimal(0),
    );

    const remainingAmount = loan.principalAmount.minus(paidPrincipalSum);

    const payments: FinanceLoanPaymentItemDTO[] = loanPayments
      .slice()
      .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())
      .map((p) => ({
        id: p.id,
        paidAt: p.paidAt.toISOString(),
        paidAtText: formatYmd(p.paidAt),
        amount: Number(p.amount),
        amountText: formatMoney(p.amount, loan.currency),
        principalPaid: p.principalPaid == null ? null : Number(p.principalPaid),
        interestPaid: p.interestPaid == null ? null : Number(p.interestPaid),
        note: p.note ?? null,
        entryId: p.entryId ?? null,
      }));

    return {
      id: loan.id,
      name: loan.name,
      icon: loan.icon,
      note: loan.note ?? null,
      loanDirection: loan.loanDirection,
      status: loan.status,
      principalAmount: Number(loan.principalAmount),
      remainingAmount: Math.max(0, Number(remainingAmount)),
      totalPaidAmount: Number(totalPaidAmount),
      currency: loan.currency,
      interestRateApr: loan.interestRateApr ? Number(loan.interestRateApr) : null,
      startDate: loan.startDate.toISOString(),
      dueDate: loan.dueDate ? loan.dueDate.toISOString() : null,
      paymentCount: loanPayments.length,
      payments,
    };
  },

  async getStats(ownerId: number): Promise<FinanceLoanStatsDTO> {
    const rows = await prisma.$queryRaw<Array<{
      loanDirection: FinanceLoanDirection;
      principalSum: Prisma.Decimal;
      paidPrincipalSum: Prisma.Decimal;
    }>>(
      Prisma.sql`
        SELECT
          l."loanDirection" AS "loanDirection",
          COALESCE(SUM(l."principalAmount"), 0)::numeric(14,2) AS "principalSum",
          COALESCE(SUM(COALESCE(p."principalPaid", p."amount")), 0)::numeric(14,2) AS "paidPrincipalSum"
        FROM "FinanceLoan" l
        LEFT JOIN "FinanceLoanPayment" p
          ON p."loanId" = l."id"
         AND p."deletedAt" IS NULL
        WHERE
          l."ownerId" = ${ownerId}
          AND l."deletedAt" IS NULL
        GROUP BY l."loanDirection"
      `,
    );

    const byDir = new Map(rows.map((r) => [r.loanDirection, r]));
    const borrowed = byDir.get("BORROWED");
    const lent = byDir.get("LENT");

    const borrowedPrincipal = borrowed ? Number(borrowed.principalSum) : 0;
    const borrowedRemaining = borrowed ? borrowedPrincipal - Number(borrowed.paidPrincipalSum) : 0;
    const lentPrincipal = lent ? Number(lent.principalSum) : 0;
    const lentRemaining = lent ? lentPrincipal - Number(lent.paidPrincipalSum) : 0;

    return {
      totalBorrowedPrincipal: borrowedPrincipal,
      totalBorrowedRemaining: Math.max(0, borrowedRemaining),
      totalLentPrincipal: lentPrincipal,
      totalLentRemaining: Math.max(0, lentRemaining),
    };
  },

  async createLoan(ownerId: number, data: FinanceLoanCreateInput): Promise<{ ok: true; item: FinanceLoanListItemDTO } | { ok: false; error: FinanceLoanServiceError }> {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const txAny = tx as any;

        let createdEntryId: number | null = null;
        if (data.createEntry && data.walletId && data.categoryId) {
          const wallet = await txAny.financeWallet.findFirst({
            where: { id: data.walletId, ownerId, deletedAt: null },
            select: { id: true },
          });
          if (!wallet) throw new Error("WALLET_NOT_FOUND");

          const expectedEntryKind = data.loanDirection === "BORROWED" ? "INCOME" : "EXPENSE";
          const category = await txAny.financeCategory.findFirst({
            where: { id: data.categoryId, ownerId, deletedAt: null, kind: expectedEntryKind },
            select: { id: true },
          });
          if (!category) throw new Error("CATEGORY_NOT_FOUND");

          const entry = await tx.financeEntry.create({
            data: {
              ownerId,
              walletId: data.walletId,
              categoryId: data.categoryId,
              entryKind: expectedEntryKind,
              lifecycleStatus: "POSTED",
              amount: new Prisma.Decimal(String(data.principalAmount)),
              currency: data.currency ?? "VND",
              occurredAt: new Date(data.startDate),
              note: `Giao dịch gốc khoản nợ: ${data.name.trim()}`,
            },
            select: { id: true },
          });
          createdEntryId = entry.id;
        }

        const row = await txAny.financeLoan.create({
          data: {
            ownerId,
            name: data.name.trim(),
            icon: data.icon?.trim() ? data.icon.trim() : null,
            loanDirection: data.loanDirection,
            principalAmount: new Prisma.Decimal(String(data.principalAmount)),
            currency: data.currency ?? "VND",
            startDate: new Date(data.startDate),
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            interestRateApr: data.interestRateApr === undefined ? null : new Prisma.Decimal(String(data.interestRateApr)),
            status: data.status ?? "ACTIVE",
            note: data.note?.trim() ? data.note.trim() : null,
            entryId: createdEntryId,
          },
          select: {
            id: true,
            name: true,
            icon: true,
            note: true,
            loanDirection: true,
            status: true,
            principalAmount: true,
            currency: true,
            interestRateApr: true,
            startDate: true,
            dueDate: true,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "FINANCE_LOAN_CREATED",
            userId: ownerId,
            entityType: "FinanceLoan",
            entityId: String(row.id),
          },
        });

        if (createdEntryId) {
          await tx.auditLog.create({
            data: {
              action: "FINANCE_ENTRY_CREATED",
              userId: ownerId,
              entityType: "FinanceEntry",
              entityId: String(createdEntryId),
              metadata: { loanId: row.id, role: "initial_principal" },
            },
          });
        }

        return row;
      });

      const item: FinanceLoanListItemDTO = {
        id: created.id,
        name: created.name,
        icon: created.icon,
        note: created.note,
        loanDirection: created.loanDirection,
        status: created.status,
        principalAmount: Number(created.principalAmount),
        remainingAmount: Number(created.principalAmount),
        totalPaidAmount: 0,
        currency: created.currency,
        interestRateApr: created.interestRateApr ? Number(created.interestRateApr) : null,
        startDate: created.startDate.toISOString(),
        dueDate: created.dueDate ? created.dueDate.toISOString() : null,
        paymentCount: 0,
      };

      return { ok: true, item };
    } catch (e: any) {
      if (e?.message === "WALLET_NOT_FOUND" || e?.message === "CATEGORY_NOT_FOUND") {
        return { ok: false, error: e.message as FinanceLoanServiceError };
      }
      console.error("[financeLoanService.createLoan]", e);
      return { ok: false, error: "DB_ERROR" };
    }
  },

  async updateLoan(
    ownerId: number,
    loanId: number,
    data: FinanceLoanUpdateInput,
  ): Promise<{ ok: true } | { ok: false; error: FinanceLoanServiceError }> {
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const txAny = tx as any;
        const existing = await txAny.financeLoan.findFirst({
          where: { id: loanId, ownerId, deletedAt: null },
          select: { id: true, entryId: true, name: true, principalAmount: true, startDate: true },
        });
        if (!existing) return { ok: false as const, error: "NOT_FOUND" as const };

        if (existing.entryId) {
          const entryUpdateData: Prisma.FinanceEntryUpdateInput = {};
          if (data.principalAmount !== undefined) {
            entryUpdateData.amount = new Prisma.Decimal(String(data.principalAmount));
          }
          if (data.startDate !== undefined) {
            entryUpdateData.occurredAt = new Date(data.startDate);
          }
          if (data.name !== undefined) {
            entryUpdateData.note = `Giao dịch gốc khoản nợ: ${data.name.trim()}`;
          }

          if (Object.keys(entryUpdateData).length > 0) {
            await tx.financeEntry.update({
              where: { id: existing.entryId },
              data: entryUpdateData,
            });
          }
        }

        await txAny.financeLoan.update({
          where: { id: loanId },
          data: {
            ...(data.name !== undefined ? { name: data.name.trim() } : {}),
            ...(data.icon !== undefined ? { icon: data.icon?.trim() ? data.icon.trim() : null } : {}),
            ...(data.loanDirection !== undefined ? { loanDirection: data.loanDirection } : {}),
            ...(data.principalAmount !== undefined ? { principalAmount: new Prisma.Decimal(String(data.principalAmount)) } : {}),
            ...(data.currency !== undefined ? { currency: data.currency } : {}),
            ...(data.startDate !== undefined ? { startDate: new Date(data.startDate) } : {}),
            ...(data.dueDate !== undefined ? { dueDate: data.dueDate ? new Date(data.dueDate) : null } : {}),
            ...(data.interestRateApr !== undefined
              ? { interestRateApr: data.interestRateApr === undefined ? null : new Prisma.Decimal(String(data.interestRateApr)) }
              : {}),
            ...(data.status !== undefined ? { status: data.status } : {}),
            ...(data.note !== undefined ? { note: data.note?.trim() ? data.note.trim() : null } : {}),
          },
          select: { id: true },
        });

        await tx.auditLog.create({
          data: {
            action: "FINANCE_LOAN_UPDATED",
            userId: ownerId,
            entityType: "FinanceLoan",
            entityId: String(loanId),
          },
        });

        return { ok: true as const };
      });

      if (!outcome.ok) return outcome;
      return { ok: true };
    } catch (e) {
      console.error("[financeLoanService.updateLoan]", e);
      return { ok: false, error: "DB_ERROR" };
    }
  },

  async softDeleteLoan(ownerId: number, loanId: number): Promise<{ ok: true } | { ok: false; error: FinanceLoanServiceError }> {
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const txAny = tx as any;
        const loan = await txAny.financeLoan.findFirst({
          where: { id: loanId, ownerId, deletedAt: null },
          select: { id: true, entryId: true },
        });
        if (!loan) return { ok: false as const, error: "NOT_FOUND" as const };

        const payments = await txAny.financeLoanPayment.findMany({
          where: { loanId, deletedAt: null },
          select: { id: true, entryId: true },
        });

        const entryIds = (payments as Array<{ entryId: number | null }>)
          .map((p) => p.entryId)
          .filter((v): v is number => typeof v === "number");

        if (loan.entryId) {
          entryIds.push(loan.entryId);
        }

        if (payments.length > 0) {
          await txAny.financeLoanPayment.updateMany({
            where: { loanId, deletedAt: null },
            data: { deletedAt: new Date() },
          });
        }

        if (entryIds.length > 0) {
          await tx.financeEntry.updateMany({
            where: { id: { in: entryIds }, ownerId, deletedAt: null },
            data: { deletedAt: new Date() },
          });
        }

        await txAny.financeLoan.update({
          where: { id: loanId },
          data: { deletedAt: new Date() },
        });

        await tx.auditLog.create({
          data: {
            action: "FINANCE_LOAN_DELETED",
            userId: ownerId,
            entityType: "FinanceLoan",
            entityId: String(loanId),
          },
        });

        return { ok: true as const };
      });

      if (!outcome.ok) return outcome;
      return { ok: true };
    } catch (e) {
      console.error("[financeLoanService.softDeleteLoan]", e);
      return { ok: false, error: "DB_ERROR" };
    }
  },

  async recordPayment(
    ownerId: number,
    input: FinanceLoanRepayInputZod,
  ): Promise<
    | { ok: true; remainingAmountAfter: number; statusAfter: "ACTIVE" | "CLOSED"; loanId: number }
    | { ok: false; error: FinanceLoanServiceError }
  > {
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const txAny = tx as any;
        const loan = await txAny.financeLoan.findFirst({
          where: { id: input.loanId, ownerId, deletedAt: null },
          select: {
            id: true,
            loanDirection: true,
            status: true,
            principalAmount: true,
            currency: true,
          },
        });

        if (!loan) return { ok: false as const, error: "NOT_FOUND" as const };
        if (loan.status === "CLOSED") return { ok: false as const, error: "LOAN_CLOSED" as const };

        const expectedEntryKind = loanDirectionToEntryKind(loan.loanDirection);
        const expectedCategoryKind = entryKindToCategoryKind(expectedEntryKind);

        // Breakdown: nếu không truyền gốc/lãi thì coi như trả hết là gốc
        const principalPaidNum = input.principalPaid ?? input.amount;
        const interestPaidNum = input.interestPaid ?? 0;

        const amount = new Prisma.Decimal(String(input.amount));
        const principalPaid = new Prisma.Decimal(String(principalPaidNum));
        const interestPaid = new Prisma.Decimal(String(interestPaidNum));
        const paidAt = new Date(input.paidAt);
        const noteTrim = input.note?.trim() ? input.note.trim() : null;

        // Tính remaining dựa trên tổng gốc đã trả (principalPaid).
        // Tránh findMany + loop (chậm khi payment nhiều), thay bằng SUM ngay trong DB.
        const prevPrincipalPaidRow = (await txAny.$queryRaw(
          Prisma.sql`
            SELECT COALESCE(SUM(COALESCE("principalPaid", "amount")), 0)::numeric AS "paidPrincipalSum"
            FROM "FinanceLoanPayment"
            WHERE "loanId" = ${loan.id} AND "deletedAt" IS NULL
          `,
        )) as Array<{ paidPrincipalSum: string }>;

        const prevPrincipalPaid = new Prisma.Decimal(prevPrincipalPaidRow?.[0]?.paidPrincipalSum ?? "0");

        const remainingAfter = loan.principalAmount.minus(prevPrincipalPaid.plus(principalPaid));

        // Nếu người dùng tắt checkbox "tạo giao dịch", chỉ tạo FinanceLoanPayment.
        let paymentEntryId: number | null = null;
        if (input.createEntry) {
          const wallet = await txAny.financeWallet.findFirst({
            where: { id: input.walletId, ownerId, deletedAt: null },
            select: { id: true },
          });
          if (!wallet) return { ok: false as const, error: "WALLET_NOT_FOUND" as const };

          const category = await txAny.financeCategory.findFirst({
            where: { id: input.categoryId, ownerId, deletedAt: null, kind: expectedCategoryKind },
            select: { id: true },
          });
          if (!category) return { ok: false as const, error: "CATEGORY_NOT_FOUND" as const };

          const createdEntry = await tx.financeEntry.create({
            data: {
              ownerId,
              walletId: input.walletId,
              categoryId: input.categoryId,
              entryKind: expectedEntryKind,
              lifecycleStatus: "POSTED",
              amount,
              currency: loan.currency,
              occurredAt: paidAt,
              note: noteTrim,
            },
            select: { id: true },
          });

          paymentEntryId = createdEntry.id;
        }

        await txAny.financeLoanPayment.create({
          data: {
            loanId: loan.id,
            amount,
            principalPaid,
            interestPaid,
            paidAt,
            entryId: paymentEntryId,
            note: noteTrim,
          },
        });

        const statusAfter: "ACTIVE" | "CLOSED" = remainingAfter.lte(0) ? "CLOSED" : "ACTIVE";
        if (statusAfter !== loan.status) {
          await tx.financeLoan.update({
            where: { id: loan.id },
            data: { status: statusAfter },
          });
        }

        await tx.auditLog.create({
          data: {
            action: "FINANCE_LOAN_UPDATED",
            userId: ownerId,
            entityType: "FinanceLoan",
            entityId: String(loan.id),
            metadata: {
              payment: { amount: Number(amount), principalPaid: Number(principalPaid), interestPaid: Number(interestPaid) },
            },
          },
        });

        if (paymentEntryId) {
          await tx.auditLog.create({
            data: {
              action: "FINANCE_ENTRY_CREATED",
              userId: ownerId,
              entityType: "FinanceEntry",
              entityId: String(paymentEntryId),
              metadata: { loanId: loan.id, loanDirection: loan.loanDirection },
            },
          });
        }

        return {
          ok: true as const,
          remainingAmountAfter: Math.max(0, Number(remainingAfter)),
          statusAfter,
          loanId: loan.id,
        };
      });

      return outcome;
    } catch (e) {
      console.error("[financeLoanService.recordPayment]", e);
      return { ok: false, error: "DB_ERROR" };
    }
  },

  async softDeletePayment(
    ownerId: number,
    paymentId: number,
  ): Promise<{ ok: true; remainingAmountAfter: number; statusAfter: "ACTIVE" | "CLOSED" } | { ok: false; error: FinanceLoanServiceError }> {
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const txAny = tx as any;
        const payment = await txAny.financeLoanPayment.findFirst({
          where: { id: paymentId, deletedAt: null, loan: { ownerId, deletedAt: null } },
          select: { id: true, loanId: true, entryId: true, loan: { select: { id: true, principalAmount: true, status: true } } },
        });

        if (!payment) return { ok: false as const, error: "NOT_FOUND" as const };

        await txAny.financeLoanPayment.update({
          where: { id: paymentId },
          data: { deletedAt: new Date() },
        });

        let didDeleteEntry = false;
        if (payment.entryId) {
          const others = await txAny.financeLoanPayment.findFirst({
            where: { entryId: payment.entryId, deletedAt: null },
            select: { id: true },
          });
          if (!others) {
            await txAny.financeEntry.updateMany({
              where: { id: payment.entryId, ownerId, deletedAt: null },
              data: { deletedAt: new Date() },
            });
            didDeleteEntry = true;
          }
        }

        const remainingPrincipalAfter = await txAny.financeLoanPayment.findMany({
          where: { loanId: payment.loanId, deletedAt: null },
          select: { principalPaid: true, amount: true },
        });

        let paidPrincipal = new Prisma.Decimal(0);
        for (const p of remainingPrincipalAfter) {
          paidPrincipal = paidPrincipal.plus(p.principalPaid ?? p.amount);
        }

        const remainingAfter = payment.loan.principalAmount.minus(paidPrincipal);
        const statusAfter: "ACTIVE" | "CLOSED" = remainingAfter.lte(0) ? "CLOSED" : "ACTIVE";

        if (payment.loan.status !== statusAfter) {
          await txAny.financeLoan.update({
            where: { id: payment.loanId },
            data: { status: statusAfter },
          });
        }

        await txAny.auditLog.create({
          data: {
            action: "FINANCE_LOAN_UPDATED",
            userId: ownerId,
            entityType: "FinanceLoan",
            entityId: String(payment.loanId),
            metadata: { deletedPaymentId: paymentId },
          },
        });

        if (didDeleteEntry && payment.entryId) {
          await txAny.auditLog.create({
            data: {
              action: "FINANCE_ENTRY_DELETED",
              userId: ownerId,
              entityType: "FinanceEntry",
              entityId: String(payment.entryId),
              metadata: { loanId: payment.loanId },
            },
          });
        }

        return {
          ok: true as const,
          remainingAmountAfter: Math.max(0, Number(remainingAfter)),
          statusAfter,
        };
      });

      return outcome;
    } catch (e) {
      console.error("[financeLoanService.softDeletePayment]", e);
      return { ok: false, error: "DB_ERROR" };
    }
  },
};

