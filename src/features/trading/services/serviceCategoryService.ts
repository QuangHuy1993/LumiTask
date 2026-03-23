import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { ServiceCategoryListItemDTO, ServiceCategoryListQuery } from "@/features/trading/model/categoryTypes";

export const serviceCategoryService = {
  async getListPage(input: {
    ownerId: number;
    limit: number;
    search?: string;
    isActive?: ServiceCategoryListQuery["isActive"];
  }): Promise<{ items: ServiceCategoryListItemDTO[]; totalCount: number }> {
    const limit = Math.min(Math.max(input.limit, 1), 200);
    const term = (input.search ?? "").trim();

    const where: Prisma.ServiceCategoryWhereInput = {
      ownerId: input.ownerId,
      deletedAt: null,
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

    const [rows, totalCount] = await Promise.all([
      prisma.serviceCategory.findMany({
        where,
        take: limit,
        orderBy: [{ sortOrder: "asc" }, { id: "desc" }],
        select: { id: true, name: true, slug: true, sortOrder: true, isActive: true },
      }),
      prisma.serviceCategory.count({ where }),
    ]);

    return { items: rows, totalCount };
  },

  async create(input: {
    ownerId: number;
    data: Omit<Prisma.ServiceCategoryUncheckedCreateInput, "ownerId">;
  }): Promise<
    { ok: true; item: ServiceCategoryListItemDTO } | { ok: false; error: "CREATE_FAILED" | "DUPLICATE_SLUG" }
  > {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const row = await tx.serviceCategory.create({
          data: { ...input.data, ownerId: input.ownerId },
          select: { id: true, name: true, slug: true, sortOrder: true, isActive: true },
        });
        await tx.auditLog.create({
          data: {
            action: "TRADING_CATEGORY_CREATED",
            userId: input.ownerId,
            metadata: { entityType: "ServiceCategory", entityId: row.id },
          },
        });
        return row;
      });
      return { ok: true, item: created };
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
    data: Prisma.ServiceCategoryUpdateInput;
  }): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" | "UPDATE_FAILED" | "DUPLICATE_SLUG" }> {
    try {
      const outcome = await prisma.$transaction(async (tx) => {
        const res = await tx.serviceCategory.updateMany({
          where: { id: input.categoryId, ownerId: input.ownerId, deletedAt: null },
          data: input.data,
        });
        if (res.count === 0) return "NOT_FOUND" as const;
        await tx.auditLog.create({
          data: {
            action: "TRADING_CATEGORY_UPDATED",
            userId: input.ownerId,
            metadata: { entityType: "ServiceCategory", entityId: input.categoryId },
          },
        });
        return "OK" as const;
      });
      if (outcome === "NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
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
      const res = await tx.serviceCategory.updateMany({
        where: { id: input.categoryId, ownerId: input.ownerId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (res.count === 0) return "NOT_FOUND" as const;
      await tx.auditLog.create({
        data: {
          action: "TRADING_CATEGORY_DELETED",
          userId: input.ownerId,
          metadata: { entityType: "ServiceCategory", entityId: input.categoryId },
        },
      });
      return "OK" as const;
    });
    if (outcome === "NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
    return { ok: true };
  },
};

