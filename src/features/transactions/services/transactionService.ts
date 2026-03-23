import { prisma } from "@/lib/db/prisma";
import { TransactionListQuery, TransactionListItemDTO, TransactionStatsDTO, TransactionListResult } from "../model/transactionTypes";
import { Prisma } from "@prisma/client";

export async function getTransactionList(query: TransactionListQuery): Promise<TransactionListResult> {
  const where = buildWhereClause(query);
  const take = query.take || 20;

  const items = await prisma.transaction.findMany({
    where,
    take: take + 1, // Fetch extra 1 to determine hasMore
    skip: query.cursor ? 1 : 0,
    cursor: query.cursor ? { id: query.cursor } : undefined,
    orderBy: [
      { transactionDate: "desc" },
      { id: "desc" }
    ],
    select: {
      id: true,
      transactionDate: true,
      amount: true,
      direction: true,
      content: true,
      status: true,
      gatewayTransId: true,
      bankAccount: {
        select: { bankId: true, accountNo: true }
      },
      job: {
        select: {
          id: true,
          name: true,
          client: { select: { id: true, name: true } }
        }
      }
    }
  });

  const hasMore = items.length > take;
  const resultItems = hasMore ? items.slice(0, take) : items;
  const nextCursor = hasMore ? resultItems[resultItems.length - 1].id : null;

  return {
    items: resultItems.map((item) => ({
      ...item,
      amount: Number(item.amount), // Decimal to number conversion
    })) as TransactionListItemDTO[],
    hasMore,
    nextCursor
  };
}

export async function getTransactionStats(query: TransactionListQuery): Promise<TransactionStatsDTO> {
  const where = buildWhereClause(query);

  const [countResult, totals] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.groupBy({
      by: ['direction', 'status'],
      where: {
        ...where,
        status: "COMPLETED" // Stats typically only care about COMPLETED for actual totals
      },
      _sum: { amount: true }
    })
  ]);

  let totalIncoming = 0;
  let totalOutgoing = 0;

  for (const t of totals) {
    const val = Number(t._sum.amount || 0);
    if (t.direction === "INCOMING") totalIncoming += val;
    if (t.direction === "OUTGOING") totalOutgoing += val;
  }

  return {
    totalCount: countResult,
    totalIncoming,
    totalOutgoing,
    netDifference: totalIncoming - totalOutgoing
  };
}

function buildWhereClause(query: TransactionListQuery): Prisma.TransactionWhereInput {
  const where: Prisma.TransactionWhereInput = { deletedAt: null };

  if (query.startDate || query.endDate) {
    where.transactionDate = {
      ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
      ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
    };
  }

  if (query.direction && query.direction !== "ALL") {
    where.direction = query.direction;
  }
  
  if (query.status && query.status !== "ALL") {
    where.status = query.status;
  }

  if (query.source === "SEPAY") {
    where.gatewayTransId = { not: null };
  } else if (query.source === "MANUAL") {
    where.gatewayTransId = null;
  }

  if (query.searchContent) {
    where.content = { contains: query.searchContent, mode: "insensitive" };
  }

  if (query.jobId) {
    where.jobId = query.jobId;
  }

  if (query.clientId) {
    where.job = { clientId: query.clientId };
  }

  if (query.bankAccountId) {
    where.bankAccountId = query.bankAccountId;
  }

  return where;
}

export async function getTransactionById(id: number) {
  const item = await prisma.transaction.findUnique({
    where: { id },
    select: {
      id: true,
      transactionDate: true,
      amount: true,
      direction: true,
      content: true,
      status: true,
      gatewayTransId: true,
      rawPayload: true,
      bankAccount: { select: { bankId: true, accountNo: true } },
      job: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
      user: { select: { id: true, fullName: true } }
    }
  });

  if (!item) return null;

  return {
    ...item,
    amount: Number(item.amount)
  };
}
