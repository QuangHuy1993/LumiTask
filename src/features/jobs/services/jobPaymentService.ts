import { Prisma, TransactionDirection, TransactionStatus, PaymentStatus, JobStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type ManualPaymentType = "DEPOSIT" | "FULL";

function nextPaymentStatus(current: PaymentStatus, type: ManualPaymentType, newTotalPaid: Prisma.Decimal, amount: Prisma.Decimal) {
  if (type === "DEPOSIT" && current === "UNPAID") {
    return "DEPOSIT_PAID" as const;
  }
  if (newTotalPaid.greaterThanOrEqualTo(amount)) {
    return "COMPLETED" as const;
  }
  return current;
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
        select: { id: true, amount: true, totalPaid: true, paymentStatus: true, status: true },
      });
      if (!job) {
        return { ok: false as const, error: "JOB_NOT_FOUND" as const };
      }

      const newTotalPaid = job.totalPaid.plus(input.amount);
      const newStatus = nextPaymentStatus(job.paymentStatus, input.type, newTotalPaid, job.amount);
      const isPaid = newStatus === "COMPLETED";
      const newJobStatus = nextJobStatus(job.status, newStatus);

      await tx.transaction.create({
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
          select: { id: true, amount: true, totalPaid: true, paymentStatus: true, status: true },
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

      await tx.transaction.create({
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

      return { ok: true as const };
    });
  },
};

