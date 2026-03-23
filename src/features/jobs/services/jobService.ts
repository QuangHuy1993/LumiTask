import { Prisma, JobPriority } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { formatMoneyVND } from "@/features/work-batches/model/moneyFormat";
import type { JobListPageDTO, JobListQuery, JobDetailDTO } from "@/features/jobs/model/jobTypes";

function toIsoOrNull(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

function buildJobListOrderBy(sortKey: JobListQuery["sortKey"]) {
  switch (sortKey) {
    case "OLDEST":
      return [{ createdAt: "asc" as const }, { id: "asc" as const }];
    case "AMOUNT_ASC":
      return [{ amount: "asc" as const }, { id: "asc" as const }];
    case "AMOUNT_DESC":
      return [{ amount: "desc" as const }, { id: "desc" as const }];
    case "NEWEST":
    default:
      return [{ createdAt: "desc" as const }, { id: "desc" as const }];
  }
}

export const jobService = {
  async getListPage(rawQuery: JobListQuery): Promise<JobListPageDTO> {
    const limit = Math.min(Math.max(rawQuery.limit, 1), 50);
    const term = (rawQuery.search ?? "").trim();

    const where: Prisma.JobWhereInput = {
      deletedAt: null,
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { client: { is: { name: { contains: term, mode: "insensitive" } } } },
              { subject: { is: { name: { contains: term, mode: "insensitive" } } } },
            ],
          }
        : {}),
      ...(rawQuery.clientId ? { clientId: rawQuery.clientId } : {}),
      ...(rawQuery.subjectId ? { subjectId: rawQuery.subjectId } : {}),
      ...(rawQuery.batchId ? { batchId: rawQuery.batchId } : {}),
      ...(rawQuery.status && rawQuery.status !== "ALL" ? { status: rawQuery.status } : {}),
      ...(rawQuery.paymentStatus && rawQuery.paymentStatus !== "ALL"
        ? { paymentStatus: rawQuery.paymentStatus }
        : {}),
    };

    const orderBy = buildJobListOrderBy(rawQuery.sortKey);

    const jobs = await prisma.job.findMany({
      where,
      orderBy,
      ...(rawQuery.cursorId ? { cursor: { id: rawQuery.cursorId }, skip: 1 } : {}),
      take: limit + 1,
      include: {
        client: { select: { name: true } },
        subject: { select: { name: true } },
        batch: { select: { name: true } },
      },
    });

    const hasMore = jobs.length > limit;
    const sliced = hasMore ? jobs.slice(0, limit) : jobs;
    const nextCursorId = hasMore ? jobs[limit].id : null;

    const items = sliced.map((j) => {
      const remaining = j.amount.minus(j.totalPaid);
      return {
        id: j.id,
        name: j.name,
        clientName: j.client?.name ?? null,
        subjectName: j.subject?.name ?? null,
        batchName: j.batch?.name ?? null,
        status: j.status,
        paymentStatus: j.paymentStatus,
        priority: j.priority,
        amountText: formatMoneyVND(j.amount),
        depositText: formatMoneyVND(j.deposit),
        totalPaidText: formatMoneyVND(j.totalPaid),
        remainingText: formatMoneyVND(remaining),
        createdAt: j.createdAt.toISOString(),
        deadline: toIsoOrNull(j.deadline ?? null),
      };
    });

    const totals = await prisma.job.aggregate({
      where: { deletedAt: null },
      _sum: { amount: true },
    });
    const unpaidTotals = await prisma.job.aggregate({
      where: { deletedAt: null, isPaid: false },
      _sum: { amount: true },
    });

    const [totalJobs, unpaidJobs, depositPaidJobs, completedJobs] = await Promise.all([
      prisma.job.count({ where: { deletedAt: null } }),
      prisma.job.count({ where: { deletedAt: null, paymentStatus: "UNPAID" } }),
      prisma.job.count({ where: { deletedAt: null, paymentStatus: "DEPOSIT_PAID" } }),
      prisma.job.count({ where: { deletedAt: null, paymentStatus: "COMPLETED" } }),
    ]);

    const stats = {
      totalJobs,
      unpaidJobs,
      depositPaidJobs,
      completedJobs,
      totalAmountText: formatMoneyVND(totals._sum.amount ?? new Prisma.Decimal(0)),
      totalUnpaidText: formatMoneyVND(unpaidTotals._sum.amount ?? new Prisma.Decimal(0)),
    };

    return { items, stats, nextCursorId };
  },

  async getById(jobId: number): Promise<JobDetailDTO | null> {
    const job = await prisma.job.findFirst({
      where: { id: jobId, deletedAt: null },
      include: {
        client: { select: { name: true } },
        subject: { select: { name: true } },
        batch: { select: { name: true } },
      },
    });
    if (!job) return null;

    const remaining = job.amount.minus(job.totalPaid);

    return {
      id: job.id,
      name: job.name,
      clientId: job.clientId,
      subjectId: job.subjectId,
      batchId: job.batchId,
      clientName: job.client?.name ?? null,
      subjectName: job.subject?.name ?? null,
      batchName: job.batch?.name ?? null,
      status: job.status,
      paymentStatus: job.paymentStatus,
      priority: job.priority,
      isPaid: job.isPaid,
      amountText: formatMoneyVND(job.amount),
      depositText: formatMoneyVND(job.deposit),
      totalPaidText: formatMoneyVND(job.totalPaid),
      remainingText: formatMoneyVND(remaining),
      startDate: toIsoOrNull(job.startDate ?? null),
      deadline: toIsoOrNull(job.deadline ?? null),
      referrer: job.referrer ?? null,
      referralFeeText: formatMoneyVND(job.referralFee),
      note: job.note ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
    };
  },

  async create(data: {
    name: string;
    clientId?: number | null;
    subjectId?: number | null;
    batchId?: number | null;
    status: Prisma.JobCreateInput["status"];
    priority: JobPriority;
    startDate?: Date | null;
    deadline?: Date | null;
    amount: Prisma.Decimal;
    deposit: Prisma.Decimal;
    referralFee: Prisma.Decimal;
    referrer?: string | null;
    note?: string | null;
  }) {
    const created = await prisma.job.create({
      data: {
        name: data.name.trim(),
        client: data.clientId ? { connect: { id: data.clientId } } : undefined,
        subject: data.subjectId ? { connect: { id: data.subjectId } } : undefined,
        batch: data.batchId ? { connect: { id: data.batchId } } : undefined,
        status: data.status,
        priority: data.priority,
        startDate: data.startDate ?? null,
        deadline: data.deadline ?? null,
        amount: data.amount,
        deposit: data.deposit,
        referralFee: data.referralFee,
        referrer: data.referrer ?? null,
        note: data.note ?? null,
      },
      select: { id: true },
    });
    return { ok: true as const, id: created.id };
  },

  async update(
    jobId: number,
    data: {
      name?: string;
      clientId?: number | null;
      subjectId?: number | null;
      batchId?: number | null;
      status?: Prisma.JobUpdateInput["status"];
      priority?: JobPriority;
      startDate?: Date | null;
      deadline?: Date | null;
      amount?: Prisma.Decimal;
      deposit?: Prisma.Decimal;
      referralFee?: Prisma.Decimal;
      referrer?: string | null;
      note?: string | null;
    },
  ) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.clientId !== undefined
          ? { client: data.clientId ? { connect: { id: data.clientId } } : { disconnect: true } }
          : {}),
        ...(data.subjectId !== undefined
          ? { subject: data.subjectId ? { connect: { id: data.subjectId } } : { disconnect: true } }
          : {}),
        ...(data.batchId !== undefined
          ? { batch: data.batchId ? { connect: { id: data.batchId } } : { disconnect: true } }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        ...(data.startDate !== undefined ? { startDate: data.startDate } : {}),
        ...(data.deadline !== undefined ? { deadline: data.deadline } : {}),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.deposit !== undefined ? { deposit: data.deposit } : {}),
        ...(data.referralFee !== undefined ? { referralFee: data.referralFee } : {}),
        ...(data.referrer !== undefined ? { referrer: data.referrer } : {}),
        ...(data.note !== undefined ? { note: data.note } : {}),
      },
    });
    return { ok: true as const };
  },

  async softDelete(jobId: number) {
    await prisma.job.update({
      where: { id: jobId },
      data: { deletedAt: new Date() },
    });
    return { ok: true as const };
  },
};

