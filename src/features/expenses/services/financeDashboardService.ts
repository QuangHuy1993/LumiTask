import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type {
  DashboardBundleDTO,
  DashboardCategorySliceDTO,
  DashboardRangeQuery,
  DashboardRecentEntryDTO,
  DashboardSummaryDTO,
  DashboardTimeseriesDTO,
  DashboardWalletSliceDTO,
} from "../model/financeDashboardTypes";
import type { DashboardRangeQueryInput } from "../model/financeDashboardValidation";

function decToString(v: unknown): string {
  if (v == null) return "0";
  if (typeof v === "object" && v !== null && "toFixed" in v) {
    return (v as Prisma.Decimal).toFixed(2);
  }
  return String(v);
}

function deltaPct(current: Prisma.Decimal, prior: Prisma.Decimal): number | null {
  const p = Number(prior);
  if (p === 0) return null;
  return Math.round(((Number(current) - p) / p) * 10_000) / 100;
}

async function resolveDashboardWindow(q: DashboardRangeQueryInput): Promise<{ fromUtc: Date; toUtc: Date }> {
  const tz = q.tz;
  if (q.from && q.to) {
    const [fy, fm, fd] = q.from.split("-").map(Number);
    const [ty, tm, td] = q.to.split("-").map(Number);
    const startRows = await prisma.$queryRaw<Array<{ t: Date }>>(
      Prisma.sql`
        SELECT (make_timestamptz(${fy}, ${fm}, ${fd}, 0, 0, 0, ${tz}) AT TIME ZONE 'UTC') AS t
      `,
    );
    const endRows = await prisma.$queryRaw<Array<{ t: Date }>>(
      Prisma.sql`
        SELECT (make_timestamptz(${ty}, ${tm}, ${td}, 0, 0, 0, ${tz}) AT TIME ZONE 'UTC' + interval '1 day') AS t
      `,
    );
    return { fromUtc: startRows[0]!.t, toUtc: endRows[0]!.t };
  }
  if (q.preset === "thisMonth") {
    const rows = await prisma.$queryRaw<Array<{ start_utc: Date; end_utc: Date }>>(
      Prisma.sql`
        SELECT
          (
            (date_trunc('month', (now() AT TIME ZONE 'UTC') AT TIME ZONE ${tz}))
            AT TIME ZONE ${tz}
          ) AT TIME ZONE 'UTC' AS start_utc,
          (
            ((date_trunc('month', (now() AT TIME ZONE 'UTC') AT TIME ZONE ${tz})) + interval '1 month')
            AT TIME ZONE ${tz}
          ) AT TIME ZONE 'UTC' AS end_utc
      `,
    );
    return { fromUtc: rows[0]!.start_utc, toUtc: rows[0]!.end_utc };
  }
  const rows = await prisma.$queryRaw<Array<{ start_utc: Date; end_utc: Date }>>(
    Prisma.sql`
      SELECT
        (
          ((date_trunc('day', (now() AT TIME ZONE 'UTC') AT TIME ZONE ${tz}) - interval '30 days')
          AT TIME ZONE ${tz})
          AT TIME ZONE 'UTC'
        ) AS start_utc,
        (
          ((date_trunc('day', (now() AT TIME ZONE 'UTC') AT TIME ZONE ${tz}) + interval '1 day')
          AT TIME ZONE ${tz})
          AT TIME ZONE 'UTC'
        ) AS end_utc
    `,
  );
  return { fromUtc: rows[0]!.start_utc, toUtc: rows[0]!.end_utc };
}

async function aggregatePeriod(
  ownerId: number,
  fromUtc: Date,
  toUtc: Date,
  currency: string,
): Promise<{ income: Prisma.Decimal; expense: Prisma.Decimal; entryCount: number }> {
  const rows = await prisma.$queryRaw<
    Array<{ income: Prisma.Decimal; expense: Prisma.Decimal; entryCount: number }>
  >(
    Prisma.sql`
      SELECT
        COALESCE(SUM("amount") FILTER (WHERE "entryKind" = 'INCOME'), 0) AS income,
        COALESCE(SUM("amount") FILTER (WHERE "entryKind" = 'EXPENSE'), 0) AS expense,
        COUNT(*)::int AS "entryCount"
      FROM "FinanceEntry"
      WHERE
        "ownerId" = ${ownerId}
        AND "deletedAt" IS NULL
        AND "currency" = ${currency}
        AND "entryKind" IN ('INCOME', 'EXPENSE')
        AND "lifecycleStatus" = 'POSTED'
        AND "occurredAt" >= ${fromUtc}
        AND "occurredAt" < ${toUtc}
    `,
  );
  const r = rows[0]!;
  return { income: r.income, expense: r.expense, entryCount: r.entryCount };
}

async function walletBalanceTotal(ownerId: number, currency: string): Promise<string> {
  const rows = await prisma.$queryRaw<Array<{ bal: Prisma.Decimal }>>(
    Prisma.sql`
      SELECT COALESCE(SUM(
        CASE
          WHEN "entryKind" = 'INCOME' THEN "amount"::numeric
          WHEN "entryKind" = 'EXPENSE' THEN -"amount"::numeric
          ELSE 0::numeric
        END
      ), 0)::decimal(14,2) AS bal
      FROM "FinanceEntry"
      WHERE
        "ownerId" = ${ownerId}
        AND "deletedAt" IS NULL
        AND "currency" = ${currency}
        AND "entryKind" IN ('INCOME', 'EXPENSE')
        AND "lifecycleStatus" = 'POSTED'
    `,
  );
  return decToString(rows[0]?.bal ?? 0);
}

async function timeseriesDay(
  ownerId: number,
  fromUtc: Date,
  toUtc: Date,
  currency: string,
  tz: string,
): Promise<DashboardTimeseriesDTO> {
  const rows = await prisma.$queryRaw<Array<{ label: string; income: Prisma.Decimal; expense: Prisma.Decimal }>>(
    Prisma.sql`
      WITH days AS (
        SELECT generate_series(
          date((${fromUtc}::timestamptz AT TIME ZONE 'UTC') AT TIME ZONE ${tz}),
          date(((${toUtc}::timestamptz - interval '1 microsecond') AT TIME ZONE 'UTC') AT TIME ZONE ${tz}),
          interval '1 day'
        )::date AS d
      ),
      agg AS (
        SELECT
          date((("e"."occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz})) AS d,
          COALESCE(SUM("e"."amount") FILTER (WHERE "e"."entryKind" = 'INCOME'), 0) AS income,
          COALESCE(SUM("e"."amount") FILTER (WHERE "e"."entryKind" = 'EXPENSE'), 0) AS expense
        FROM "FinanceEntry" e
        WHERE
          "e"."ownerId" = ${ownerId}
          AND "e"."deletedAt" IS NULL
          AND "e"."currency" = ${currency}
          AND "e"."entryKind" IN ('INCOME', 'EXPENSE')
          AND "e"."lifecycleStatus" = 'POSTED'
          AND "e"."occurredAt" >= ${fromUtc}
          AND "e"."occurredAt" < ${toUtc}
        GROUP BY 1
      )
      SELECT
        to_char(days.d, 'YYYY-MM-DD') AS label,
        COALESCE(agg.income, 0) AS income,
        COALESCE(agg.expense, 0) AS expense
      FROM days
      LEFT JOIN agg ON agg.d = days.d
      ORDER BY days.d
    `,
  );
  return {
    granularity: "day",
    labels: rows.map((r) => r.label),
    income: rows.map((r) => decToString(r.income)),
    expense: rows.map((r) => decToString(r.expense)),
  };
}

async function timeseriesWeek(
  ownerId: number,
  fromUtc: Date,
  toUtc: Date,
  currency: string,
  tz: string,
): Promise<DashboardTimeseriesDTO> {
  const rows = await prisma.$queryRaw<Array<{ label: string; income: Prisma.Decimal; expense: Prisma.Decimal }>>(
    Prisma.sql`
      SELECT
        to_char(
          date_trunc('week', (("occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz})::timestamp),
          'YYYY-MM-DD'
        ) AS label,
        COALESCE(SUM("amount") FILTER (WHERE "entryKind" = 'INCOME'), 0) AS income,
        COALESCE(SUM("amount") FILTER (WHERE "entryKind" = 'EXPENSE'), 0) AS expense
      FROM "FinanceEntry"
      WHERE
        "ownerId" = ${ownerId}
        AND "deletedAt" IS NULL
        AND "currency" = ${currency}
        AND "entryKind" IN ('INCOME', 'EXPENSE')
        AND "lifecycleStatus" = 'POSTED'
        AND "occurredAt" >= ${fromUtc}
        AND "occurredAt" < ${toUtc}
      GROUP BY 1
      ORDER BY 1
    `,
  );
  return {
    granularity: "week",
    labels: rows.map((r) => r.label),
    income: rows.map((r) => decToString(r.income)),
    expense: rows.map((r) => decToString(r.expense)),
  };
}

async function byCategory(
  ownerId: number,
  fromUtc: Date,
  toUtc: Date,
  currency: string,
): Promise<DashboardCategorySliceDTO[]> {
  const rows = await prisma.$queryRaw<
    Array<{
      categoryId: number | null;
      name: string;
      color: string | null;
      icon: string | null;
      amount: Prisma.Decimal;
    }>
  >(
    Prisma.sql`
      SELECT
        fe."categoryId" AS "categoryId",
        COALESCE(c."name", 'Không phân loại') AS name,
        c."color" AS color,
        c."icon" AS icon,
        COALESCE(SUM(fe."amount"), 0) AS amount
      FROM "FinanceEntry" fe
      LEFT JOIN "FinanceCategory" c ON c."id" = fe."categoryId" AND c."deletedAt" IS NULL
      WHERE
        fe."ownerId" = ${ownerId}
        AND fe."deletedAt" IS NULL
        AND fe."currency" = ${currency}
        AND fe."entryKind" = 'EXPENSE'
        AND fe."lifecycleStatus" = 'POSTED'
        AND fe."occurredAt" >= ${fromUtc}
        AND fe."occurredAt" < ${toUtc}
      GROUP BY fe."categoryId", c."name", c."color", c."icon"
      ORDER BY amount DESC
    `,
  );
  const totalExpense = rows.reduce((s, r) => s + Number(r.amount), 0);
  return rows.map((r) => ({
    categoryId: r.categoryId ?? 0,
    name: r.name,
    color: r.color,
    icon: r.icon,
    amount: decToString(r.amount),
    pctOfExpense: totalExpense > 0 ? Math.round((Number(r.amount) / totalExpense) * 10_000) / 100 : 0,
  }));
}

async function byWallet(
  ownerId: number,
  fromUtc: Date,
  toUtc: Date,
  currency: string,
): Promise<DashboardWalletSliceDTO[]> {
  const rows = await prisma.$queryRaw<
    Array<{ walletId: number; income: Prisma.Decimal; expense: Prisma.Decimal }>
  >(
    Prisma.sql`
      SELECT
        "walletId",
        COALESCE(SUM("amount") FILTER (WHERE "entryKind" = 'INCOME'), 0) AS income,
        COALESCE(SUM("amount") FILTER (WHERE "entryKind" = 'EXPENSE'), 0) AS expense
      FROM "FinanceEntry"
      WHERE
        "ownerId" = ${ownerId}
        AND "deletedAt" IS NULL
        AND "currency" = ${currency}
        AND "entryKind" IN ('INCOME', 'EXPENSE')
        AND "lifecycleStatus" = 'POSTED'
        AND "occurredAt" >= ${fromUtc}
        AND "occurredAt" < ${toUtc}
      GROUP BY "walletId"
      ORDER BY "walletId"
    `,
  );
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.walletId);
  const wallets = await prisma.financeWallet.findMany({
    where: { ownerId, deletedAt: null, id: { in: ids } },
    select: { id: true, name: true },
  });
  const nameById = new Map(wallets.map((w) => [w.id, w.name]));
  return rows.map((r) => {
    const inc = decToString(r.income);
    const exp = decToString(r.expense);
    const netN = Number(r.income) - Number(r.expense);
    return {
      walletId: r.walletId,
      name: nameById.get(r.walletId) ?? `Ví #${r.walletId}`,
      income: inc,
      expense: exp,
      net: netN.toFixed(2),
    };
  });
}

async function recentEntries(
  ownerId: number,
  currency: string,
  limit: number,
): Promise<DashboardRecentEntryDTO[]> {
  const list = await prisma.financeEntry.findMany({
    where: {
      ownerId,
      deletedAt: null,
      currency,
      entryKind: { in: ["INCOME", "EXPENSE"] },
      lifecycleStatus: "POSTED",
    },
    orderBy: { occurredAt: "desc" },
    take: limit,
    select: {
      id: true,
      occurredAt: true,
      entryKind: true,
      amount: true,
      currency: true,
      note: true,
      category: { select: { name: true } },
      wallet: { select: { name: true } },
    },
  });
  return list.map((e) => ({
    id: e.id,
    occurredAt: e.occurredAt.toISOString(),
    entryKind: e.entryKind as "INCOME" | "EXPENSE",
    amount: decToString(e.amount),
    currency: e.currency,
    note: e.note,
    categoryName: e.category?.name ?? null,
    walletName: e.wallet.name,
  }));
}

function buildSummaryDTO(
  q: DashboardRangeQuery,
  fromUtc: Date,
  toUtc: Date,
  priorFrom: Date,
  priorTo: Date,
  cur: { income: Prisma.Decimal; expense: Prisma.Decimal; entryCount: number },
  prior: { income: Prisma.Decimal; expense: Prisma.Decimal; entryCount: number },
  walletBal: string,
): DashboardSummaryDTO {
  const netCur = Number(cur.income) - Number(cur.expense);
  return {
    range: {
      from: fromUtc.toISOString(),
      to: toUtc.toISOString(),
      tz: q.tz,
      currency: q.currency,
    },
    incomeTotal: decToString(cur.income),
    expenseTotal: decToString(cur.expense),
    net: netCur.toFixed(2),
    priorRange: { from: priorFrom.toISOString(), to: priorTo.toISOString() },
    priorIncomeTotal: decToString(prior.income),
    priorExpenseTotal: decToString(prior.expense),
    deltaPct: {
      income: deltaPct(cur.income, prior.income),
      expense: deltaPct(cur.expense, prior.expense),
    },
    walletBalanceTotal: walletBal,
    entryCount: cur.entryCount,
  };
}

export const financeDashboardService = {
  resolveDashboardWindow,

  async getSummary(ownerId: number, q: DashboardRangeQueryInput): Promise<DashboardSummaryDTO> {
    const { fromUtc, toUtc } = await resolveDashboardWindow(q);
    const durationMs = toUtc.getTime() - fromUtc.getTime();
    const priorTo = new Date(fromUtc.getTime());
    const priorFrom = new Date(fromUtc.getTime() - durationMs);

    const [cur, prior, walletBal] = await Promise.all([
      aggregatePeriod(ownerId, fromUtc, toUtc, q.currency),
      aggregatePeriod(ownerId, priorFrom, priorTo, q.currency),
      walletBalanceTotal(ownerId, q.currency),
    ]);

    const base: DashboardRangeQuery = {
      preset: q.preset,
      from: q.from,
      to: q.to,
      tz: q.tz,
      currency: q.currency,
    };
    return buildSummaryDTO(base, fromUtc, toUtc, priorFrom, priorTo, cur, prior, walletBal);
  },

  async getTimeseries(ownerId: number, q: DashboardRangeQueryInput): Promise<DashboardTimeseriesDTO> {
    const { fromUtc, toUtc } = await resolveDashboardWindow(q);
    const g = q.granularity ?? "day";
    if (g === "week") {
      return timeseriesWeek(ownerId, fromUtc, toUtc, q.currency, q.tz);
    }
    return timeseriesDay(ownerId, fromUtc, toUtc, q.currency, q.tz);
  },

  async getByCategory(ownerId: number, q: DashboardRangeQueryInput): Promise<DashboardCategorySliceDTO[]> {
    const { fromUtc, toUtc } = await resolveDashboardWindow(q);
    return byCategory(ownerId, fromUtc, toUtc, q.currency);
  },

  async getByWallet(ownerId: number, q: DashboardRangeQueryInput): Promise<DashboardWalletSliceDTO[]> {
    const { fromUtc, toUtc } = await resolveDashboardWindow(q);
    return byWallet(ownerId, fromUtc, toUtc, q.currency);
  },

  async getRecentEntries(ownerId: number, q: DashboardRangeQueryInput): Promise<DashboardRecentEntryDTO[]> {
    return recentEntries(ownerId, q.currency, q.recentLimit ?? 10);
  },

  async getDashboardBundle(ownerId: number, q: DashboardRangeQueryInput): Promise<DashboardBundleDTO> {
    const { fromUtc, toUtc } = await resolveDashboardWindow(q);
    const durationMs = toUtc.getTime() - fromUtc.getTime();
    const priorTo = new Date(fromUtc.getTime());
    const priorFrom = new Date(fromUtc.getTime() - durationMs);

    const base: DashboardRangeQuery = {
      preset: q.preset,
      from: q.from,
      to: q.to,
      tz: q.tz,
      currency: q.currency,
    };

    const [
      cur,
      prior,
      walletBal,
      timeseries,
      categories,
      wallets,
      recent,
    ] = await Promise.all([
      aggregatePeriod(ownerId, fromUtc, toUtc, q.currency),
      aggregatePeriod(ownerId, priorFrom, priorTo, q.currency),
      walletBalanceTotal(ownerId, q.currency),
      (q.granularity ?? "day") === "week"
        ? timeseriesWeek(ownerId, fromUtc, toUtc, q.currency, q.tz)
        : timeseriesDay(ownerId, fromUtc, toUtc, q.currency, q.tz),
      byCategory(ownerId, fromUtc, toUtc, q.currency),
      byWallet(ownerId, fromUtc, toUtc, q.currency),
      recentEntries(ownerId, q.currency, q.recentLimit ?? 10),
    ]);

    const summary = buildSummaryDTO(
      base,
      fromUtc,
      toUtc,
      priorFrom,
      priorTo,
      cur,
      prior,
      walletBal,
    );

    return {
      summary,
      timeseries,
      byCategory: categories,
      byWallet: wallets,
      recentEntries: recent,
    };
  },
};
