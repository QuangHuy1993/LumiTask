import { Prisma, TransactionDirection, TransactionStatus, type PaymentStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { formatMoneyVND } from "@/features/work-batches/model/moneyFormat";
import type {
  JobsDashboardFilters,
  JobsDashboardKpis,
  JobsDashboardSeries,
  JobsDashboardTopLists,
  JobsDashboardVM,
  JobsDashboardPreset,
} from "@/features/reports-dashboard/model/jobsDashboardTypes";

function resolveRange(preset: JobsDashboardPreset, from?: string | null, to?: string | null) {
  const now = new Date();

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  let fromDate: Date;
  let toDate: Date;

  switch (preset) {
    case "LAST_7_DAYS": {
      toDate = now;
      fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 6);
      break;
    }
    case "LAST_30_DAYS": {
      toDate = now;
      fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 29);
      break;
    }
    case "THIS_MONTH": {
      fromDate = startOfMonth;
      toDate = now;
      break;
    }
    case "THIS_QUARTER": {
      const quarter = Math.floor(now.getMonth() / 3);
      fromDate = new Date(now.getFullYear(), quarter * 3, 1);
      toDate = now;
      break;
    }
    case "THIS_YEAR": {
      fromDate = startOfYear;
      toDate = now;
      break;
    }
    case "CUSTOM":
    default: {
      fromDate = from ? new Date(from) : startOfMonth;
      toDate = to ? new Date(to) : now;
      break;
    }
  }

  // Normalise to day boundaries
  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);

  return { fromDate, toDate };
}

export const jobsDashboardService = {
  async getDashboardData(filters: JobsDashboardFilters): Promise<JobsDashboardVM> {
    const { fromDate, toDate } = resolveRange(filters.preset, filters.from, filters.to);
    const batchId = filters.batchId ?? null;

    return prisma.$transaction(async (tx) => {
      const kpis = await this.getKpis(tx, fromDate, toDate, batchId);
      const series = await this.getSeries(tx, fromDate, toDate, batchId);
      const topLists = await this.getTopLists(tx, fromDate, toDate, batchId);

      return {
        kpis,
        series,
        topLists,
        filtersResolved: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          preset: filters.preset,
          batchId,
        },
      };
    });
  },

  async getKpis(
    db: Prisma.TransactionClient,
    fromDate: Date,
    toDate: Date,
    batchId: number | null,
  ): Promise<JobsDashboardKpis> {
    // Q1: gross + commission via raw aggregate
    const grossAndCommission = await db.$queryRaw<
      { gross: Prisma.Decimal; commission: Prisma.Decimal }[]
    >`
      SELECT 
        COALESCE(SUM(t."amount"), 0) AS gross,
        COALESCE((
          SELECT SUM(j."referralFee") 
          FROM "Job" j
          WHERE j.id IN (
            SELECT DISTINCT t2."jobId"
            FROM "Transaction" t2
            WHERE t2."direction" = ${TransactionDirection.INCOMING}
              AND t2."status" = ${TransactionStatus.COMPLETED}
              AND t2."deletedAt" IS NULL
              AND t2."transactionDate" BETWEEN ${fromDate} AND ${toDate}
              AND t2."jobId" IS NOT NULL
          )
        ), 0) AS commission
      FROM "Transaction" t
      WHERE t."direction" = ${TransactionDirection.INCOMING}
        AND t."status" = ${TransactionStatus.COMPLETED}
        AND t."deletedAt" IS NULL
        AND t."transactionDate" BETWEEN ${fromDate} AND ${toDate};
    `;

    const gross = grossAndCommission[0]?.gross ?? new Prisma.Decimal(0);
    const commission = grossAndCommission[0]?.commission ?? new Prisma.Decimal(0);
    const net = gross.minus(commission);

    // Q2: job status / payment metrics
    const jobMetrics = await db.$queryRaw<
      {
        total_jobs: bigint;
        overdue: bigint;
        unpaid_remaining: Prisma.Decimal;
      }[]
    >`
      SELECT
        COUNT(*) AS total_jobs,
        COUNT(*) FILTER (
          WHERE "deadline" < NOW()
            AND "status" NOT IN ('COMPLETED','CANCELLED')
        ) AS overdue,
        COALESCE(
          SUM(GREATEST("amount" - "totalPaid", 0)) 
            FILTER (WHERE "paymentStatus" != 'COMPLETED'),
          0
        ) AS unpaid_remaining
      FROM "Job"
      WHERE "deletedAt" IS NULL
        AND "createdAt" BETWEEN ${fromDate} AND ${toDate}
        AND (${batchId}::int IS NULL OR "batchId" = ${batchId});
    `;

    const jm = jobMetrics[0];
    const totalJobs = jm ? Number(jm.total_jobs) : 0;
    const overdueJobs = jm ? Number(jm.overdue) : 0;
    const unpaidRemaining = jm?.unpaid_remaining ?? new Prisma.Decimal(0);

    // Q3: top referrer by commission in period
    const topReferrers = await db.job.groupBy({
      by: ["referrer"],
      where: {
        deletedAt: null,
        referrer: { not: null },
        transactions: {
          some: {
            deletedAt: null,
            direction: TransactionDirection.INCOMING,
            status: TransactionStatus.COMPLETED,
            transactionDate: { gte: fromDate, lte: toDate },
          },
        },
        ...(batchId ? { batchId } : {}),
      },
      _sum: { referralFee: true },
      _count: { _all: true },
      orderBy: { _sum: { referralFee: "desc" } },
      take: 1,
    });

    const topRef = topReferrers[0];

    return {
      grossRevenue: formatMoneyVND(gross),
      netRevenue: formatMoneyVND(net),
      commissionPaid: formatMoneyVND(commission),
      unpaidRemaining: formatMoneyVND(unpaidRemaining),
      overdueJobs,
      totalJobs,
      topReferrer: topRef
        ? {
            name: topRef.referrer as string,
            commission: formatMoneyVND(topRef._sum.referralFee ?? new Prisma.Decimal(0)),
          }
        : null,
    };
  },

  async getSeries(
    db: Prisma.TransactionClient,
    fromDate: Date,
    toDate: Date,
    batchId: number | null,
  ): Promise<JobsDashboardSeries> {
    // Revenue trend: fetch transactions once then group in JS by month
    const txs = await db.transaction.findMany({
      where: {
        deletedAt: null,
        direction: TransactionDirection.INCOMING,
        status: TransactionStatus.COMPLETED,
        transactionDate: { gte: fromDate, lte: toDate },
        ...(batchId
          ? {
              job: {
                batchId,
              },
            }
          : {}),
      },
      select: {
        amount: true,
        transactionDate: true,
        job: {
          select: {
            referralFee: true,
          },
        },
      },
    });

    const revenueByBucket = new Map<
      string,
      { gross: Prisma.Decimal; commission: Prisma.Decimal }
    >();

    for (const t of txs) {
      const d = t.transactionDate;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const current = revenueByBucket.get(key) ?? {
        gross: new Prisma.Decimal(0),
        commission: new Prisma.Decimal(0),
      };
      current.gross = current.gross.plus(t.amount);
      if (t.job?.referralFee) {
        current.commission = current.commission.plus(t.job.referralFee);
      }
      revenueByBucket.set(key, current);
    }

    const sortedBuckets = Array.from(revenueByBucket.entries()).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    const revenueTrend = sortedBuckets.map(([bucketLabel, value]) => {
      const net = value.gross.minus(value.commission);
      return {
        bucketLabel,
        gross: Number(value.gross),
        commission: Number(value.commission),
        net: Number(net),
      };
    });

    // Job status trend + payment breakdown (coarse)
    const jobs = await db.job.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: fromDate, lte: toDate },
        ...(batchId ? { batchId } : {}),
      },
      select: {
        createdAt: true,
        status: true,
        paymentStatus: true,
      },
    });

    const statusByBucket = new Map<
      string,
      { notStarted: number; inProgress: number; completed: number; cancelled: number }
    >();

    const paymentStatusCounts = new Map<PaymentStatus, number>();

    for (const j of jobs) {
      const d = j.createdAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = statusByBucket.get(key) ?? {
        notStarted: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
      };
      switch (j.status) {
        case "NOT_STARTED":
          bucket.notStarted += 1;
          break;
        case "IN_PROGRESS":
          bucket.inProgress += 1;
          break;
        case "COMPLETED":
          bucket.completed += 1;
          break;
        case "CANCELLED":
          bucket.cancelled += 1;
          break;
      }
      statusByBucket.set(key, bucket);

      paymentStatusCounts.set(j.paymentStatus, (paymentStatusCounts.get(j.paymentStatus) ?? 0) + 1);
    }

    const jobStatusTrend = Array.from(statusByBucket.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([bucketLabel, v]) => ({
        bucketLabel,
        ...v,
      }));

    const paymentStatusBreakdown = Array.from(paymentStatusCounts.entries()).map(
      ([status, count]) => ({
        status,
        count,
      }),
    );

    return {
      revenueTrend,
      jobStatusTrend,
      paymentStatusBreakdown,
    };
  },

  async getTopLists(
    db: Prisma.TransactionClient,
    fromDate: Date,
    toDate: Date,
    batchId: number | null,
  ): Promise<JobsDashboardTopLists> {
    // Top clients by net revenue (sum of incoming - referral)
    const txWithJob = await db.transaction.findMany({
      where: {
        deletedAt: null,
        direction: TransactionDirection.INCOMING,
        status: TransactionStatus.COMPLETED,
        transactionDate: { gte: fromDate, lte: toDate },
        job: {
          deletedAt: null,
          ...(batchId ? { batchId } : {}),
        },
      },
      select: {
        amount: true,
        job: {
          select: {
            client: { select: { name: true } },
            referralFee: true,
            batch: { select: { name: true } },
            referrer: true,
          },
        },
      },
    });

    const clientMap = new Map<string, Prisma.Decimal>();
    const batchMap = new Map<string, { gross: Prisma.Decimal; commission: Prisma.Decimal }>();
    const referrerMap = new Map<string, { commission: Prisma.Decimal; jobs: number }>();

    for (const t of txWithJob) {
      const clientName = t.job?.client?.name ?? "Khác";
      const batchName = t.job?.batch?.name ?? "Khác";
      const referralFee = t.job?.referralFee ?? new Prisma.Decimal(0);
      const netContribution = t.amount.minus(referralFee);

      // Client
      clientMap.set(
        clientName,
        (clientMap.get(clientName) ?? new Prisma.Decimal(0)).plus(netContribution),
      );

      // Batch
      const batch = batchMap.get(batchName) ?? {
        gross: new Prisma.Decimal(0),
        commission: new Prisma.Decimal(0),
      };
      batch.gross = batch.gross.plus(t.amount);
      batch.commission = batch.commission.plus(referralFee);
      batchMap.set(batchName, batch);

      // Referrer
      if (t.job?.referrer) {
        const key = t.job.referrer;
        const r = referrerMap.get(key) ?? {
          commission: new Prisma.Decimal(0),
          jobs: 0,
        };
        r.commission = r.commission.plus(referralFee);
        r.jobs += 1;
        referrerMap.set(key, r);
      }
    }

    const topClients = Array.from(clientMap.entries())
      .map(([clientName, netRevenue]) => ({
        clientName,
        netRevenue: Number(netRevenue),
      }))
      .sort((a, b) => b.netRevenue - a.netRevenue)
      .slice(0, 5);

    const topBatches = Array.from(batchMap.entries())
      .map(([batchName, value]) => {
        const net = value.gross.minus(value.commission);
        return {
          batchName,
          gross: Number(value.gross),
          commission: Number(value.commission),
          net: Number(net),
        };
      })
      .sort((a, b) => b.gross - a.gross)
      .slice(0, 5);

    const topReferrers = Array.from(referrerMap.entries())
      .map(([referrer, value]) => ({
        referrer,
        commission: Number(value.commission),
        jobs: value.jobs,
      }))
      .sort((a, b) => b.commission - a.commission)
      .slice(0, 5);

    return {
      topClients,
      topBatches,
      topReferrers,
    };
  },
};

