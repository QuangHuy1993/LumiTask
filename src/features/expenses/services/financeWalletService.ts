import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import type { FinanceWalletListItemDTO, FinanceWalletListQuery } from "@/features/expenses/model/financeWalletTypes";
import { walletCreateSchema, walletUpdateSchema } from "@/features/expenses/model/financeWalletValidation";

type WalletCreateInput = z.infer<typeof walletCreateSchema>;
type WalletUpdateInput = z.infer<typeof walletUpdateSchema>;

export const financeWalletService = {
  async getListPage(
    input: {
      ownerId: number;
      limit: number;
      search?: FinanceWalletListQuery["search"];
      /** Bỏ COUNT(*) khi chỉ cần danh sách (ví dụ bootstrap một màn hình). */
      skipTotalCount?: boolean;
    },
  ): Promise<{ items: FinanceWalletListItemDTO[]; totalCount: number }> {
    const limit = Math.min(Math.max(input.limit, 1), 200);
    const term = (input.search ?? "").trim();

    const where: Prisma.FinanceWalletWhereInput = {
      ownerId: input.ownerId,
      deletedAt: null,
      ...(term ? { name: { contains: term, mode: "insensitive" } } : {}),
    };

    const findManyQ = prisma.financeWallet.findMany({
      where,
      take: limit,
      orderBy: [{ sortOrder: "asc" }, { id: "desc" }],
      select: { id: true, name: true, currency: true, sortOrder: true, isDefault: true, icon: true },
    });

    if (input.skipTotalCount) {
      const rows = await findManyQ;
      return { items: rows as FinanceWalletListItemDTO[], totalCount: rows.length };
    }

    const [rows, totalCount] = await Promise.all([findManyQ, prisma.financeWallet.count({ where })]);

    return { items: rows as FinanceWalletListItemDTO[], totalCount };
  },

  async create(input: {
    ownerId: number;
    data: WalletCreateInput;
  }): Promise<{ ok: true; item: FinanceWalletListItemDTO } | { ok: false; error: "CREATE_FAILED" }> {
    const created = await prisma.$transaction(async (tx) => {
      if (input.data.isDefault) {
        await tx.financeWallet.updateMany({
          where: { ownerId: input.ownerId, isDefault: true, deletedAt: null },
          data: { isDefault: false },
        });
      }

      const row = await tx.financeWallet.create({
        data: {
          ownerId: input.ownerId,
          name: input.data.name,
          currency: input.data.currency ?? "VND",
          icon: input.data.icon ?? null,
          sortOrder: input.data.sortOrder ?? 0,
          isDefault: input.data.isDefault ?? false,
        },
        select: { id: true, name: true, currency: true, sortOrder: true, isDefault: true, icon: true },
      });

      await tx.auditLog.create({
        data: {
          action: "FINANCE_WALLET_CREATED",
          userId: input.ownerId,
          entityType: "FinanceWallet",
          entityId: String(row.id),
        },
      });

      return row;
    });

    return { ok: true, item: created as FinanceWalletListItemDTO };
  },

  async update(input: {
    ownerId: number;
    walletId: number;
    data: WalletUpdateInput;
  }): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" }> {
    const outcome = await prisma.$transaction(async (tx) => {
      const existing = await tx.financeWallet.findFirst({
        where: { id: input.walletId, ownerId: input.ownerId, deletedAt: null },
        select: { id: true },
      });
      if (!existing) return "NOT_FOUND" as const;

      if (input.data.isDefault) {
        await tx.financeWallet.updateMany({
          where: { ownerId: input.ownerId, isDefault: true, deletedAt: null, id: { not: input.walletId } },
          data: { isDefault: false },
        });
      }

      await tx.financeWallet.update({
        where: { id: input.walletId },
        data: {
          ...(input.data.name !== undefined ? { name: input.data.name } : {}),
          ...(input.data.currency !== undefined ? { currency: input.data.currency } : {}),
          ...(input.data.icon !== undefined ? { icon: input.data.icon } : {}),
          ...(input.data.sortOrder !== undefined ? { sortOrder: input.data.sortOrder } : {}),
          ...(input.data.isDefault !== undefined ? { isDefault: input.data.isDefault } : {}),
        },
        select: { id: true },
      });

      await tx.auditLog.create({
        data: {
          action: "FINANCE_WALLET_UPDATED",
          userId: input.ownerId,
          entityType: "FinanceWallet",
          entityId: String(input.walletId),
        },
      });

      return "OK" as const;
    });

    if (outcome === "NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
    return { ok: true };
  },

  async softDelete(input: {
    ownerId: number;
    walletId: number;
  }): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" }> {
    const outcome = await prisma.$transaction(async (tx) => {
      const res = await tx.financeWallet.updateMany({
        where: { id: input.walletId, ownerId: input.ownerId, deletedAt: null, isDefault: false },
        data: { deletedAt: new Date() },
      });
      if (res.count === 0) return "NOT_FOUND" as const;

      await tx.auditLog.create({
        data: {
          action: "FINANCE_WALLET_DELETED",
          userId: input.ownerId,
          entityType: "FinanceWallet",
          entityId: String(input.walletId),
        },
      });
      return "OK" as const;
    });

    if (outcome === "NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
    return { ok: true };
  },
};
