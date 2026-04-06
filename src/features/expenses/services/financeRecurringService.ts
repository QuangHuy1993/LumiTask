import { Prisma, type FinanceRecurringFrequency } from "@prisma/client";

import type { FinanceEntryKind } from "@/features/expenses/model/financeEntryKind";
import { prisma } from "@/lib/db/prisma";
import type { FinanceRecurringListItemDTO } from "@/features/expenses/model/financeRecurringTypes";
import type { RecurringCreateInput, RecurringListFilterInput, RecurringUpdateInput } from "@/features/expenses/model/financeRecurringValidation";
import { computeNextRecurringRunAt } from "@/features/expenses/utils/financeRecurringNextRun";

const TZ_DISPLAY = "Asia/Ho_Chi_Minh";

function formatMoney(amount: Prisma.Decimal, currency = "VND"): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    notation: "standard",
  }).format(Number(amount));
}

function frequencyLabelVi(frequency: FinanceRecurringFrequency, interval: number): string {
  const n = Math.max(1, interval);
  switch (frequency) {
    case "DAILY":
      return n > 1 ? `Mỗi ${n} ngày` : "Hàng ngày";
    case "WEEKLY":
      return n > 1 ? `Mỗi ${n} tuần` : "Hàng tuần";
    case "MONTHLY":
      return n > 1 ? `Mỗi ${n} tháng` : "Hàng tháng";
    case "YEARLY":
      return n > 1 ? `Mỗi ${n} năm` : "Hàng năm";
    default: {
      const _e: never = frequency;
      return _e;
    }
  }
}

function formatDateTimeText(d: Date): string {
  return d.toLocaleString("vi-VN", { timeZone: TZ_DISPLAY, dateStyle: "medium", timeStyle: "short" });
}

function toDatetimeLocalValue(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_DISPLAY,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function mapRuleToDTO(r: {
  id: number;
  walletId: number;
  wallet: { name: string };
  categoryId: number | null;
  category: { name: string; icon: string | null } | null;
  entryKind: FinanceEntryKind;
  frequency: FinanceRecurringFrequency;
  interval: number;
  nextRunAt: Date;
  amount: Prisma.Decimal;
  currency: string;
  note: string | null;
  isActive: boolean;
  lastGeneratedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): FinanceRecurringListItemDTO {
  const noteTrim = (r.note ?? "").trim();
  const displayTitle =
    noteTrim.length > 0
      ? noteTrim.split(/\r?\n/)[0]!.slice(0, 80)
      : r.category
        ? `${r.category.name} · ${frequencyLabelVi(r.frequency, r.interval)}`
        : `${r.entryKind === "INCOME" ? "Thu" : "Chi"} định kỳ · ${frequencyLabelVi(r.frequency, r.interval)}`;

  return {
    id: r.id,
    walletId: r.walletId,
    walletName: r.wallet.name,
    categoryId: r.categoryId,
    categoryName: r.category?.name ?? null,
    categoryIcon: r.category?.icon?.trim() ? r.category.icon.trim() : null,
    entryKind: r.entryKind,
    frequency: r.frequency,
    interval: r.interval,
    frequencyLabel: frequencyLabelVi(r.frequency, r.interval),
    nextRunAt: r.nextRunAt.toISOString(),
    nextRunAtLocal: toDatetimeLocalValue(r.nextRunAt),
    nextRunAtText: formatDateTimeText(r.nextRunAt),
    amountRaw: Number(r.amount),
    amountText: formatMoney(r.amount, r.currency),
    currency: r.currency,
    note: r.note,
    displayTitle,
    isActive: r.isActive,
    lastGeneratedAt: r.lastGeneratedAt?.toISOString() ?? null,
    lastGeneratedAtText: r.lastGeneratedAt ? formatDateTimeText(r.lastGeneratedAt) : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

async function assertWalletCategoryCurrency(params: {
  tx: Prisma.TransactionClient;
  ownerId: number;
  walletId: number;
  categoryId: number | null | undefined;
  entryKind: FinanceEntryKind;
  currency: string;
}): Promise<{ ok: true } | { ok: false; error: "WALLET_INVALID" | "CATEGORY_INVALID" | "CURRENCY_MISMATCH" }> {
  const walletP = params.tx.financeWallet.findFirst({
    where: { id: params.walletId, ownerId: params.ownerId, deletedAt: null },
    select: { id: true, currency: true },
  });
  const catP =
    params.categoryId == null
      ? Promise.resolve(null)
      : params.tx.financeCategory.findFirst({
          where: { id: params.categoryId, ownerId: params.ownerId, deletedAt: null },
          select: { id: true, kind: true },
        });

  const [wallet, cat] = await Promise.all([walletP, catP]);

  if (!wallet) return { ok: false, error: "WALLET_INVALID" };
  if (wallet.currency !== params.currency) {
    return { ok: false, error: "CURRENCY_MISMATCH" };
  }

  if (params.categoryId == null) return { ok: true };
  if (!cat) return { ok: false, error: "CATEGORY_INVALID" };
  if (cat.kind !== params.entryKind) return { ok: false, error: "CATEGORY_INVALID" };

  return { ok: true };
}

export type RecurringRunError = "NOT_FOUND" | "NOT_DUE" | "INACTIVE" | "DB_ERROR";
export type RecurringMutationError =
  | "NOT_FOUND"
  | "WALLET_INVALID"
  | "CATEGORY_INVALID"
  | "CURRENCY_MISMATCH"
  | "DB_ERROR";

export const financeRecurringService = {
  async listPage(
    input: { ownerId: number; query: RecurringListFilterInput },
    options?: { skipTotalCount?: boolean },
  ): Promise<{
    items: FinanceRecurringListItemDTO[];
    totalCount: number;
  }> {
    const limit = Math.min(Math.max(input.query.limit, 1), 200);
    const term = (input.query.search ?? "").trim();

    const where: Prisma.FinanceRecurringRuleWhereInput = {
      ownerId: input.ownerId,
      deletedAt: null,
      ...(input.query.isActive !== undefined && input.query.isActive !== "ALL"
        ? { isActive: input.query.isActive }
        : {}),
      ...(term
        ? {
            OR: [
              { note: { contains: term, mode: "insensitive" } },
              { wallet: { name: { contains: term, mode: "insensitive" } } },
              { category: { name: { contains: term, mode: "insensitive" } } },
            ],
          }
        : {}),
    };

    const findManyQuery = prisma.financeRecurringRule.findMany({
      where,
      take: limit,
      orderBy: [{ isActive: "desc" }, { nextRunAt: "asc" }, { id: "desc" }],
      include: {
        wallet: { select: { name: true } },
        category: { select: { name: true, icon: true } },
      },
    });

    if (options?.skipTotalCount) {
      const rows = await findManyQuery;
      return {
        items: rows.map((r) =>
          mapRuleToDTO({
            ...r,
            wallet: r.wallet,
            category: r.category,
          }),
        ),
        /** Không phản ánh tổng trong DB nếu số bản ghi vượt `limit`. */
        totalCount: rows.length,
      };
    }

    const [rows, totalCount] = await Promise.all([findManyQuery, prisma.financeRecurringRule.count({ where })]);

    return {
      items: rows.map((r) =>
        mapRuleToDTO({
          ...r,
          wallet: r.wallet,
          category: r.category,
        }),
      ),
      totalCount,
    };
  },

  async getById(ownerId: number, ruleId: number): Promise<
    | { ok: true; item: FinanceRecurringListItemDTO }
    | { ok: false; error: "NOT_FOUND" }
  > {
    const r = await prisma.financeRecurringRule.findFirst({
      where: { id: ruleId, ownerId, deletedAt: null },
      include: {
        wallet: { select: { name: true } },
        category: { select: { name: true, icon: true } },
      },
    });
    if (!r) return { ok: false, error: "NOT_FOUND" };
    return {
      ok: true,
      item: mapRuleToDTO({
        ...r,
        wallet: r.wallet,
        category: r.category,
      }),
    };
  },

  async create(input: {
    ownerId: number;
    data: RecurringCreateInput;
    nextRunAt: Date;
    amount: Prisma.Decimal;
  }): Promise<{ ok: true; id: number } | { ok: false; error: RecurringMutationError }> {
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const v = await assertWalletCategoryCurrency({
          tx,
          ownerId: input.ownerId,
          walletId: input.data.walletId,
          categoryId: input.data.categoryId ?? null,
          entryKind: input.data.entryKind,
          currency: input.data.currency,
        });
        if (!v.ok) return { kind: "invalid" as const, error: v.error };

        const row = await tx.financeRecurringRule.create({
          data: {
            ownerId: input.ownerId,
            walletId: input.data.walletId,
            categoryId: input.data.categoryId ?? null,
            entryKind: input.data.entryKind,
            frequency: input.data.frequency,
            interval: input.data.interval,
            nextRunAt: input.nextRunAt,
            amount: input.amount,
            currency: input.data.currency,
            note: input.data.note?.trim() ? input.data.note.trim() : null,
            isActive: input.data.isActive,
          },
          select: { id: true },
        });

        await tx.auditLog.create({
          data: {
            action: "FINANCE_RECURRING_CREATED",
            userId: input.ownerId,
            entityType: "FinanceRecurringRule",
            entityId: String(row.id),
          },
        });

        return { kind: "ok" as const, id: row.id };
      });

      if (outcome.kind === "invalid") return { ok: false, error: outcome.error };
      return { ok: true, id: outcome.id };
    } catch (err) {
      console.error("[financeRecurringService.create]", err);
      return { ok: false, error: "DB_ERROR" };
    }
  },

  async update(input: {
    ownerId: number;
    ruleId: number;
    data: RecurringUpdateInput;
    nextRunAt?: Date;
    amount?: Prisma.Decimal;
  }): Promise<{ ok: true } | { ok: false; error: RecurringMutationError }> {
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const existing = await tx.financeRecurringRule.findFirst({
          where: { id: input.ruleId, ownerId: input.ownerId, deletedAt: null },
          select: {
            id: true,
            walletId: true,
            categoryId: true,
            entryKind: true,
            currency: true,
          },
        });
        if (!existing) return "NOT_FOUND" as const;

        const walletId = input.data.walletId ?? existing.walletId;
        const categoryId =
          input.data.categoryId !== undefined ? input.data.categoryId : existing.categoryId;
        const entryKind = input.data.entryKind ?? existing.entryKind;
        const currency = input.data.currency ?? existing.currency;

        const v = await assertWalletCategoryCurrency({
          tx,
          ownerId: input.ownerId,
          walletId,
          categoryId,
          entryKind,
          currency,
        });
        if (!v.ok) return v.error;

        await tx.financeRecurringRule.update({
          where: { id: input.ruleId },
          data: {
            ...(input.data.walletId !== undefined ? { walletId: input.data.walletId } : {}),
            ...(input.data.categoryId !== undefined ? { categoryId: input.data.categoryId } : {}),
            ...(input.data.entryKind !== undefined ? { entryKind: input.data.entryKind } : {}),
            ...(input.data.frequency !== undefined ? { frequency: input.data.frequency } : {}),
            ...(input.data.interval !== undefined ? { interval: input.data.interval } : {}),
            ...(input.nextRunAt !== undefined ? { nextRunAt: input.nextRunAt } : {}),
            ...(input.amount !== undefined ? { amount: input.amount } : {}),
            ...(input.data.currency !== undefined ? { currency: input.data.currency } : {}),
            ...(input.data.note !== undefined
              ? { note: input.data.note?.trim() ? input.data.note.trim() : null }
              : {}),
            ...(input.data.isActive !== undefined ? { isActive: input.data.isActive } : {}),
          },
        });

        await tx.auditLog.create({
          data: {
            action: "FINANCE_RECURRING_UPDATED",
            userId: input.ownerId,
            entityType: "FinanceRecurringRule",
            entityId: String(input.ruleId),
          },
        });

        return "OK" as const;
      });

      if (outcome === "NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
      if (outcome === "WALLET_INVALID" || outcome === "CATEGORY_INVALID" || outcome === "CURRENCY_MISMATCH") {
        return { ok: false, error: outcome };
      }
      return { ok: true };
    } catch (err) {
      console.error("[financeRecurringService.update]", err);
      return { ok: false, error: "DB_ERROR" };
    }
  },

  async softDelete(input: { ownerId: number; ruleId: number }): Promise<
    { ok: true } | { ok: false; error: "NOT_FOUND" }
  > {
    const outcome = await prisma.$transaction(async (tx) => {
      const res = await tx.financeRecurringRule.updateMany({
        where: { id: input.ruleId, ownerId: input.ownerId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (res.count === 0) return "NOT_FOUND" as const;

      await tx.auditLog.create({
        data: {
          action: "FINANCE_RECURRING_DELETED",
          userId: input.ownerId,
          entityType: "FinanceRecurringRule",
          entityId: String(input.ruleId),
        },
      });
      return "OK" as const;
    });

    if (outcome === "NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
    return { ok: true };
  },

  async setActive(input: {
    ownerId: number;
    ruleId: number;
    isActive: boolean;
  }): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" }> {
    const outcome = await prisma.$transaction(async (tx) => {
      const res = await tx.financeRecurringRule.updateMany({
        where: { id: input.ruleId, ownerId: input.ownerId, deletedAt: null },
        data: { isActive: input.isActive },
      });
      if (res.count === 0) return "NOT_FOUND" as const;

      await tx.auditLog.create({
        data: {
          action: "FINANCE_RECURRING_UPDATED",
          userId: input.ownerId,
          entityType: "FinanceRecurringRule",
          entityId: String(input.ruleId),
          metadata: { isActive: input.isActive } as Prisma.InputJsonValue,
        },
      });
      return "OK" as const;
    });

    if (outcome === "NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
    return { ok: true };
  },

  /**
   * Một lần gọi: nếu đến hạn, tạo tối đa 1 FinanceEntry (POSTED) và advance nextRunAt.
   */
  async runDueRule(input: { ownerId: number; ruleId: number }): Promise<
    | { ok: true; ran: true; entryId: number }
    | { ok: true; ran: false; reason: "NOT_DUE" }
    | { ok: false; error: RecurringRunError }
  > {
    const now = new Date();

    try {
      const result = await prisma.$transaction(async (tx) => {
        const rule = await tx.financeRecurringRule.findFirst({
          where: { id: input.ruleId, ownerId: input.ownerId, deletedAt: null },
          include: {
            wallet: { select: { id: true, deletedAt: true, currency: true } },
            category: { select: { id: true, deletedAt: true, kind: true } },
          },
        });

        if (!rule) return { type: "err" as const, error: "NOT_FOUND" as const };
        if (!rule.isActive) return { type: "err" as const, error: "INACTIVE" as const };
        if (rule.nextRunAt > now) return { type: "skip" as const };

        if (rule.wallet.deletedAt != null) {
          return { type: "err" as const, error: "NOT_FOUND" as const };
        }
        if (rule.wallet.currency !== rule.currency) {
          return { type: "err" as const, error: "DB_ERROR" as const };
        }
        if (rule.categoryId != null && rule.category) {
          if (rule.category.deletedAt != null || rule.category.kind !== rule.entryKind) {
            return { type: "err" as const, error: "DB_ERROR" as const };
          }
        }

        const occurredAt = rule.nextRunAt;
        const nextRunAt = computeNextRecurringRunAt(rule.nextRunAt, rule.frequency, rule.interval);

        const entry = await tx.financeEntry.create({
          data: {
            ownerId: input.ownerId,
            walletId: rule.walletId,
            categoryId: rule.categoryId,
            entryKind: rule.entryKind,
            lifecycleStatus: "POSTED",
            amount: rule.amount,
            currency: rule.currency,
            occurredAt,
            note: rule.note,
            recurringRuleId: rule.id,
          },
          select: { id: true },
        });

        await tx.financeRecurringRule.update({
          where: { id: rule.id },
          data: {
            lastGeneratedAt: now,
            nextRunAt,
          },
        });

        await tx.auditLog.create({
          data: {
            action: "FINANCE_ENTRY_CREATED",
            userId: input.ownerId,
            entityType: "FinanceEntry",
            entityId: String(entry.id),
            metadata: { source: "FINANCE_RECURRING", ruleId: rule.id } as Prisma.InputJsonValue,
          },
        });

        return { type: "ok" as const, entryId: entry.id };
      });

      if (result.type === "err") {
        return { ok: false, error: result.error };
      }
      if (result.type === "skip") {
        return { ok: true, ran: false, reason: "NOT_DUE" };
      }
      return { ok: true, ran: true, entryId: result.entryId };
    } catch (err) {
      console.error("[financeRecurringService.runDueRule]", err);
      return { ok: false, error: "DB_ERROR" };
    }
  },

  /** Lặp các quy tắc đến hạn; mỗi vòng tối đa 1 entry trên 1 rule (rule sớm nhất). */
  async runAllDueRulesForOwner(ownerId: number, maxIterations = 50): Promise<{
    processedRules: number;
    entriesCreated: number;
    stoppedReason: "NO_MORE_DUE" | "MAX_ITERATIONS" | "ERROR";
  }> {
    let entriesCreated = 0;
    let processedRules = 0;

    for (let i = 0; i < maxIterations; i++) {
      const next = await prisma.financeRecurringRule.findFirst({
        where: {
          ownerId,
          deletedAt: null,
          isActive: true,
          nextRunAt: { lte: new Date() },
        },
        orderBy: [{ nextRunAt: "asc" }, { id: "asc" }],
        select: { id: true },
      });

      if (!next) {
        return { processedRules, entriesCreated, stoppedReason: "NO_MORE_DUE" };
      }

      const r = await financeRecurringService.runDueRule({ ownerId, ruleId: next.id });
      processedRules += 1;

      if (!r.ok) {
        return { processedRules, entriesCreated, stoppedReason: "ERROR" };
      }
      if (r.ran) {
        entriesCreated += 1;
      } else {
        break;
      }
    }

    return { processedRules, entriesCreated, stoppedReason: "MAX_ITERATIONS" };
  },

};
