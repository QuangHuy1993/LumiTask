import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import type { SaleContactListItemDTO, SaleContactListQuery } from "@/features/trading/model/contactTypes";

function buildZaloIdentification(zalo?: string | null): string | null {
  const v = zalo?.trim();
  if (!v) return null;
  if (v.includes("zalo.me/")) return v;
  if (v.includes("zalo.me")) return `zalo.me/${v.replace(/^.*zalo\.me\/?/, "")}`;
  return `zalo.me/${v}`;
}

function buildFacebookIdentification(url?: string | null): string | null {
  const v = url?.trim();
  if (!v) return null;
  return v.replace(/\/+$/, "");
}

export const saleContactService = {
  async getListPage(input: {
    ownerId: number;
    limit: number;
    search?: string;
    contactMethod?: SaleContactListQuery["contactMethod"];
    status?: SaleContactListQuery["status"];
  }): Promise<{ items: SaleContactListItemDTO[]; totalCount: number }> {
    const limit = Math.min(Math.max(input.limit, 1), 200);
    const term = (input.search ?? "").trim();

    const where: Prisma.SaleContactWhereInput = {
      ownerId: input.ownerId,
      deletedAt: null,
      ...(input.contactMethod && input.contactMethod !== "ALL"
        ? { contactMethod: input.contactMethod }
        : {}),
      ...(input.status && input.status !== "ALL" ? { status: input.status } : {}),
      ...(term
        ? {
            OR: [
              { name: { contains: term, mode: "insensitive" } },
              { zalo: { contains: term, mode: "insensitive" } },
              { facebookUrl: { contains: term, mode: "insensitive" } },
              { email: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, totalCount] = await Promise.all([
      prisma.saleContact.findMany({
        where,
        take: limit,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          name: true,
          contactMethod: true,
          zalo: true,
          facebookUrl: true,
          email: true,
          note: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.saleContact.count({ where }),
    ]);

    const items = rows.map((c) => {
      const identification =
        c.contactMethod === "ZALO"
          ? buildZaloIdentification(c.zalo)
          : buildFacebookIdentification(c.facebookUrl) ?? "";

      return {
        id: c.id,
        name: c.name,
        contactMethod: c.contactMethod,
        identification: identification ?? "",
        zalo: c.contactMethod === "ZALO" ? c.zalo : null,
        facebookUrl: c.contactMethod === "FACEBOOK" ? c.facebookUrl : null,
        email: c.email ?? null,
        note: c.note ?? null,
        status: c.status,
      };
    });

    return { items, totalCount };
  },

  async create(input: {
    ownerId: number;
    data: Prisma.SaleContactUncheckedCreateInput;
  }): Promise<{ ok: true; id: number } | { ok: false; error: "CREATE_FAILED" }> {
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.saleContact.create({
        data: {
          ...input.data,
          ownerId: input.ownerId,
        },
        select: { id: true },
      });
      await tx.auditLog.create({
        data: {
          action: "TRADING_CONTACT_CREATED",
          userId: input.ownerId,
          metadata: { entityType: "SaleContact", entityId: row.id },
        },
      });
      return row;
    });
    return { ok: true, id: created.id };
  },

  async update(input: {
    ownerId: number;
    contactId: number;
    data: Prisma.SaleContactUpdateInput;
  }): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" | "UPDATE_FAILED" }> {
    const outcome = await prisma.$transaction(async (tx) => {
      const res = await tx.saleContact.updateMany({
        where: { id: input.contactId, ownerId: input.ownerId, deletedAt: null },
        data: input.data,
      });
      if (res.count === 0) return "NOT_FOUND" as const;
      await tx.auditLog.create({
        data: {
          action: "TRADING_CONTACT_UPDATED",
          userId: input.ownerId,
          metadata: { entityType: "SaleContact", entityId: input.contactId },
        },
      });
      return "OK" as const;
    });
    if (outcome === "NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
    return { ok: true };
  },

  async softDelete(input: {
    ownerId: number;
    contactId: number;
  }): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" }> {
    const outcome = await prisma.$transaction(async (tx) => {
      const res = await tx.saleContact.updateMany({
        where: { id: input.contactId, ownerId: input.ownerId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      if (res.count === 0) return "NOT_FOUND" as const;
      await tx.auditLog.create({
        data: {
          action: "TRADING_CONTACT_DELETED",
          userId: input.ownerId,
          metadata: { entityType: "SaleContact", entityId: input.contactId },
        },
      });
      return "OK" as const;
    });
    if (outcome === "NOT_FOUND") return { ok: false, error: "NOT_FOUND" };
    return { ok: true };
  },
};

