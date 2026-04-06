import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type {
  ContributionItemDTO,
  SavingsGoalDetailDTO,
  SavingsGoalListItemDTO,
} from "@/features/expenses/model/financeSavingsGoalTypes";
import type {
  ContributeToGoalInput,
  SavingsGoalCreateInput,
  SavingsGoalUpdateInput,
} from "@/features/expenses/model/financeSavingsGoalValidation";

function ymdToDate(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0));
}

function mapGoalRow(
  g: {
    id: number;
    title: string;
    icon: string | null;
    targetAmount: Prisma.Decimal;
    currency: string;
    targetDate: Date | null;
    sortOrder: number;
  },
  savedAmount: number,
  contributionCount: number,
): SavingsGoalListItemDTO {
  return {
    id: g.id,
    title: g.title,
    icon: g.icon,
    targetAmount: Number(g.targetAmount),
    currency: g.currency,
    targetDate: g.targetDate ? g.targetDate.toISOString() : null,
    savedAmount,
    contributionCount,
    sortOrder: g.sortOrder,
  };
}

export type SavingsGoalServiceError =
  | "NOT_FOUND"
  | "GOAL_NOT_FOUND"
  | "WALLET_NOT_FOUND"
  | "CATEGORY_NOT_FOUND"
  | "CATEGORY_KIND_MISMATCH"
  | "CONTRIBUTION_NOT_FOUND"
  | "DB_ERROR";

export const financeSavingsGoalService = {
  async getList(ownerId: number): Promise<SavingsGoalListItemDTO[]> {
    const goals = await prisma.financeSavingsGoal.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        icon: true,
        targetAmount: true,
        currency: true,
        targetDate: true,
        sortOrder: true,
      },
    });

    if (goals.length === 0) return [];

    const goalIds = goals.map((g) => g.id);
    const aggregates = await prisma.financeGoalContribution.groupBy({
      by: ["goalId"],
      where: { goalId: { in: goalIds } },
      _sum: { amount: true },
      _count: { id: true },
    });

    const sumByGoal = new Map<number, { saved: number; count: number }>();
    for (const a of aggregates) {
      sumByGoal.set(a.goalId, {
        saved: Number(a._sum.amount ?? 0),
        count: a._count.id,
      });
    }

    return goals.map((g) => {
      const agg = sumByGoal.get(g.id);
      return mapGoalRow(g, agg?.saved ?? 0, agg?.count ?? 0);
    });
  },

  async getDetail(ownerId: number, goalId: number): Promise<SavingsGoalDetailDTO | null> {
    const goal = await prisma.financeSavingsGoal.findFirst({
      where: { id: goalId, ownerId, deletedAt: null },
      select: {
        id: true,
        title: true,
        icon: true,
        targetAmount: true,
        currency: true,
        targetDate: true,
        sortOrder: true,
      },
    });
    if (!goal) return null;

    const [agg, contributions] = await Promise.all([
      prisma.financeGoalContribution.aggregate({
        where: { goalId },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.financeGoalContribution.findMany({
        where: { goalId },
        orderBy: [{ contributedAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          amount: true,
          contributedAt: true,
          note: true,
          entryId: true,
        },
      }),
    ]);

    const listItem = mapGoalRow(
      goal,
      Number(agg._sum.amount ?? 0),
      agg._count.id,
    );

    const contributionDtos: ContributionItemDTO[] = contributions.map((c) => ({
      id: c.id,
      amount: Number(c.amount),
      contributedAt: c.contributedAt.toISOString(),
      note: c.note,
      entryId: c.entryId,
    }));

    return { ...listItem, contributions: contributionDtos };
  },

  async create(
    ownerId: number,
    data: SavingsGoalCreateInput,
  ): Promise<{ ok: true; id: number } | { ok: false; error: "DB_ERROR" }> {
    try {
      const targetDate =
        data.targetDate !== undefined ? ymdToDate(data.targetDate) : null;

      const created = await prisma.$transaction(async (tx) => {
        const row = await tx.financeSavingsGoal.create({
          data: {
            ownerId,
            title: data.title,
            icon: data.icon && data.icon.length > 0 ? data.icon : null,
            targetAmount: new Prisma.Decimal(String(data.targetAmount)),
            currency: data.currency,
            targetDate,
            sortOrder: data.sortOrder,
          },
          select: { id: true },
        });

        await tx.auditLog.create({
          data: {
            action: "FINANCE_GOAL_CREATED",
            userId: ownerId,
            entityType: "FinanceSavingsGoal",
            entityId: String(row.id),
          },
        });

        return row;
      });

      return { ok: true, id: created.id };
    } catch (e) {
      console.error("[financeSavingsGoalService.create]", e);
      return { ok: false, error: "DB_ERROR" };
    }
  },

  async update(
    ownerId: number,
    goalId: number,
    data: SavingsGoalUpdateInput,
  ): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" | "DB_ERROR" }> {
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const existing = await tx.financeSavingsGoal.findFirst({
          where: { id: goalId, ownerId, deletedAt: null },
          select: { id: true },
        });
        if (!existing) return "NOT_FOUND" as const;

        const targetDateUpdate =
          data.targetDate === undefined
            ? {}
            : data.targetDate === null
              ? { targetDate: null }
              : { targetDate: ymdToDate(data.targetDate) };

        await tx.financeSavingsGoal.update({
          where: { id: goalId },
          data: {
            ...(data.title !== undefined ? { title: data.title } : {}),
            ...(data.icon !== undefined
              ? { icon: data.icon && data.icon.length > 0 ? data.icon : null }
              : {}),
            ...(data.targetAmount !== undefined
              ? { targetAmount: new Prisma.Decimal(String(data.targetAmount)) }
              : {}),
            ...(data.currency !== undefined ? { currency: data.currency } : {}),
            ...targetDateUpdate,
            ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
          },
        });

        await tx.auditLog.create({
          data: {
            action: "FINANCE_GOAL_UPDATED",
            userId: ownerId,
            entityType: "FinanceSavingsGoal",
            entityId: String(goalId),
          },
        });

        return "OK" as const;
      });

      if (outcome === "NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
      return { ok: true };
    } catch (e) {
      console.error("[financeSavingsGoalService.update]", e);
      return { ok: false, error: "DB_ERROR" };
    }
  },

  async softDelete(
    ownerId: number,
    goalId: number,
  ): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" | "DB_ERROR" }> {
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const res = await tx.financeSavingsGoal.updateMany({
          where: { id: goalId, ownerId, deletedAt: null },
          data: { deletedAt: new Date() },
        });
        if (res.count === 0) return "NOT_FOUND" as const;

        await tx.auditLog.create({
          data: {
            action: "FINANCE_GOAL_DELETED",
            userId: ownerId,
            entityType: "FinanceSavingsGoal",
            entityId: String(goalId),
          },
        });

        return "OK" as const;
      });

      if (outcome === "NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
      return { ok: true };
    } catch (e) {
      console.error("[financeSavingsGoalService.softDelete]", e);
      return { ok: false, error: "DB_ERROR" };
    }
  },

  async contribute(
    ownerId: number,
    data: ContributeToGoalInput,
  ): Promise<
    | { ok: true }
    | {
        ok: false;
        error: SavingsGoalServiceError;
      }
  > {
    const goal = await prisma.financeSavingsGoal.findFirst({
      where: { id: data.goalId, ownerId, deletedAt: null },
      select: { id: true, currency: true },
    });
    if (!goal) return { ok: false, error: "GOAL_NOT_FOUND" };

    if (data.linkEntry) {
      if (!data.walletId || !data.categoryId) {
        return { ok: false, error: "WALLET_NOT_FOUND" };
      }

      const wallet = await prisma.financeWallet.findFirst({
        where: { id: data.walletId, ownerId, deletedAt: null },
        select: { id: true },
      });
      if (!wallet) return { ok: false, error: "WALLET_NOT_FOUND" };

      const category = await prisma.financeCategory.findFirst({
        where: { id: data.categoryId, ownerId, deletedAt: null },
        select: { id: true, kind: true },
      });
      if (!category) return { ok: false, error: "CATEGORY_NOT_FOUND" };
      if (category.kind !== "EXPENSE") return { ok: false, error: "CATEGORY_KIND_MISMATCH" };
    }

    const contributedAt = new Date(data.contributedAt);
    const amount = new Prisma.Decimal(String(data.amount));
    const noteTrim = data.note?.trim() ? data.note.trim() : null;

    try {
      await prisma.$transaction(async (tx) => {
        let entryId: number | null = null;
        if (data.linkEntry && data.walletId && data.categoryId) {
          const entry = await tx.financeEntry.create({
            data: {
              ownerId,
              walletId: data.walletId,
              categoryId: data.categoryId,
              entryKind: "EXPENSE",
              lifecycleStatus: "POSTED",
              amount,
              currency: goal.currency,
              occurredAt: contributedAt,
              note: noteTrim,
            },
            select: { id: true },
          });
          entryId = entry.id;

          await tx.auditLog.create({
            data: {
              action: "FINANCE_ENTRY_CREATED",
              userId: ownerId,
              entityType: "FinanceEntry",
              entityId: String(entryId),
            },
          });
        }

        await tx.financeGoalContribution.create({
          data: {
            goalId: data.goalId,
            amount,
            contributedAt,
            note: noteTrim,
            entryId,
          },
        });
      });

      return { ok: true };
    } catch (e) {
      console.error("[financeSavingsGoalService.contribute]", e);
      return { ok: false, error: "DB_ERROR" };
    }
  },

  async deleteContribution(
    ownerId: number,
    contributionId: number,
  ): Promise<{ ok: true } | { ok: false; error: SavingsGoalServiceError }> {
    const row = await prisma.financeGoalContribution.findFirst({
      where: {
        id: contributionId,
        goal: { ownerId, deletedAt: null },
      },
      select: { id: true, entryId: true },
    });
    if (!row) return { ok: false, error: "CONTRIBUTION_NOT_FOUND" };

    try {
      await prisma.$transaction(async (tx) => {
        if (row.entryId) {
          await tx.financeEntry.updateMany({
            where: { id: row.entryId, ownerId, deletedAt: null },
            data: { deletedAt: new Date() },
          });
          await tx.auditLog.create({
            data: {
              action: "FINANCE_ENTRY_DELETED",
              userId: ownerId,
              entityType: "FinanceEntry",
              entityId: String(row.entryId),
            },
          });
        }

        await tx.financeGoalContribution.delete({
          where: { id: contributionId },
        });
      });

      return { ok: true };
    } catch (e) {
      console.error("[financeSavingsGoalService.deleteContribution]", e);
      return { ok: false, error: "DB_ERROR" };
    }
  },
};
