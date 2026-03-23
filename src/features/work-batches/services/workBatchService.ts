import { Prisma, type PaymentStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { formatMoneyVND } from "@/features/work-batches/model/moneyFormat";
import type {
  WorkBatchDetailDTO,
  WorkBatchListItemDTO,
  WorkBatchStatsDTO,
  WorkBatchJobRowDTO,
  AssignableJobDTO,
  WorkBatchOptionDTO,
  WorkBatchListPageDTO,
  WorkBatchListQuery,
  WorkBatchListSortKey,
} from "@/features/work-batches/model/workBatchTypes";

function toIso(d: Date) {
  return d.toISOString();
}

function normalizeBatchName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function unpaidWhere(paymentStatusCompleted: PaymentStatus = "COMPLETED") {
  return {
    OR: [{ isPaid: false }, { paymentStatus: { not: paymentStatusCompleted } }],
  };
}

function toEndOfDay(dateInput: string) {
  const d = new Date(dateInput);
  d.setHours(23, 59, 59, 999);
  return d;
}

function toStartOfDay(dateInput: string) {
  const d = new Date(dateInput);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildOrderBy(sortKey: WorkBatchListSortKey | undefined) {
  switch (sortKey) {
    case "OLDEST":
      return [{ startDate: "asc" as const }, { id: "asc" as const }];
    case "NAME_ASC":
      return [{ name: "asc" as const }, { id: "asc" as const }];
    // UNPAID_DESC can't be expressed without DB-side computed aggregates; fallback to newest.
    case "UNPAID_DESC":
    case "NEWEST":
    default:
      return [{ startDate: "desc" as const }, { id: "desc" as const }];
  }
}

export const workBatchService = {
  async getListPage(query: WorkBatchListQuery): Promise<WorkBatchListPageDTO> {
    const limit = Math.min(Math.max(query.limit, 1), 50);
    const term = (query.search ?? "").trim();
    const status = query.status ?? "ALL";

    const where: Prisma.WorkBatchWhereInput = {
      deletedAt: null,
      ...(status !== "ALL" ? { status } : {}),
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { note: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(query.dateFrom ? { startDate: { gte: toStartOfDay(query.dateFrom) } } : {}),
      ...(query.dateTo ? { startDate: { lte: toEndOfDay(query.dateTo) } } : {}),
      ...(query.unpaidOnly
        ? {
            jobs: {
              some: { deletedAt: null, isPaid: false },
            },
          }
        : {}),
    };

    const orderBy = buildOrderBy(query.sortKey);

    const page = await prisma.workBatch.findMany({
      where,
      orderBy,
      ...(query.cursorId ? { cursor: { id: query.cursorId }, skip: 1 } : {}),
      take: limit + 1,
    });

    const hasMore = page.length > limit;
    const sliced = hasMore ? page.slice(0, limit) : page;
    const nextCursorId = hasMore ? page[limit].id : null;

    const batchIds = sliced.map((b) => b.id);

    const [jobCounts, unpaidCounts, moneyAggs] = await Promise.all([
      batchIds.length
        ? prisma.job.groupBy({
            by: ["batchId"],
            where: { deletedAt: null, batchId: { in: batchIds } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      batchIds.length
        ? prisma.job.groupBy({
            by: ["batchId"],
            // ưu tiên isPaid=false cho unpaid count (rẻ hơn OR)
            where: { deletedAt: null, batchId: { in: batchIds }, isPaid: false },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      batchIds.length
        ? prisma.job.groupBy({
            by: ["batchId"],
            where: { deletedAt: null, batchId: { in: batchIds } },
            _sum: { amount: true, totalPaid: true },
          })
        : Promise.resolve([]),
    ]);

    const jobCountByBatch = new Map(jobCounts.map((r) => [r.batchId ?? -1, r._count._all]));
    const unpaidCountByBatch = new Map(unpaidCounts.map((r) => [r.batchId ?? -1, r._count._all]));
    const moneyByBatch = new Map(
      moneyAggs.map((r) => [
        r.batchId ?? -1,
        { amount: r._sum.amount ?? new Prisma.Decimal(0), totalPaid: r._sum.totalPaid ?? new Prisma.Decimal(0) },
      ])
    );

    const items: WorkBatchListItemDTO[] = sliced.map((b) => {
      const jobCount = jobCountByBatch.get(b.id) ?? 0;
      const unpaidJobCount = unpaidCountByBatch.get(b.id) ?? 0;
      const money = moneyByBatch.get(b.id) ?? { amount: new Prisma.Decimal(0), totalPaid: new Prisma.Decimal(0) };
      const remaining = money.amount.minus(money.totalPaid);

      return {
        id: b.id,
        name: b.name,
        status: b.status,
        startDate: toIso(b.startDate),
        endDate: b.endDate ? toIso(b.endDate) : null,
        note: b.note ?? null,
        jobCount,
        unpaidJobCount,
        totalAmountText: formatMoneyVND(money.amount),
        totalPaidText: formatMoneyVND(money.totalPaid),
        remainingText: formatMoneyVND(remaining),
      };
    });

    // Global stats (not tied to filters) for consistent KPI strip
    const [openCount, batchesWithUnpaidCount, totalUnpaidJobs] = await Promise.all([
      prisma.workBatch.count({ where: { deletedAt: null, status: "OPEN" } }),
      prisma.workBatch.count({
        where: {
          deletedAt: null,
          status: "OPEN",
          jobs: { some: { deletedAt: null, isPaid: false } },
        },
      }),
      prisma.job.count({
        where: { deletedAt: null, isPaid: false, batch: { is: { deletedAt: null, status: "OPEN" } } },
      }),
    ]);

    return {
      items,
      stats: { openCount, batchesWithUnpaidCount, totalUnpaidJobs },
      nextCursorId,
    };
  },

  // Backward-compatible wrapper
  async getList(): Promise<{ items: WorkBatchListItemDTO[]; stats: WorkBatchStatsDTO }> {
    const res = await this.getListPage({ limit: 50 });
    return { items: res.items, stats: res.stats };
  },

  async getDetail(batchId: number): Promise<WorkBatchDetailDTO | null> {
    const batch = await prisma.workBatch.findFirst({
      where: { id: batchId, deletedAt: null },
    });
    if (!batch) return null;

    const jobs = await prisma.job.findMany({
      where: { deletedAt: null, batchId },
      orderBy: [{ createdAt: "desc" }],
      include: {
        client: { select: { name: true } },
        subject: { select: { name: true } },
      },
    });

    const totals = await prisma.job.aggregate({
      where: { deletedAt: null, batchId },
      _sum: { amount: true, totalPaid: true },
      _count: { _all: true },
    });

    const unpaidCount = await prisma.job.count({
      where: { deletedAt: null, batchId, ...unpaidWhere() },
    });

    const totalAmount = totals._sum.amount ?? new Prisma.Decimal(0);
    const totalPaid = totals._sum.totalPaid ?? new Prisma.Decimal(0);
    const remaining = totalAmount.minus(totalPaid);

    const jobRows: WorkBatchJobRowDTO[] = jobs.map((j) => {
      const jobRemaining = j.amount.minus(j.totalPaid);
      return {
        id: j.id,
        name: j.name,
        status: j.status,
        paymentStatus: j.paymentStatus,
        isPaid: j.isPaid,
        clientName: j.client?.name ?? null,
        subjectName: j.subject?.name ?? null,
        amountText: formatMoneyVND(j.amount),
        totalPaidText: formatMoneyVND(j.totalPaid),
        remainingText: formatMoneyVND(jobRemaining),
        deadline: j.deadline ? toIso(j.deadline) : null,
      };
    });

    return {
      id: batch.id,
      name: batch.name,
      status: batch.status,
      startDate: toIso(batch.startDate),
      endDate: batch.endDate ? toIso(batch.endDate) : null,
      note: batch.note ?? null,
      jobCount: totals._count._all,
      unpaidJobCount: unpaidCount,
      totalAmountText: formatMoneyVND(totalAmount),
      totalPaidText: formatMoneyVND(totalPaid),
      remainingText: formatMoneyVND(remaining),
      jobs: jobRows,
    };
  },

  async create(data: { name: string; startDate: Date; note?: string | null }) {
    const normalizedName = normalizeBatchName(data.name);
    const existing = await prisma.workBatch.findFirst({
      where: { deletedAt: null, name: { equals: normalizedName, mode: "insensitive" } },
      select: { id: true },
    });
    if (existing) {
      return { ok: false as const, error: "DUPLICATE_BATCH_NAME" as const };
    }

    const created = await prisma.workBatch.create({
      data: {
        name: normalizedName,
        startDate: data.startDate,
        note: data.note ?? null,
      },
      select: { id: true },
    });
    return { ok: true as const, id: created.id };
  },

  async update(batchId: number, data: { name?: string; startDate?: Date; endDate?: Date | null; note?: string | null }) {
    const normalizedName = data.name ? normalizeBatchName(data.name) : undefined;
    if (normalizedName) {
      const existing = await prisma.workBatch.findFirst({
        where: { deletedAt: null, name: { equals: normalizedName, mode: "insensitive" }, id: { not: batchId } },
        select: { id: true },
      });
      if (existing) {
        return { ok: false as const, error: "DUPLICATE_BATCH_NAME" as const };
      }
    }

    await prisma.workBatch.update({
      where: { id: batchId },
      data: {
        ...(normalizedName ? { name: normalizedName } : {}),
        ...(data.startDate ? { startDate: data.startDate } : {}),
        ...(data.endDate !== undefined ? { endDate: data.endDate } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
      },
    });
    return { ok: true as const };
  },

  async close(batchId: number, closeDate: Date) {
    const unpaidCount = await prisma.job.count({
      where: { deletedAt: null, batchId, ...unpaidWhere() },
    });

    if (unpaidCount > 0) {
      const previewJobs = await prisma.job.findMany({
        where: { deletedAt: null, batchId, ...unpaidWhere() },
        orderBy: [{ createdAt: "desc" }],
        take: 10,
        select: {
          id: true,
          name: true,
          paymentStatus: true,
          amount: true,
          totalPaid: true,
        },
      });

      return {
        ok: false as const,
        error: "CLOSE_BLOCKED_UNPAID" as const,
        unpaidCount,
        unpaidPreview: previewJobs.map((j) => ({
          id: j.id,
          name: j.name,
          paymentStatus: j.paymentStatus,
          amountText: formatMoneyVND(j.amount),
          totalPaidText: formatMoneyVND(j.totalPaid),
          remainingText: formatMoneyVND(j.amount.minus(j.totalPaid)),
        })),
      };
    }

    await prisma.workBatch.update({
      where: { id: batchId },
      data: { status: "CLOSED", endDate: closeDate },
    });

    return { ok: true as const };
  },

  async reopen(batchId: number) {
    await prisma.workBatch.update({
      where: { id: batchId },
      data: { status: "OPEN" },
    });
    return { ok: true as const };
  },

  async softDelete(batchId: number) {
    const jobCount = await prisma.job.count({
      where: { deletedAt: null, batchId },
    });
    if (jobCount > 0) {
      return { ok: false as const, error: "DELETE_BLOCKED_HAS_JOBS" as const, jobCount };
    }

    await prisma.workBatch.update({
      where: { id: batchId },
      data: { deletedAt: new Date() },
    });
    return { ok: true as const };
  },

  async getOpenBatchOptions(excludeId?: number): Promise<WorkBatchOptionDTO[]> {
    const batches = await prisma.workBatch.findMany({
      where: { deletedAt: null, status: "OPEN", ...(excludeId ? { id: { not: excludeId } } : {}) },
      orderBy: [{ startDate: "desc" }, { id: "desc" }],
      select: { id: true, name: true },
    });
    return batches;
  },

  async getAssignableJobs(batchId: number): Promise<AssignableJobDTO[]> {
    const batch = await prisma.workBatch.findFirst({
      where: { id: batchId, deletedAt: null },
      select: { status: true },
    });
    if (!batch) return [];
    if (batch.status !== "OPEN") return [];

    const jobs = await prisma.job.findMany({
      where: { deletedAt: null, batchId: null },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      include: {
        client: { select: { name: true } },
        subject: { select: { name: true } },
      },
    });

    return jobs.map((j) => ({
      id: j.id,
      name: j.name,
      clientName: j.client?.name ?? null,
      subjectName: j.subject?.name ?? null,
      paymentStatus: j.paymentStatus,
      isPaid: j.isPaid,
      amountText: formatMoneyVND(j.amount),
      totalPaidText: formatMoneyVND(j.totalPaid),
      remainingText: formatMoneyVND(j.amount.minus(j.totalPaid)),
    }));
  },

  async addJobsToBatch(batchId: number, jobIds: number[]) {
    const batch = await prisma.workBatch.findFirst({
      where: { id: batchId, deletedAt: null },
      select: { status: true },
    });
    if (!batch) return { ok: false as const, error: "NOT_FOUND" as const };
    if (batch.status !== "OPEN") return { ok: false as const, error: "BATCH_CLOSED" as const };

    const res = await prisma.job.updateMany({
      where: { deletedAt: null, id: { in: jobIds }, batchId: null },
      data: { batchId },
    });
    return { ok: true as const, updatedCount: res.count };
  },

  async removeJobsFromBatch(batchId: number, jobIds: number[]) {
    const batch = await prisma.workBatch.findFirst({
      where: { id: batchId, deletedAt: null },
      select: { status: true },
    });
    if (!batch) return { ok: false as const, error: "NOT_FOUND" as const };
    if (batch.status !== "OPEN") return { ok: false as const, error: "BATCH_CLOSED" as const };

    const res = await prisma.job.updateMany({
      where: { deletedAt: null, id: { in: jobIds }, batchId },
      data: { batchId: null },
    });
    return { ok: true as const, updatedCount: res.count };
  },

  async moveJobsToAnotherBatch(sourceBatchId: number, targetBatchId: number, jobIds: number[]) {
    const [source, target] = await Promise.all([
      prisma.workBatch.findFirst({ where: { id: sourceBatchId, deletedAt: null }, select: { status: true } }),
      prisma.workBatch.findFirst({ where: { id: targetBatchId, deletedAt: null }, select: { status: true } }),
    ]);
    if (!source || !target) return { ok: false as const, error: "NOT_FOUND" as const };
    if (source.status !== "OPEN") return { ok: false as const, error: "SOURCE_CLOSED" as const };
    if (target.status !== "OPEN") return { ok: false as const, error: "TARGET_CLOSED" as const };

    const res = await prisma.job.updateMany({
      where: { deletedAt: null, id: { in: jobIds }, batchId: sourceBatchId },
      data: { batchId: targetBatchId },
    });
    return { ok: true as const, updatedCount: res.count };
  },
};

