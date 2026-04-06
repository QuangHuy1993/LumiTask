import { Prisma } from "@prisma/client";

import type {
  FinanceBudgetPeriodDetailDTO,
  FinanceBudgetPeriodListItemDTO,
  FinanceBudgetLineDetailDTO,
} from "@/features/expenses/model/financeBudgetTypes";
import type { FinanceBudgetUpsertInput } from "@/features/expenses/model/financeBudgetValidation";
import { prisma } from "@/lib/db/prisma";

import { financeEntryService } from "./financeEntryService";

const TZ = "Asia/Ho_Chi_Minh";

function pctUsed(spent: number, limit: number): number {
  if (limit <= 0) return 0;
  return (spent / limit) * 100;
}

async function loadSpendForPeriod(
  ownerId: number,
  periodKey: string,
  currency: string,
) {
  return financeEntryService.getExpenseTotalsByCategoryForMonth(ownerId, {
    periodKey,
    currency,
    timezone: TZ,
  });
}

type PeriodWithLines = {
  id: number;
  periodKey: string;
  currency: string;
  overallLimitAmount: Prisma.Decimal | null;
  note: string | null;
  categoryLines: Array<{
    id: number;
    limitAmount: Prisma.Decimal;
    category: {
      id: number;
      name: string;
      color: string | null;
      icon: string | null;
      deletedAt: Date | null;
      isActive: boolean;
    };
  }>;
};

const periodDetailInclude = {
  categoryLines: {
    include: {
      category: {
        select: {
          id: true,
          name: true,
          color: true,
          icon: true,
          deletedAt: true,
          isActive: true,
        },
      },
    },
    orderBy: { id: "asc" as const },
  },
} as const;

function mapLinesToDetailDTO(
  lines: PeriodWithLines["categoryLines"],
  spendByCategory: Record<number, number>,
): FinanceBudgetLineDetailDTO[] {
  return lines.map((line) => {
    const spent = spendByCategory[line.category.id] ?? 0;
    const limit = Number(line.limitAmount);
    return {
      id: line.id,
      categoryId: line.category.id,
      categoryName: line.category.name,
      categoryColor: line.category.color,
      categoryIcon: line.category.icon,
      limitAmount: limit,
      spentAmount: spent,
      percentUsed: pctUsed(spent, limit),
      categoryHidden: line.category.deletedAt !== null || !line.category.isActive,
    };
  });
}

async function buildPeriodDetailDTO(
  ownerId: number,
  period: PeriodWithLines,
): Promise<FinanceBudgetPeriodDetailDTO> {
  const agg = await loadSpendForPeriod(ownerId, period.periodKey, period.currency);
  const lines = mapLinesToDetailDTO(period.categoryLines, agg.byCategoryId);
  const overall = period.overallLimitAmount ? Number(period.overallLimitAmount) : null;
  const overallPct =
    overall !== null && overall > 0 ? pctUsed(agg.totalExpensePosted, overall) : null;

  return {
    id: period.id,
    periodKey: period.periodKey,
    currency: period.currency,
    overallLimitAmount: overall,
    note: period.note,
    lines,
    totalSpentInPeriod: agg.totalExpensePosted,
    overallPercentUsed: overallPct,
    hasUnmatchedCurrencyExpenses: agg.foreignCurrencyExpenseCount > 0,
  };
}

export type FinanceBudgetServiceError = "NOT_FOUND" | "INVALID_CATEGORY" | "DB_ERROR";

export const financeBudgetService = {
  async listPeriods(
    ownerId: number,
    opts: { year?: number },
  ): Promise<FinanceBudgetPeriodListItemDTO[]> {
    const where: Prisma.FinanceBudgetPeriodWhereInput = {
      ownerId,
      ...(opts.year !== undefined
        ? {
            periodKey: {
              startsWith: `${opts.year}-`,
            },
          }
        : {}),
    };

    const rows = await prisma.financeBudgetPeriod.findMany({
      where,
      orderBy: { periodKey: "desc" },
      select: {
        id: true,
        periodKey: true,
        currency: true,
        overallLimitAmount: true,
        note: true,
      },
    });

    return rows.map(
      (r): FinanceBudgetPeriodListItemDTO => ({
        id: r.id,
        periodKey: r.periodKey,
        currency: r.currency,
        overallLimitAmount: r.overallLimitAmount ? Number(r.overallLimitAmount) : null,
        note: r.note,
      }),
    );
  },

  async getPeriodDetail(
    ownerId: number,
    periodId: number,
  ): Promise<FinanceBudgetPeriodDetailDTO | null> {
    const period = await prisma.financeBudgetPeriod.findFirst({
      where: { id: periodId, ownerId },
      include: periodDetailInclude,
    });

    if (!period) return null;
    return buildPeriodDetailDTO(ownerId, period);
  },

  async getPeriodDetailByKey(
    ownerId: number,
    periodKey: string,
  ): Promise<FinanceBudgetPeriodDetailDTO | null> {
    const period = await prisma.financeBudgetPeriod.findFirst({
      where: { ownerId, periodKey },
      include: periodDetailInclude,
    });
    if (!period) return null;
    return buildPeriodDetailDTO(ownerId, period);
  },

  async upsertPeriodWithLines(
    ownerId: number,
    input: FinanceBudgetUpsertInput,
  ): Promise<
    | { ok: true; id: number; created: boolean }
    | { ok: false; error: FinanceBudgetServiceError }
  > {
    const categoryIds = input.lines.map((l) => l.categoryId);
    if (categoryIds.length > 0) {
      const valid = await prisma.financeCategory.findMany({
        where: {
          id: { in: categoryIds },
          ownerId,
          deletedAt: null,
          kind: "EXPENSE",
        },
        select: { id: true },
      });
      if (valid.length !== new Set(categoryIds).size) {
        return { ok: false, error: "INVALID_CATEGORY" };
      }
    }

    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const existing = await tx.financeBudgetPeriod.findFirst({
          where: { ownerId, periodKey: input.periodKey },
          select: { id: true },
        });

        const overallDecimal =
          input.overallLimitAmount === undefined || input.overallLimitAmount === null
            ? null
            : new Prisma.Decimal(String(input.overallLimitAmount));

        let periodId: number;
        let created: boolean;

        if (existing) {
          await tx.financeBudgetPeriod.update({
            where: { id: existing.id },
            data: {
              currency: input.currency,
              overallLimitAmount: overallDecimal,
              note: input.note ?? null,
            },
          });
          periodId = existing.id;
          created = false;

          await tx.financeBudgetCategoryLine.deleteMany({
            where: { budgetPeriodId: periodId },
          });
        } else {
          const row = await tx.financeBudgetPeriod.create({
            data: {
              ownerId,
              periodKey: input.periodKey,
              currency: input.currency,
              overallLimitAmount: overallDecimal,
              note: input.note ?? null,
            },
            select: { id: true },
          });
          periodId = row.id;
          created = true;
        }

        if (input.lines.length > 0) {
          await tx.financeBudgetCategoryLine.createMany({
            data: input.lines.map((l) => ({
              budgetPeriodId: periodId,
              categoryId: l.categoryId,
              limitAmount: new Prisma.Decimal(String(l.limitAmount)),
            })),
          });
        }

        await tx.auditLog.create({
          data: {
            action: created ? "FINANCE_BUDGET_CREATED" : "FINANCE_BUDGET_UPDATED",
            userId: ownerId,
            entityType: "FinanceBudgetPeriod",
            entityId: String(periodId),
            metadata: {
              periodKey: input.periodKey,
            },
          },
        });

        return { periodId, created };
      });

      return { ok: true, id: outcome.periodId, created: outcome.created };
    } catch (e) {
      console.error("[financeBudgetService.upsertPeriodWithLines]", e);
      return { ok: false, error: "DB_ERROR" };
    }
  },

  async deletePeriod(
    ownerId: number,
    periodId: number,
  ): Promise<{ ok: true } | { ok: false; error: FinanceBudgetServiceError }> {
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const row = await tx.financeBudgetPeriod.findFirst({
          where: { id: periodId, ownerId },
          select: { id: true, periodKey: true },
        });
        if (!row) return "NOT_FOUND" as const;

        await tx.financeBudgetPeriod.delete({
          where: { id: row.id },
        });

        await tx.auditLog.create({
          data: {
            action: "FINANCE_BUDGET_DELETED",
            userId: ownerId,
            entityType: "FinanceBudgetPeriod",
            entityId: String(periodId),
            metadata: { periodKey: row.periodKey },
          },
        });

        return "OK" as const;
      });

      if (outcome === "NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
      return { ok: true };
    } catch (e) {
      console.error("[financeBudgetService.deletePeriod]", e);
      return { ok: false, error: "DB_ERROR" };
    }
  },
};
