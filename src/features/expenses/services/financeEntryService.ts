/* eslint-disable @typescript-eslint/no-explicit-any */
import { Prisma, type FinanceEntryLifecycle } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { randomUUID } from "crypto";
import type {
  EntryDetailDTO,
  EntryListItemDTO,
  EntryListPageDTO,
  EntryListQuery,
  ExpenseMonthAggregateDTO,
  ExpenseMonthAggregateQuery,
  MonthDayCountsDTO,
  MonthOverviewDTO,
  MonthOverviewQuery,
} from "../model/financeEntryTypes";

// Hàm format tiền VND
function formatMoney(amount: Prisma.Decimal, currency = "VND"): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency", currency,
    notation: "standard",
  }).format(Number(amount));
}

function parsePeriodKey(periodKey: string): { year: number; month: number } {
  const [y, m] = periodKey.split("-").map(Number);
  return { year: y, month: m };
}

function addOneMonth(year: number, month: number): { year: number; month: number } {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

export const financeEntryService = {
  
  async getMonthOverview(ownerId: number, query: MonthOverviewQuery): Promise<MonthOverviewDTO> {
    const tz = query.timezone ?? "Asia/Ho_Chi_Minh";
    const { year, month } = parsePeriodKey(query.periodKey);
    const next = addOneMonth(year, month);

    const dayRows = await prisma.$queryRaw<Array<{ dayKey: string; count: number }>>(
      Prisma.sql`
        SELECT
          to_char(date((("occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz})), 'YYYY-MM-DD') AS "dayKey",
          count(*)::int AS "count"
        FROM "FinanceEntry"
        WHERE
          "ownerId" = ${ownerId}
          AND "deletedAt" IS NULL
          AND "occurredAt" >= (make_timestamptz(${year}, ${month}, 1, 0, 0, 0, ${tz}) AT TIME ZONE 'UTC')
          AND "occurredAt" < (make_timestamptz(${next.year}, ${next.month}, 1, 0, 0, 0, ${tz}) AT TIME ZONE 'UTC')
        GROUP BY 1
      `,
    );

    const statsRow = await prisma.$queryRaw<
      Array<{ totalIncome: Prisma.Decimal; totalExpense: Prisma.Decimal; entryCount: number }>
    >(
      Prisma.sql`
        SELECT
          COALESCE(SUM("amount") FILTER (WHERE "entryKind" = 'INCOME' AND "lifecycleStatus" = 'POSTED'), 0) AS "totalIncome",
          COALESCE(SUM("amount") FILTER (WHERE "entryKind" = 'EXPENSE' AND "lifecycleStatus" = 'POSTED'), 0) AS "totalExpense",
          COUNT(*)::int AS "entryCount"
        FROM "FinanceEntry"
        WHERE
          "ownerId" = ${ownerId}
          AND "deletedAt" IS NULL
          AND "occurredAt" >= (make_timestamptz(${year}, ${month}, 1, 0, 0, 0, ${tz}) AT TIME ZONE 'UTC')
          AND "occurredAt" < (make_timestamptz(${next.year}, ${next.month}, 1, 0, 0, 0, ${tz}) AT TIME ZONE 'UTC')
      `,
    );

    const dayCounts: MonthDayCountsDTO = {};
    for (const r of dayRows) dayCounts[r.dayKey] = r.count;

    const totalIncome = Number(statsRow[0]?.totalIncome ?? 0);
    const totalExpense = Number(statsRow[0]?.totalExpense ?? 0);
    const entryCount = Number(statsRow[0]?.entryCount ?? 0);

    return {
      periodKey: query.periodKey,
      dayCounts,
      stats: {
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense,
        entryCount,
      },
    };
  },

  /**
   * Chi EXPENSE + POSTED trong [đầu tháng, đầu tháng sau) theo TZ.
   * Chỉ cộng `amount` khi `currency` khớp `query.currency` (MVP đa tiền tệ).
   */
  async getExpenseTotalsByCategoryForMonth(
    ownerId: number,
    query: ExpenseMonthAggregateQuery,
  ): Promise<ExpenseMonthAggregateDTO> {
    const tz = query.timezone ?? "Asia/Ho_Chi_Minh";
    const { year, month } = parsePeriodKey(query.periodKey);
    const next = addOneMonth(year, month);
    const currency = query.currency;

    const [totalRow, foreignCountRow, catRows] = await Promise.all([
      prisma.$queryRaw<Array<{ total: Prisma.Decimal }>>(
        Prisma.sql`
          SELECT COALESCE(SUM("amount"), 0)::decimal(14,2) AS total
          FROM "FinanceEntry"
          WHERE
            "ownerId" = ${ownerId}
            AND "deletedAt" IS NULL
            AND "entryKind" = 'EXPENSE'
            AND "lifecycleStatus" = 'POSTED'
            AND "currency" = ${currency}
            AND "occurredAt" >= (make_timestamptz(${year}, ${month}, 1, 0, 0, 0, ${tz}) AT TIME ZONE 'UTC')
            AND "occurredAt" < (make_timestamptz(${next.year}, ${next.month}, 1, 0, 0, 0, ${tz}) AT TIME ZONE 'UTC')
        `,
      ),
      prisma.$queryRaw<Array<{ c: bigint }>>(
        Prisma.sql`
          SELECT COUNT(*)::bigint AS c
          FROM "FinanceEntry"
          WHERE
            "ownerId" = ${ownerId}
            AND "deletedAt" IS NULL
            AND "entryKind" = 'EXPENSE'
            AND "lifecycleStatus" = 'POSTED'
            AND "currency" <> ${currency}
            AND "occurredAt" >= (make_timestamptz(${year}, ${month}, 1, 0, 0, 0, ${tz}) AT TIME ZONE 'UTC')
            AND "occurredAt" < (make_timestamptz(${next.year}, ${next.month}, 1, 0, 0, 0, ${tz}) AT TIME ZONE 'UTC')
        `,
      ),
      prisma.$queryRaw<Array<{ categoryId: number; total: Prisma.Decimal }>>(
        Prisma.sql`
          SELECT fe."categoryId", COALESCE(SUM(fe."amount"), 0)::decimal(14,2) AS total
          FROM "FinanceEntry" fe
          WHERE
            fe."ownerId" = ${ownerId}
            AND fe."deletedAt" IS NULL
            AND fe."entryKind" = 'EXPENSE'
            AND fe."lifecycleStatus" = 'POSTED'
            AND fe."currency" = ${currency}
            AND fe."categoryId" IS NOT NULL
            AND fe."occurredAt" >= (make_timestamptz(${year}, ${month}, 1, 0, 0, 0, ${tz}) AT TIME ZONE 'UTC')
            AND fe."occurredAt" < (make_timestamptz(${next.year}, ${next.month}, 1, 0, 0, 0, ${tz}) AT TIME ZONE 'UTC')
          GROUP BY fe."categoryId"
        `,
      ),
    ]);

    const byCategoryId: Record<number, number> = {};
    for (const r of catRows) {
      byCategoryId[r.categoryId] = Number(r.total);
    }

    return {
      totalExpensePosted: Number(totalRow[0]?.total ?? 0),
      byCategoryId,
      foreignCurrencyExpenseCount: Number(foreignCountRow[0]?.c ?? 0),
    };
  },

  // ── List with cursor-based pagination ─────────────────────────────────────
  async getListPage(ownerId: number, rawQuery: EntryListQuery): Promise<EntryListPageDTO> {
    const limit = Math.min(rawQuery.limit, 50);

    // Build dateFrom/dateTo from periodKey shortcut if provided
    let dateFrom = rawQuery.dateFrom ? new Date(rawQuery.dateFrom) : undefined;
    let dateTo = rawQuery.dateTo ? new Date(rawQuery.dateTo) : undefined;
    if (dateTo) {
      dateTo.setUTCHours(23, 59, 59, 999);
    }
    if (rawQuery.periodKey) {
      const [y, m] = rawQuery.periodKey.split("-").map(Number);
      dateFrom = new Date(y, m - 1, 1);
      dateTo = new Date(y, m, 0, 23, 59, 59);
    }

    const where: Prisma.FinanceEntryWhereInput = {
      ownerId,
      deletedAt: null,
      ...(rawQuery.walletId ? { walletId: rawQuery.walletId } : {}),
      ...(rawQuery.categoryId ? { categoryId: rawQuery.categoryId } : {}),
      ...(rawQuery.entryKind && rawQuery.entryKind !== "ALL" ? { entryKind: rawQuery.entryKind } : {}),
      ...(rawQuery.lifecycleStatus && rawQuery.lifecycleStatus !== "ALL" ? { lifecycleStatus: rawQuery.lifecycleStatus } : {}),
      ...(dateFrom || dateTo ? {
        occurredAt: {
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lte: dateTo } : {}),
        }
      } : {}),
      ...(rawQuery.search ? {
        OR: [
          { note: { contains: rawQuery.search, mode: "insensitive" } },
          { category: { name: { contains: rawQuery.search, mode: "insensitive" } } },
          { wallet: { name: { contains: rawQuery.search, mode: "insensitive" } } },
        ]
      } : {}),
    };

    // Ordering
    const orderBy: Prisma.FinanceEntryOrderByWithRelationInput[] =
      rawQuery.sortKey === "OLDEST" ? [{ occurredAt: "asc" }, { id: "asc" }] :
      rawQuery.sortKey === "AMOUNT_DESC" ? [{ amount: "desc" }, { id: "desc" }] :
      rawQuery.sortKey === "AMOUNT_ASC" ? [{ amount: "asc" }, { id: "asc" }] :
      [{ occurredAt: "desc" }, { id: "desc" }]; // NEWEST default

    const entries = await prisma.financeEntry.findMany({
      where,
      orderBy,
      ...(rawQuery.cursorId ? { cursor: { id: rawQuery.cursorId }, skip: 1 } : {}),
      take: limit + 1,
      include: {
        category: { select: { name: true, icon: true, color: true } },
        wallet: { select: { name: true } },
        tags: { include: { tag: { select: { name: true } } } },
      },
    });

    const hasMore = entries.length > limit;
    const sliced = hasMore ? entries.slice(0, limit) : entries;
    const nextCursorId = hasMore ? entries[limit].id : null;

    // Aggregate stats (không bị filter bởi cursor/limit) — 1 query thay cho 3 aggregate/count
    const statsConditions: Prisma.Sql[] = [
      Prisma.sql`fe."ownerId" = ${ownerId}`,
      Prisma.sql`fe."deletedAt" IS NULL`,
    ];
    if (dateFrom) statsConditions.push(Prisma.sql`fe."occurredAt" >= ${dateFrom}`);
    if (dateTo) statsConditions.push(Prisma.sql`fe."occurredAt" <= ${dateTo}`);
    if (rawQuery.walletId) statsConditions.push(Prisma.sql`fe."walletId" = ${rawQuery.walletId}`);
    if (rawQuery.categoryId) statsConditions.push(Prisma.sql`fe."categoryId" = ${rawQuery.categoryId}`);
    if (rawQuery.entryKind && rawQuery.entryKind !== "ALL") {
      statsConditions.push(Prisma.sql`fe."entryKind" = ${rawQuery.entryKind}::"FinanceEntryKind"`);
    }
    if (rawQuery.lifecycleStatus && rawQuery.lifecycleStatus !== "ALL") {
      statsConditions.push(Prisma.sql`fe."lifecycleStatus" = ${rawQuery.lifecycleStatus}::"FinanceEntryLifecycle"`);
    }
    if (rawQuery.search) {
      const pattern = `%${rawQuery.search}%`;
      statsConditions.push(Prisma.sql`(
        fe."note" ILIKE ${pattern}
        OR EXISTS (
          SELECT 1 FROM "FinanceCategory" c
          WHERE c."id" = fe."categoryId" AND c."name" ILIKE ${pattern}
        )
        OR EXISTS (
          SELECT 1 FROM "FinanceWallet" w
          WHERE w."id" = fe."walletId" AND w."name" ILIKE ${pattern}
        )
      )`);
    }

    const statsRows = await prisma.$queryRaw<
      Array<{ entryCount: number; totalIncome: Prisma.Decimal; totalExpense: Prisma.Decimal }>
    >(
      Prisma.sql`
        SELECT
          COUNT(*)::int AS "entryCount",
          COALESCE(SUM(fe."amount") FILTER (WHERE fe."entryKind" = 'INCOME' AND fe."lifecycleStatus" = 'POSTED'), 0) AS "totalIncome",
          COALESCE(SUM(fe."amount") FILTER (WHERE fe."entryKind" = 'EXPENSE' AND fe."lifecycleStatus" = 'POSTED'), 0) AS "totalExpense"
        FROM "FinanceEntry" fe
        WHERE ${Prisma.join(statsConditions, " AND ")}
      `,
    );

    const totalIncome = Number(statsRows[0]?.totalIncome ?? 0);
    const totalExpense = Number(statsRows[0]?.totalExpense ?? 0);
    const netBalance = totalIncome - totalExpense;
    const countAgg = Number(statsRows[0]?.entryCount ?? 0);

    const items = sliced.map((e) => ({
      id: e.id,
      entryKind: e.entryKind,
      lifecycleStatus: e.lifecycleStatus,
      amountText: formatMoney(e.amount, e.currency),
      amountRaw: Number(e.amount),
      currency: e.currency,
      categoryName: e.category?.name ?? null,
      categoryIcon: e.category?.icon ?? null,
      categoryColor: e.category?.color ?? null,
      walletId: e.walletId,
      categoryId: e.categoryId ?? null,
      walletName: e.wallet.name,
      occurredAt: e.occurredAt.toISOString(),
      occurredAtText: e.occurredAt.toLocaleDateString("vi-VN"),
      note: e.note ?? null,
      tagNames: e.tags.map((t) => t.tag.name),
      isTransfer: e.entryKind === "TRANSFER_OUT" || e.entryKind === "TRANSFER_IN", // Dựa theo schema hoặc kind. Prisma schema defined TRANSFER_OUT / TRANSFER_IN instead of just TRANSFER. Wait, let's look at schema.
      transferPairId: e.transferPairId ?? null,
    }));

    return {
      items,
      stats: {
        totalIncome,
        totalExpense,
        netBalance,
        totalIncomeText: formatMoney(new Prisma.Decimal(totalIncome)),
        totalExpenseText: formatMoney(new Prisma.Decimal(totalExpense)),
        netBalanceText: formatMoney(new Prisma.Decimal(Math.abs(netBalance))),
        entryCount: countAgg,
      },
      nextCursorId,
    };
  },

  // ── Lite list for category-month drawer ───────────────────────────────────
  async getCategoryMonthExpensePostedPageLite(
    ownerId: number,
    input: { periodKey: string; categoryId: number; limit: number; cursorId?: number },
  ): Promise<Pick<EntryListPageDTO, "items" | "nextCursorId"> & { entryCount: number; totalExpense: number }> {
    const limit = Math.min(Math.max(input.limit, 1), 50);

    const [y, m] = input.periodKey.split("-").map(Number);
    const dateFrom = new Date(y, m - 1, 1);
    const dateTo = new Date(y, m, 0, 23, 59, 59);

    const where: Prisma.FinanceEntryWhereInput = {
      ownerId,
      deletedAt: null,
      categoryId: input.categoryId,
      entryKind: "EXPENSE",
      lifecycleStatus: "POSTED",
      occurredAt: {
        gte: dateFrom,
        lte: dateTo,
      },
    };

    const rows = await prisma.financeEntry.findMany({
      where,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      ...(input.cursorId ? { cursor: { id: input.cursorId }, skip: 1 } : {}),
      take: limit + 1,
      select: {
        id: true,
        entryKind: true,
        lifecycleStatus: true,
        amount: true,
        currency: true,
        occurredAt: true,
        note: true,
        walletId: true,
        categoryId: true,
        wallet: { select: { name: true } },
      },
    });

    const hasMore = rows.length > limit;
    const sliced = hasMore ? rows.slice(0, limit) : rows;
    const nextCursorId = hasMore ? rows[limit].id : null;

    const statsRows = await prisma.$queryRaw<
      Array<{ entryCount: number; totalExpense: Prisma.Decimal }>
    >(
      Prisma.sql`
        SELECT
          COUNT(*)::int AS "entryCount",
          COALESCE(SUM(fe."amount"), 0) AS "totalExpense"
        FROM "FinanceEntry" fe
        WHERE
          fe."ownerId" = ${ownerId}
          AND fe."deletedAt" IS NULL
          AND fe."categoryId" = ${input.categoryId}
          AND fe."entryKind" = 'EXPENSE'
          AND fe."lifecycleStatus" = 'POSTED'
          AND fe."occurredAt" >= ${dateFrom}
          AND fe."occurredAt" <= ${dateTo}
      `,
    );

    const entryCount = Number(statsRows[0]?.entryCount ?? 0);
    const totalExpense = Number(statsRows[0]?.totalExpense ?? 0);

    const items: EntryListItemDTO[] = sliced.map((e) => ({
      id: e.id,
      entryKind: e.entryKind,
      lifecycleStatus: e.lifecycleStatus,
      amountText: formatMoney(e.amount, e.currency),
      amountRaw: Number(e.amount),
      currency: e.currency,
      categoryName: null,
      categoryIcon: null,
      categoryColor: null,
      walletId: e.walletId,
      categoryId: e.categoryId ?? null,
      walletName: e.wallet.name,
      occurredAt: e.occurredAt.toISOString(),
      occurredAtText: e.occurredAt.toLocaleDateString("vi-VN"),
      note: e.note ?? null,
      tagNames: [],
      isTransfer: false,
      transferPairId: null,
    }));

    return { items, nextCursorId, entryCount, totalExpense };
  },

  // ── Get detail ─────────────────────────────────────────────────────────────
  async getById(ownerId: number, entryId: number): Promise<EntryDetailDTO | null> {
    const e = await (prisma as any).financeEntry.findFirst({
      where: { id: entryId, ownerId, deletedAt: null },
      include: {
        category: { select: { name: true, icon: true, color: true } },
        wallet: { select: { name: true } },
        tags: { include: { tag: { select: { name: true } } } },
        goalContributions: { include: { goal: { select: { title: true } } } },
        loanPayments: {
          where: { deletedAt: null },
          include: { loan: { select: { name: true } } },
        },
        attachments: { select: { id: true, fileName: true, fileUrl: true, fileType: true } },
      },
    });
    if (!e) return null;

    return {
      id: e.id,
      entryKind: e.entryKind,
      lifecycleStatus: e.lifecycleStatus,
      amountText: formatMoney(e.amount, e.currency),
      amountRaw: Number(e.amount),
      currency: e.currency,
      categoryName: e.category?.name ?? null,
      categoryIcon: e.category?.icon ?? null,
      categoryColor: e.category?.color ?? null,
      walletName: e.wallet.name,
      walletId: e.walletId,
      categoryId: e.categoryId ?? null,
      occurredAt: e.occurredAt.toISOString(),
      occurredAtText: e.occurredAt.toLocaleDateString("vi-VN"),
      note: e.note ?? null,
      tagNames: (e.tags as Array<{ tag: { name: string } }>).map((t) => t.tag.name),
      isTransfer: e.entryKind === "TRANSFER_IN" || e.entryKind === "TRANSFER_OUT",
      splitGroupId: e.splitGroupId ?? null,
      transferPairId: e.transferPairId ?? null,
      parentEntryId: e.parentEntryId ?? null,
      recurringRuleId: e.recurringRuleId ?? null,
      goalContributions: (e.goalContributions as Array<{
        goalId: number;
        goal: { title: string };
        amount: Prisma.Decimal;
      }>).map((gc) => ({
        goalId: gc.goalId,
        goalTitle: gc.goal.title,
        amount: formatMoney(gc.amount),
      })),
      loanPayments: (e.loanPayments as Array<{
        loanId: number;
        loan: { name: string };
        amount: Prisma.Decimal;
      }>).map((lp) => ({
        loanId: lp.loanId,
        loanName: lp.loan.name,
        amount: formatMoney(lp.amount),
      })),
      attachments: e.attachments,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  },

  // ── Create INCOME / EXPENSE ───────────────────────────────────────────────
  async create(ownerId: number, data: {
    walletId: number;
    categoryId?: number | null;
    entryKind: "INCOME" | "EXPENSE";
    lifecycleStatus?: FinanceEntryLifecycle;
    amount: Prisma.Decimal;
    currency?: string;
    occurredAt: Date;
    note?: string | null;
    tagIds?: number[];
    recurringRuleId?: number | null;
    importBatchId?: number | null;
    splitGroupId?: string | null;
  }) {
    const created = await prisma.financeEntry.create({
      data: {
        ownerId,
        walletId: data.walletId,
        categoryId: data.categoryId ?? null,
        entryKind: data.entryKind,
        lifecycleStatus: data.lifecycleStatus ?? "POSTED",
        amount: data.amount,
        currency: data.currency ?? "VND",
        occurredAt: data.occurredAt,
        note: data.note ?? null,
        ...(data.recurringRuleId != null ? { recurringRuleId: data.recurringRuleId } : {}),
        ...(data.importBatchId != null ? { importBatchId: data.importBatchId } : {}),
        ...(data.splitGroupId != null ? { splitGroupId: data.splitGroupId } : {}),
      },
      select: { id: true },
    });
    if (data.tagIds?.length) {
      await prisma.financeEntryTag.createMany({
        data: data.tagIds.map((tagId) => ({ entryId: created.id, tagId })),
      });
    }
    return { ok: true as const, id: created.id };
  },

  // ── Create TRANSFER ────────────────────────────────────────────────────────
  async createTransfer(ownerId: number, data: {
    fromWalletId: number;
    toWalletId: number;
    amount: Prisma.Decimal;
    currency?: string;
    occurredAt: Date;
    note?: string | null;
  }) {
    const pairId = randomUUID();
    await prisma.$transaction([
      // Ghi nợ ví nguồn
      prisma.financeEntry.create({
        data: {
          owner: { connect: { id: ownerId } },
          wallet: { connect: { id: data.fromWalletId } },
          entryKind: "TRANSFER_OUT",
          lifecycleStatus: "POSTED",
          amount: data.amount,
          currency: data.currency ?? "VND",
          occurredAt: data.occurredAt,
          note: data.note ?? null,
          transferPairId: pairId,
        },
      }),
      // Ghi có ví đích
      prisma.financeEntry.create({
        data: {
          owner: { connect: { id: ownerId } },
          wallet: { connect: { id: data.toWalletId } },
          entryKind: "TRANSFER_IN",
          lifecycleStatus: "POSTED",
          amount: data.amount,
          currency: data.currency ?? "VND",
          occurredAt: data.occurredAt,
          note: data.note ?? null,
          transferPairId: pairId,
        },
      }),
    ]);
    return { ok: true as const };
  },

  // ── Update ────────────────────────────────────────────────────────────────
  async update(ownerId: number, entryId: number, data: {
    walletId?: number;
    categoryId?: number | null;
    lifecycleStatus?: FinanceEntryLifecycle;
    amount?: Prisma.Decimal;
    currency?: string;
    occurredAt?: Date;
    note?: string | null;
    tagIds?: number[];
  }) {
    const existing = await prisma.financeEntry.findFirst({
      where: { id: entryId, ownerId, deletedAt: null },
    });
    if (!existing) return { ok: false as const, error: "Không tìm thấy giao dịch" as const };

    await prisma.$transaction(async (tx) => {
      // Cập nhật tags nếu có
      if (data.tagIds !== undefined) {
        await tx.financeEntryTag.deleteMany({ where: { entryId } });
        if (data.tagIds.length > 0) {
          await tx.financeEntryTag.createMany({
            data: data.tagIds.map((tagId) => ({ entryId, tagId })),
          });
        }
      }

      await tx.financeEntry.update({
        where: { id: entryId },
        data: {
          ...(data.walletId ? { wallet: { connect: { id: data.walletId } } } : {}),
          ...(data.categoryId !== undefined
            ? { category: data.categoryId ? { connect: { id: data.categoryId } } : { disconnect: true } }
            : {}),
          ...(data.lifecycleStatus ? { lifecycleStatus: data.lifecycleStatus } : {}),
          ...(data.amount ? { amount: data.amount } : {}),
          ...(data.currency ? { currency: data.currency } : {}),
          ...(data.occurredAt ? { occurredAt: data.occurredAt } : {}),
          ...(data.note !== undefined ? { note: data.note } : {}),
        },
      });
    });

    return { ok: true as const };
  },

  // ── Soft delete ────────────────────────────────────────────────────────────
  async softDelete(ownerId: number, entryId: number) {
    const existing = await prisma.financeEntry.findFirst({
      where: { id: entryId, ownerId, deletedAt: null },
    });
    if (!existing) return { ok: false as const, error: "Không tìm thấy giao dịch" as const };

    await prisma.financeEntry.update({
      where: { id: entryId },
      data: { deletedAt: new Date() },
    });
    return { ok: true as const };
  },
};
