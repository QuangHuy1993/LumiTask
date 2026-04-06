import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { FinanceCategoryListItemDTO, FinanceCategoryListQuery } from "@/features/expenses/model/financeCategoryTypes";
import type { FinanceCategoryCreateInput, FinanceCategoryUpdateInput } from "@/features/expenses/model/financeCategoryValidation";

type ServiceError = "NOT_FOUND" | "DUPLICATE_SLUG" | "KIND_CHANGE_BLOCKED";

export const financeCategoryService = {
  async getListPage(input: {
    ownerId: number;
    limit: number;
    search?: string;
    kind?: FinanceCategoryListQuery["kind"];
    isActive?: FinanceCategoryListQuery["isActive"];
    /** Bỏ COUNT(*) khi chỉ cần danh sách (ví dụ bootstrap một màn hình). */
    skipTotalCount?: boolean;
    /** Bỏ đếm entry theo từng danh mục (giảm tải khi chỉ cần chọn danh mục). */
    skipEntryCount?: boolean;
  }): Promise<{ items: FinanceCategoryListItemDTO[]; totalCount: number }> {
    const limit = Math.min(Math.max(input.limit, 1), 200);
    const term = (input.search ?? "").trim();

    const where: Prisma.FinanceCategoryWhereInput = {
      ownerId: input.ownerId,
      deletedAt: null,
      ...(input.kind !== undefined && input.kind !== "ALL" ? { kind: input.kind } : {}),
      ...(input.isActive !== undefined && input.isActive !== "ALL" ? { isActive: input.isActive } : {}),
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { slug: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const baseSelect = {
      id: true,
      kind: true,
      name: true,
      slug: true,
      color: true,
      icon: true,
      sortOrder: true,
      isActive: true,
    } as const;

    const findManyQ = prisma.financeCategory.findMany({
      where,
      take: limit,
      orderBy: [{ sortOrder: "asc" }, { id: "desc" }],
      select: input.skipEntryCount
        ? baseSelect
        : {
            ...baseSelect,
            _count: {
              select: {
                entries: { where: { deletedAt: null } },
              },
            },
          },
    });

    if (input.skipTotalCount) {
      const rows = await findManyQ;
      return { items: rows as FinanceCategoryListItemDTO[], totalCount: rows.length };
    }

    const [rows, totalCount] = await Promise.all([findManyQ, prisma.financeCategory.count({ where })]);

    return { items: rows as FinanceCategoryListItemDTO[], totalCount };
  },

  async create(input: {
    ownerId: number;
    data: FinanceCategoryCreateInput;
  }): Promise<{ ok: true; item: FinanceCategoryListItemDTO } | { ok: false; error: "DUPLICATE_SLUG" }> {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const row = await tx.financeCategory.create({
          data: {
            ownerId: input.ownerId,
            kind: input.data.kind,
            name: input.data.name,
            slug: input.data.slug,
            color: input.data.color || null,
            icon: input.data.icon || null,
            sortOrder: input.data.sortOrder,
            isActive: input.data.isActive,
          },
          select: {
            id: true,
            kind: true,
            name: true,
            slug: true,
            color: true,
            icon: true,
            sortOrder: true,
            isActive: true,
            _count: {
              select: {
                entries: { where: { deletedAt: null } },
              },
            },
          },
        });
        await tx.auditLog.create({
          data: {
            action: "FINANCE_CATEGORY_CREATED",
            userId: input.ownerId,
            entityType: "FinanceCategory",
            entityId: String(row.id),
          },
        });
        return row;
      });
      return { ok: true, item: created as FinanceCategoryListItemDTO };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return { ok: false, error: "DUPLICATE_SLUG" };
      }
      throw e;
    }
  },

  async update(input: {
    ownerId: number;
    categoryId: number;
    data: FinanceCategoryUpdateInput;
  }): Promise<{ ok: true } | { ok: false; error: ServiceError }> {
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        // Nếu đang đổi kind → kiểm tra dependency
        if (input.data.kind !== undefined) {
          const current = await tx.financeCategory.findUnique({
            where: { id: input.categoryId },
            select: { kind: true },
          });
          if (current && current.kind !== input.data.kind) {
            const [entryCount, budgetCount] = await Promise.all([
              tx.financeEntry.count({
                where: { categoryId: input.categoryId, deletedAt: null },
              }),
              tx.financeBudgetCategoryLine.count({
                where: { categoryId: input.categoryId },
              }),
            ]);
            if (entryCount > 0 || budgetCount > 0) return "KIND_CHANGE_BLOCKED" as const;
          }
        }

        const res = await tx.financeCategory.updateMany({
          where: { id: input.categoryId, ownerId: input.ownerId, deletedAt: null },
          data: {
            ...(input.data.kind !== undefined ? { kind: input.data.kind } : {}),
            ...(input.data.name !== undefined ? { name: input.data.name } : {}),
            ...(input.data.slug !== undefined ? { slug: input.data.slug } : {}),
            ...(input.data.color !== undefined ? { color: input.data.color || null } : {}),
            ...(input.data.icon !== undefined ? { icon: input.data.icon || null } : {}),
            ...(input.data.sortOrder !== undefined ? { sortOrder: input.data.sortOrder } : {}),
            ...(input.data.isActive !== undefined ? { isActive: input.data.isActive } : {}),
          },
        });
        if (res.count === 0) return "NOT_FOUND" as const;

        await tx.auditLog.create({
          data: {
            action: "FINANCE_CATEGORY_UPDATED",
            userId: input.ownerId,
            entityType: "FinanceCategory",
            entityId: String(input.categoryId),
          },
        });
        return "OK" as const;
      });

      if (outcome === "NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
      if (outcome === "KIND_CHANGE_BLOCKED") return { ok: false, error: "KIND_CHANGE_BLOCKED" };
      return { ok: true };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
        return { ok: false, error: "DUPLICATE_SLUG" };
      }
      throw e;
    }
  },

  async softDelete(input: {
    ownerId: number;
    categoryId: number;
  }): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" }> {
    const outcome = await prisma.$transaction(async (tx) => {
      // Đổi slug để giải phóng unique constraint → user có thể tạo lại cùng slug
      const res = await tx.financeCategory.updateMany({
        where: { id: input.categoryId, ownerId: input.ownerId, deletedAt: null },
        data: {
          deletedAt: new Date(),
          slug: `_deleted_${input.categoryId}_${Date.now()}`,
        },
      });
      if (res.count === 0) return "NOT_FOUND" as const;

      await tx.auditLog.create({
        data: {
          action: "FINANCE_CATEGORY_DELETED",
          userId: input.ownerId,
          entityType: "FinanceCategory",
          entityId: String(input.categoryId),
        },
      });
      return "OK" as const;
    });

    if (outcome === "NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
    return { ok: true };
  },
};
