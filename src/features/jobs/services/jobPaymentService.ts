import { Prisma, TransactionDirection, TransactionStatus, PaymentStatus, JobStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type ManualPaymentType = "DEPOSIT" | "FULL";

const SYNC_SETTING_KEY = "sync_job_revenue_to_finance";
const JOB_REVENUE_CATEGORY_SLUG = "job-revenue";

function nextPaymentStatus(current: PaymentStatus, type: ManualPaymentType, newTotalPaid: Prisma.Decimal, amount: Prisma.Decimal) {
  if (type === "DEPOSIT" && current === "UNPAID") {
    return "DEPOSIT_PAID" as const;
  }
  if (newTotalPaid.greaterThanOrEqualTo(amount)) {
    return "COMPLETED" as const;
  }
  return current;
}

async function syncJobRevenueToFinance(tx: Prisma.TransactionClient, input: {
  transactionId: number;
  ownerId: number;
  occurredAt: Date;
  amount: Prisma.Decimal;
  content: string;
  jobId: number;
}) {
  const setting = await tx.appSetting.findUnique({
    where: { key: SYNC_SETTING_KEY },
    select: { value: true },
  });
  if (setting?.value !== "true") return;

  // Idempotency: if we already created a FinanceEntry for this Transaction, skip.
  const syncNotePrefix = `[TX:${input.transactionId}]`;
  const existing = await tx.financeEntry.findFirst({
    where: {
      ownerId: input.ownerId,
      deletedAt: null,
      note: { startsWith: syncNotePrefix },
    },
    select: { id: true },
  });
  if (existing) return;

  const wallet = await tx.financeWallet.findFirst({
    where: { ownerId: input.ownerId, deletedAt: null },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  if (!wallet) return;

  const category = await tx.financeCategory.upsert({
    where: {
      ownerId_slug: { ownerId: input.ownerId, slug: JOB_REVENUE_CATEGORY_SLUG },
    },
    create: {
      ownerId: input.ownerId,
      kind: "INCOME",
      name: "Doanh thu việc làm",
      slug: JOB_REVENUE_CATEGORY_SLUG,
      isActive: true,
      sortOrder: 50,
    },
    update: {
      kind: "INCOME",
      name: "Doanh thu việc làm",
      isActive: true,
    },
    select: { id: true },
  });

  await tx.financeEntry.create({
    data: {
      ownerId: input.ownerId,
      walletId: wallet.id,
      categoryId: category.id,
      entryKind: "INCOME",
      amount: input.amount,
      currency: "VND",
      occurredAt: input.occurredAt,
      note: `${syncNotePrefix} Thu từ Job #${input.jobId} — ${input.content}`.slice(0, 5000),
    },
  });
}

function nextJobStatus(current: JobStatus, newPaymentStatus: PaymentStatus): JobStatus {
  if (newPaymentStatus === "COMPLETED" && current !== "CANCELLED") {
    return "COMPLETED";
  }
  return current;
}

export const jobPaymentService = {
  async recordManualPayment(input: {
    jobId: number;
    date: Date;
    amount: Prisma.Decimal;
    type: ManualPaymentType;
    bankAccountId: number;
    content: string;
    userId?: number;
  }) {
    return prisma.$transaction(async (tx) => {
      const job = await tx.job.findFirst({
        where: { id: input.jobId, deletedAt: null },
        select: { id: true, ownerId: true, amount: true, totalPaid: true, paymentStatus: true, status: true },
      });
      if (!job) {
        return { ok: false as const, error: "JOB_NOT_FOUND" as const };
      }

      const newTotalPaid = job.totalPaid.plus(input.amount);
      const newStatus = nextPaymentStatus(job.paymentStatus, input.type, newTotalPaid, job.amount);
      const isPaid = newStatus === "COMPLETED";
      const newJobStatus = nextJobStatus(job.status, newStatus);

      const createdTx = await tx.transaction.create({
        data: {
          transactionDate: input.date,
          amount: input.amount,
          content: input.content,
          direction: TransactionDirection.INCOMING,
          status: TransactionStatus.COMPLETED,
          bankAccountId: input.bankAccountId,
          jobId: input.jobId,
          userId: input.userId,
        },
        select: { id: true },
      });

      await tx.job.update({
        where: { id: input.jobId },
        data: {
          totalPaid: newTotalPaid,
          paymentStatus: newStatus,
          isPaid,
          status: newJobStatus,
        },
      });

      // Best-effort: don't fail the payment record if finance sync fails.
      if (job.ownerId) {
        try {
          await syncJobRevenueToFinance(tx, {
            transactionId: createdTx.id,
            ownerId: job.ownerId,
            occurredAt: input.date,
            amount: input.amount,
            content: input.content,
            jobId: input.jobId,
          });
        } catch (e) {
          console.error("[jobPaymentService] finance sync failed", e);
        }
      }

      return { ok: true as const };
    });
  },

  async processSePayWebhook(input: {
    gatewayTransId: string;
    accountNo: string;
    amount: Prisma.Decimal;
    content: string;
    rawPayload: string;
  }) {
    const match = input.content.match(/JOB(\d+)(COC|FULL)/i);
    if (!match) {
      return { ok: false as const, error: "NO_JOB_PATTERN" as const };
    }
    const jobId = Number.parseInt(match[1], 10);
    const type: ManualPaymentType = match[2].toUpperCase() === "COC" ? "DEPOSIT" : "FULL";

    return prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findFirst({
        where: { gatewayTransId: input.gatewayTransId },
        select: { id: true },
      });
      if (existing) {
        return { ok: true as const, dedup: true as const };
      }

      const [job, bank] = await Promise.all([
        tx.job.findFirst({
          where: { id: jobId, deletedAt: null },
          select: { id: true, ownerId: true, amount: true, totalPaid: true, paymentStatus: true, status: true },
        }),
        tx.bankAccount.findFirst({
          where: { accountNo: input.accountNo, deletedAt: null },
          select: { id: true },
        }),
      ]);

      if (!job || !bank) {
        return { ok: false as const, error: "JOB_OR_BANK_NOT_FOUND" as const };
      }

      const newTotalPaid = job.totalPaid.plus(input.amount);
      const newStatus = nextPaymentStatus(job.paymentStatus, type, newTotalPaid, job.amount);
      const isPaid = newStatus === "COMPLETED";
      const newJobStatus = nextJobStatus(job.status, newStatus);

      const createdTx = await tx.transaction.create({
        data: {
          transactionDate: new Date(),
          amount: input.amount,
          content: input.content,
          gatewayTransId: input.gatewayTransId,
          direction: TransactionDirection.INCOMING,
          status: TransactionStatus.COMPLETED,
          bankAccountId: bank.id,
          jobId: job.id,
          rawPayload: input.rawPayload,
        },
        select: { id: true },
      });

      await tx.job.update({
        where: { id: job.id },
        data: {
          totalPaid: newTotalPaid,
          paymentStatus: newStatus,
          isPaid,
          status: newJobStatus,
        },
      });

      if (job.ownerId) {
        try {
          await syncJobRevenueToFinance(tx, {
            transactionId: createdTx.id,
            ownerId: job.ownerId,
            occurredAt: new Date(),
            amount: input.amount,
            content: input.content,
            jobId: job.id,
          });
        } catch (e) {
          console.error("[jobPaymentService] finance sync failed", e);
        }
      }

      return { ok: true as const };
    });
  },
};

