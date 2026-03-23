import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type {
  SubscriptionListItemDTO,
  SubscriptionListQuery,
  SubscriptionListStatsDTO,
  SubscriptionDetailDTO,
  SubscriptionReminderStage,
} from "@/features/trading/model/subscriptionTypes";
import { addDaysLocal, decimalToDigitsString, parseMoneyDigitsToDecimal } from "@/features/trading/model/tradingParse";

function toYMDLocal(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function computeNextReminderAt(input: {
  renewalOrExpiryAt: Date;
  remindDaysBefore: number;
  remindAfterExpiryDays: number;
  lastLeadReminderForRenewalAt: Date | null;
  lastAfterReminderForRenewalAt: Date | null;
}): Date | null {
  const leadAt = addDaysLocal(input.renewalOrExpiryAt, -input.remindDaysBefore);
  const afterAt = addDaysLocal(input.renewalOrExpiryAt, input.remindAfterExpiryDays);

  const renewalMs = input.renewalOrExpiryAt.getTime();
  const lastLeadMs = input.lastLeadReminderForRenewalAt?.getTime() ?? null;
  const lastAfterMs = input.lastAfterReminderForRenewalAt?.getTime() ?? null;

  // After stage already sent => stop
  if (lastAfterMs !== null && lastAfterMs === renewalMs) return null;

  // Lead stage already sent => go to after stage if configured
  if (lastLeadMs !== null && lastLeadMs === renewalMs) {
    if (input.remindAfterExpiryDays <= 0) return null;
    return afterAt;
  }

  // Default => lead stage
  return leadAt;
}

function computeNextReminderStage(input: {
  renewalOrExpiryAt: Date;
  remindDaysBefore: number;
  remindAfterExpiryDays: number;
  nextReminderAt: Date | null;
}): SubscriptionReminderStage | null {
  if (!input.nextReminderAt) return null;
  const leadAt = addDaysLocal(input.renewalOrExpiryAt, -input.remindDaysBefore);
  const afterAt = addDaysLocal(input.renewalOrExpiryAt, input.remindAfterExpiryDays);
  const ms = input.nextReminderAt.getTime();
  if (ms === leadAt.getTime()) return "LEAD";
  if (ms === afterAt.getTime()) return "AFTER";
  return null;
}

function normalizeContactNameForDeleted(contactName: string | null | undefined, contactDeletedAt: Date | null): string | null {
  if (contactDeletedAt) return "Liên hệ đã bị ẩn";
  return contactName ?? null;
}

export const subscriptionService = {
  async getListPage(input: {
    ownerId: number;
    now: Date;
    query: SubscriptionListQuery;
  }): Promise<{
    items: SubscriptionListItemDTO[];
    stats: SubscriptionListStatsDTO;
    totalCount: number;
    page: number;
    pageSize: number;
  }> {
    const limit = Math.min(Math.max(input.query.limit, 1), 200);
    const page = Math.max(input.query.page ?? 1, 1);
    const skip = (page - 1) * limit;
    const term = (input.query.search ?? "").trim();
    const status = input.query.status ?? "UPCOMING";
    const activeOnly = input.query.activeOnly ?? true;

    const today = new Date(input.now.getFullYear(), input.now.getMonth(), input.now.getDate());

    const usageMode = input.query.usageMode ?? "ALL";

    const where: Prisma.SubscriptionWhereInput = {
      ownerId: input.ownerId,
      deletedAt: null,
      ...(activeOnly ? { isActive: true } : {}),
      ...(input.query.categoryId ? { categoryId: input.query.categoryId } : {}),
      ...(usageMode !== "ALL" ? { usageMode } : {}),
      ...(term
        ? {
            OR: [
              { title: { contains: term, mode: "insensitive" } },
              { category: { is: { name: { contains: term, mode: "insensitive" } } } },
            ],
          }
        : {}),
      ...(status === "UPCOMING" ? { renewalOrExpiryAt: { gte: today } } : {}),
      ...(status === "OVERDUE" ? { renewalOrExpiryAt: { lt: today } } : {}),
    };

    const [rows, totalCount, stats] = await Promise.all([
      prisma.subscription.findMany({
        where,
        take: limit,
        skip,
        orderBy: [{ renewalOrExpiryAt: "asc" }, { id: "desc" }],
        include: {
          category: { select: { id: true, name: true } },
          contact: { select: { id: true, name: true, email: true, deletedAt: true } },
        },
      }),
      prisma.subscription.count({ where }),
      this.computeStats({ ownerId: input.ownerId, now: input.now, activeOnly }),
    ]);

    const items: SubscriptionListItemDTO[] = rows.map((s) => {
      const renewalAt = s.renewalOrExpiryAt;
      const stage = computeNextReminderStage({
        renewalOrExpiryAt: renewalAt,
        remindDaysBefore: s.remindDaysBefore,
        remindAfterExpiryDays: s.remindAfterExpiryDays,
        nextReminderAt: s.nextReminderAt,
      });

      const nextReminderAtISO = s.nextReminderAt ? toYMDLocal(s.nextReminderAt) : null;

      const contactName = normalizeContactNameForDeleted(s.contact?.name, s.contact?.deletedAt ?? null);
      const contactEmail = s.contact?.deletedAt ? null : s.contact?.email ?? null;

      return {
        id: s.id,
        title: s.title,
        categoryId: s.categoryId,
        categoryName: s.category.name,
        contactId: s.contactId ?? null,
        usageMode: s.usageMode,
        purchaseStartAtISO: s.purchaseStartAt ? toYMDLocal(s.purchaseStartAt) : null,
        renewalOrExpiryAtISO: toYMDLocal(renewalAt),
        remindDaysBefore: s.remindDaysBefore,
        remindAfterExpiryDays: s.remindAfterExpiryDays,
        nextReminderAtISO,
        nextReminderStage: stage,
        isActive: s.isActive,
        contactName: s.usageMode === "RESELL" ? contactName : null,
        contactEmail: s.usageMode === "RESELL" ? contactEmail : null,
        purchasePriceRaw: decimalToDigitsString(s.purchasePrice),
        salePriceRaw: decimalToDigitsString(s.salePrice),
        currency: s.currency,
        youtubeAccountEmail: s.youtubeAccountEmail,
        netflixAccountEmail: s.netflixAccountEmail,
        netflixAccountPassword: s.netflixAccountPassword,
        notes: s.notes ?? null,
      };
    });

    return { items, stats, totalCount, page, pageSize: limit };
  },

  async getDetail(input: { ownerId: number; subscriptionId: number }): Promise<SubscriptionDetailDTO | null> {
    const row = await prisma.subscription.findFirst({
      where: { id: input.subscriptionId, ownerId: input.ownerId, deletedAt: null },
      include: {
        category: { select: { name: true } },
        contact: { select: { name: true, email: true, deletedAt: true } },
      },
    });

    if (!row) return null;

    const stage = computeNextReminderStage({
      renewalOrExpiryAt: row.renewalOrExpiryAt,
      remindDaysBefore: row.remindDaysBefore,
      remindAfterExpiryDays: row.remindAfterExpiryDays,
      nextReminderAt: row.nextReminderAt,
    });

    const contactName = normalizeContactNameForDeleted(row.contact?.name, row.contact?.deletedAt ?? null);
    const contactEmail = row.contact?.deletedAt ? null : row.contact?.email ?? null;

    return {
      id: row.id,
      title: row.title,
      categoryId: row.categoryId,
      categoryName: row.category.name,
      contactId: row.contactId ?? null,
      usageMode: row.usageMode,

      purchaseStartAtISO: row.purchaseStartAt ? toYMDLocal(row.purchaseStartAt) : null,
      renewalOrExpiryAtISO: toYMDLocal(row.renewalOrExpiryAt),
      remindDaysBefore: row.remindDaysBefore,
      remindAfterExpiryDays: row.remindAfterExpiryDays,
      nextReminderAtISO: row.nextReminderAt ? toYMDLocal(row.nextReminderAt) : null,
      nextReminderStage: stage,

      purchasePriceRaw: decimalToDigitsString(row.purchasePrice),
      salePriceRaw: decimalToDigitsString(row.salePrice),
      currency: row.currency,

      isActive: row.isActive,

      contactName: row.usageMode === "RESELL" ? contactName : null,
      contactEmail: row.usageMode === "RESELL" ? contactEmail : null,

      notes: row.notes ?? null,

      youtubeAccountEmail: row.youtubeAccountEmail,
      netflixAccountEmail: row.netflixAccountEmail,
      netflixAccountPassword: row.netflixAccountPassword,

      createdAtISO: row.createdAt.toISOString(),
      updatedAtISO: row.updatedAt.toISOString(),
    };
  },

  async create(input: {
    ownerId: number;
    data: {
      title: string;
      categoryId: number;
      usageMode: "PERSONAL_FAMILY" | "RESELL";
      contactId?: number | null;
        purchaseStartAt?: Date | null;
      renewalOrExpiryAt: Date;
      remindDaysBefore: number;
      remindAfterExpiryDays: number;
      purchasePrice?: string | null;
      salePrice?: string | null;
      currency?: string | null;
      notes?: string | null;
      youtubeAccountEmail?: string | null;
      netflixAccountEmail?: string | null;
      netflixAccountPassword?: string | null;
      isActive?: boolean;
    };
  }): Promise<{ ok: true; id: number } | { ok: false; error: "CATEGORY_NOT_FOUND" | "CONTACT_REQUIRED" | "CONTACT_NOT_FOUND" | "VALIDATION_FAILED" }> {
    // Business validations that depend on multiple fields.
    if (input.data.usageMode === "RESELL" && !input.data.contactId) {
      return { ok: false, error: "CONTACT_REQUIRED" };
    }

    if (input.data.usageMode === "PERSONAL_FAMILY" && input.data.contactId) {
      // Keep policy strict; allow future flexibility later.
      return { ok: false, error: "VALIDATION_FAILED" };
    }

    const [category, contact] = await Promise.all([
      prisma.serviceCategory.findFirst({
        where: { id: input.data.categoryId, deletedAt: null, isActive: true, ownerId: input.ownerId },
        select: { id: true },
      }),
      input.data.contactId
        ? prisma.saleContact.findFirst({
            where: { id: input.data.contactId, deletedAt: null, ownerId: input.ownerId },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

    if (!category) return { ok: false, error: "CATEGORY_NOT_FOUND" };
    if (input.data.usageMode === "RESELL" && input.data.contactId && !contact) return { ok: false, error: "CONTACT_NOT_FOUND" };

    const purchasePriceDecimal = input.data.purchasePrice ? parseMoneyDigitsToDecimal(input.data.purchasePrice) : null;
    const salePriceDecimal = input.data.salePrice ? parseMoneyDigitsToDecimal(input.data.salePrice) : null;

    if (input.data.usageMode === "RESELL") {
      if (!purchasePriceDecimal || !salePriceDecimal) {
        // parseMoneyDigitsToDecimal returns 0 for empty, so check raw separately.
        return { ok: false, error: "VALIDATION_FAILED" };
      }
    }

    const renewalAt = input.data.renewalOrExpiryAt;
    const nextReminderAt = addDaysLocal(renewalAt, -input.data.remindDaysBefore);

    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.subscription.create({
        data: {
          ownerId: input.ownerId,
          categoryId: input.data.categoryId,
          contactId: input.data.contactId ?? null,
          title: input.data.title.trim(),
          usageMode: input.data.usageMode,
          purchaseStartAt: input.data.purchaseStartAt ?? null,
          renewalOrExpiryAt: renewalAt,
          remindDaysBefore: input.data.remindDaysBefore,
          remindAfterExpiryDays: input.data.remindAfterExpiryDays,
          lastLeadReminderForRenewalAt: null,
          lastAfterReminderForRenewalAt: null,
          nextReminderAt,
          isActive: input.data.isActive ?? true,
          purchasePrice: purchasePriceDecimal,
          salePrice: salePriceDecimal,
          currency: input.data.currency?.trim() ? input.data.currency.trim() : "VND",
          notes: input.data.notes ?? null,
          youtubeAccountEmail: input.data.youtubeAccountEmail ?? null,
          netflixAccountEmail: input.data.netflixAccountEmail ?? null,
          netflixAccountPassword: input.data.netflixAccountPassword ?? null,
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          action: "TRADING_SUBSCRIPTION_CREATED",
          userId: input.ownerId,
          metadata: { entityType: "Subscription", entityId: row.id, usageMode: input.data.usageMode },
        },
      });
      return row;
    });

    return { ok: true, id: created.id };
  },

  async update(input: {
    ownerId: number;
    subscriptionId: number;
    data: {
      title?: string | null;
      categoryId?: number;
      usageMode?: "PERSONAL_FAMILY" | "RESELL";
      contactId?: number | null;
      purchaseStartAt?: Date | null;
      renewalOrExpiryAt?: Date;
      remindDaysBefore?: number;
      remindAfterExpiryDays?: number;
      purchasePrice?: string | null;
      salePrice?: string | null;
      currency?: string | null;
      notes?: string | null;
      youtubeAccountEmail?: string | null;
      netflixAccountEmail?: string | null;
      netflixAccountPassword?: string | null;
    };
  }): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" | "UPDATE_FAILED" }> {
    const current = await prisma.subscription.findFirst({
      where: { id: input.subscriptionId, ownerId: input.ownerId, deletedAt: null },
      select: {
        id: true,
        usageMode: true,
        categoryId: true,
        contactId: true,
        purchaseStartAt: true,
        renewalOrExpiryAt: true,
        remindDaysBefore: true,
        remindAfterExpiryDays: true,
        lastLeadReminderForRenewalAt: true,
        lastAfterReminderForRenewalAt: true,
        purchasePrice: true,
        salePrice: true,
        currency: true,
        isActive: true,
        notes: true,
        youtubeAccountEmail: true,
        netflixAccountEmail: true,
        netflixAccountPassword: true,
      },
    });
    if (!current) return { ok: false, error: "NOT_FOUND" };

    const nextRenewalAt = input.data.renewalOrExpiryAt ?? current.renewalOrExpiryAt;
    const nextRemindDaysBefore = input.data.remindDaysBefore ?? current.remindDaysBefore;
    const nextRemindAfterExpiryDays = input.data.remindAfterExpiryDays ?? current.remindAfterExpiryDays;

    const nextNextReminderAt = computeNextReminderAt({
      renewalOrExpiryAt: nextRenewalAt,
      remindDaysBefore: nextRemindDaysBefore,
      remindAfterExpiryDays: nextRemindAfterExpiryDays,
      lastLeadReminderForRenewalAt: current.lastLeadReminderForRenewalAt,
      lastAfterReminderForRenewalAt: current.lastAfterReminderForRenewalAt,
    });

    const purchasePriceDecimal =
      input.data.purchasePrice !== undefined ? (input.data.purchasePrice ? parseMoneyDigitsToDecimal(input.data.purchasePrice) : null) : undefined;
    const salePriceDecimal =
      input.data.salePrice !== undefined ? (input.data.salePrice ? parseMoneyDigitsToDecimal(input.data.salePrice) : null) : undefined;

    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: input.subscriptionId },
        data: {
          ...(input.data.title !== undefined ? { title: input.data.title?.trim() ?? "" } : {}),
          ...(input.data.categoryId !== undefined ? { categoryId: input.data.categoryId } : {}),
          ...(input.data.usageMode !== undefined ? { usageMode: input.data.usageMode } : {}),
          ...(input.data.contactId !== undefined ? { contactId: input.data.contactId ?? null } : {}),
          ...(input.data.purchaseStartAt !== undefined ? { purchaseStartAt: input.data.purchaseStartAt ?? null } : {}),
          ...(input.data.renewalOrExpiryAt !== undefined ? { renewalOrExpiryAt: nextRenewalAt } : {}),
          ...(input.data.remindDaysBefore !== undefined ? { remindDaysBefore: nextRemindDaysBefore } : {}),
          ...(input.data.remindAfterExpiryDays !== undefined ? { remindAfterExpiryDays: nextRemindAfterExpiryDays } : {}),
          nextReminderAt: nextNextReminderAt,
          ...(purchasePriceDecimal !== undefined ? { purchasePrice: purchasePriceDecimal } : {}),
          ...(salePriceDecimal !== undefined ? { salePrice: salePriceDecimal } : {}),
          ...(input.data.currency !== undefined ? { currency: input.data.currency ?? "VND" } : {}),
          ...(input.data.notes !== undefined ? { notes: input.data.notes ?? null } : {}),
          ...(input.data.youtubeAccountEmail !== undefined ? { youtubeAccountEmail: input.data.youtubeAccountEmail ?? null } : {}),
          ...(input.data.netflixAccountEmail !== undefined ? { netflixAccountEmail: input.data.netflixAccountEmail ?? null } : {}),
          ...(input.data.netflixAccountPassword !== undefined ? { netflixAccountPassword: input.data.netflixAccountPassword ?? null } : {}),
        } as Prisma.SubscriptionUncheckedUpdateInput,
      });
      await tx.auditLog.create({
        data: {
          action: "TRADING_SUBSCRIPTION_UPDATED",
          userId: input.ownerId,
          metadata: { entityType: "Subscription", entityId: input.subscriptionId },
        },
      });
    });

    return { ok: true };
  },

  async toggleActive(input: { ownerId: number; subscriptionId: number; active: boolean }): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" }> {
    const outcome = await prisma.$transaction(async (tx) => {
      const res = await tx.subscription.updateMany({
        where: { id: input.subscriptionId, ownerId: input.ownerId, deletedAt: null },
        data: { isActive: input.active },
      });
      if (res.count === 0) return "NOT_FOUND" as const;
      await tx.auditLog.create({
        data: {
          action: "TRADING_SUBSCRIPTION_TOGGLED_ACTIVE",
          userId: input.ownerId,
          metadata: { entityType: "Subscription", entityId: input.subscriptionId, active: input.active },
        },
      });
      return "OK" as const;
    });
    if (outcome === "NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
    return { ok: true };
  },

  async renew(input: {
    ownerId: number;
    subscriptionId: number;
    data: {
      renewalOrExpiryAt: Date;
      remindDaysBefore: number;
      remindAfterExpiryDays: number;
      purchasePrice?: string | null;
      salePrice?: string | null;
      currency?: string | null;
      youtubeAccountEmail?: string | null;
      netflixAccountEmail?: string | null;
      netflixAccountPassword?: string | null;
    };
  }): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" | "VALIDATION_FAILED" }> {
    const current = await prisma.subscription.findFirst({
      where: { id: input.subscriptionId, ownerId: input.ownerId, deletedAt: null },
      select: {
        id: true,
        usageMode: true,
      },
    });
    if (!current) return { ok: false, error: "NOT_FOUND" };

    if (current.usageMode === "RESELL") {
      if (input.data.purchasePrice == null || input.data.salePrice == null) return { ok: false, error: "VALIDATION_FAILED" };
    }

    const purchasePriceDecimal =
      input.data.purchasePrice !== undefined ? (input.data.purchasePrice ? parseMoneyDigitsToDecimal(input.data.purchasePrice) : null) : null;
    const salePriceDecimal =
      input.data.salePrice !== undefined ? (input.data.salePrice ? parseMoneyDigitsToDecimal(input.data.salePrice) : null) : null;

    const nextReminderAt = addDaysLocal(input.data.renewalOrExpiryAt, -input.data.remindDaysBefore);

    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: input.subscriptionId },
        data: {
          renewalOrExpiryAt: input.data.renewalOrExpiryAt,
          remindDaysBefore: input.data.remindDaysBefore,
          remindAfterExpiryDays: input.data.remindAfterExpiryDays,

          // Workflow: renew must reset dedup stage
          lastLeadReminderForRenewalAt: null,
          lastAfterReminderForRenewalAt: null,
          nextReminderAt,

          ...(input.data.currency !== undefined ? { currency: input.data.currency ?? "VND" } : {}),
          purchasePrice: current.usageMode === "RESELL" ? purchasePriceDecimal : null,
          salePrice: current.usageMode === "RESELL" ? salePriceDecimal : null,

          ...(input.data.youtubeAccountEmail !== undefined ? { youtubeAccountEmail: input.data.youtubeAccountEmail ?? null } : {}),
          ...(input.data.netflixAccountEmail !== undefined ? { netflixAccountEmail: input.data.netflixAccountEmail ?? null } : {}),
          ...(input.data.netflixAccountPassword !== undefined ? { netflixAccountPassword: input.data.netflixAccountPassword ?? null } : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          action: "TRADING_SUBSCRIPTION_RENEWED",
          userId: input.ownerId,
          metadata: { entityType: "Subscription", entityId: input.subscriptionId },
        },
      });
    });

    return { ok: true };
  },

  async softDelete(input: {
    ownerId: number;
    subscriptionId: number;
  }): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" }> {
    const outcome = await prisma.$transaction(async (tx) => {
      const res = await tx.subscription.updateMany({
        where: { id: input.subscriptionId, ownerId: input.ownerId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (res.count === 0) return "NOT_FOUND" as const;
      await tx.auditLog.create({
        data: {
          action: "TRADING_SUBSCRIPTION_DELETED",
          userId: input.ownerId,
          metadata: { entityType: "Subscription", entityId: input.subscriptionId },
        },
      });
      return "OK" as const;
    });
    if (outcome === "NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
    return { ok: true };
  },

  computeStats: async function (input: { ownerId: number; now: Date; activeOnly: boolean }): Promise<SubscriptionListStatsDTO> {
    const today = new Date(input.now.getFullYear(), input.now.getMonth(), input.now.getDate());
    const in7 = addDaysLocal(today, 7);
    const nextStatsWhereBase: Prisma.SubscriptionWhereInput = {
      ownerId: input.ownerId,
      deletedAt: null,
      ...(input.activeOnly ? { isActive: true } : {}),
    };

    const [activeCount, expiringSoonCount, buyerReminderCount] = await Promise.all([
      prisma.subscription.count({ where: nextStatsWhereBase }),
      prisma.subscription.count({
        where: {
          ...nextStatsWhereBase,
          renewalOrExpiryAt: { gte: today, lte: in7 },
        },
      }),
      prisma.subscription.count({
        where: {
          ...nextStatsWhereBase,
          usageMode: "RESELL",
          contact: { is: { email: { not: null }, deletedAt: null } },
        },
      }),
    ]);

    return { activeCount, expiringSoonCount, buyerReminderCount };
  },
};

