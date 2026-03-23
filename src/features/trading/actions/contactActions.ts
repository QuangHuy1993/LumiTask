"use server";

import { revalidatePath } from "next/cache";

import { sessionService } from "@/lib/auth/session";
import type { SaleContactListItemDTO } from "@/features/trading/model/contactTypes";
import { saleContactFilterSchema, saleContactCreateSchema, saleContactUpdateSchema } from "@/features/trading/model/tradingValidation";
import type { Prisma } from "@prisma/client";
import { saleContactService } from "@/features/trading/services/saleContactService";

type ActionError = "UNAUTHENTICATED" | "VALIDATION_ERROR" | "DB_ERROR" | "NOT_FOUND";

export async function getContactsAction(queryInput?: unknown): Promise<
  | { success: true; items: SaleContactListItemDTO[]; totalCount: number }
  | { success: false; error: ActionError; message?: string }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = saleContactFilterSchema.safeParse(queryInput ?? {});
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR", message: "Dữ liệu không hợp lệ" };

    const res = await saleContactService.getListPage({
      ownerId: user.id,
      limit: parsed.data.limit,
      search: parsed.data.search,
      contactMethod: parsed.data.contactMethod,
      status: parsed.data.status,
    });

    return { success: true, items: res.items, totalCount: res.totalCount };
  } catch (error) {
    console.error("Error [getContactsAction]:", error);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function createContactAction(
  input: unknown,
): Promise<{ success: true; id: number } | { success: false; error: ActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = saleContactCreateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

    const payload = parsed.data;
    const zalo = payload.zalo && payload.zalo !== "" ? payload.zalo : null;
    const facebookUrl = payload.facebookUrl && payload.facebookUrl !== "" ? payload.facebookUrl : null;
    const email = payload.email && payload.email !== "" ? payload.email : null;
    const note = payload.note && payload.note !== "" ? payload.note : null;

    if (payload.contactMethod === "ZALO" && !zalo) return { success: false, error: "VALIDATION_ERROR" };
    if (payload.contactMethod === "FACEBOOK" && !facebookUrl) return { success: false, error: "VALIDATION_ERROR" };

    const res = await saleContactService.create({
      ownerId: user.id,
      data: {
        name: payload.name,
        contactMethod: payload.contactMethod,
        zalo,
        facebookUrl,
        email,
        note,
        status: payload.status,
      } as Prisma.SaleContactUncheckedCreateInput,
    });

    if (!res.ok) return { success: false, error: "DB_ERROR" };

    revalidatePath("/trading/contacts");
    return { success: true, id: res.id };
  } catch (error) {
    console.error("Error [createContactAction]:", error);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function updateContactAction(contactId: number, input: unknown): Promise<{ success: true } | { success: false; error: ActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = saleContactUpdateSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

    const payload = parsed.data;
    const zalo = payload.zalo === undefined ? undefined : payload.zalo && payload.zalo !== "" ? payload.zalo : null;
    const facebookUrl =
      payload.facebookUrl === undefined ? undefined : payload.facebookUrl && payload.facebookUrl !== "" ? payload.facebookUrl : null;
    const email = payload.email === undefined ? undefined : payload.email && payload.email !== "" ? payload.email : null;
    const note = payload.note === undefined ? undefined : payload.note && payload.note !== "" ? payload.note : null;

    const data: Prisma.SaleContactUpdateInput = {
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.contactMethod !== undefined ? { contactMethod: payload.contactMethod } : {}),
      ...(zalo !== undefined ? { zalo } : {}),
      ...(facebookUrl !== undefined ? { facebookUrl } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(note !== undefined ? { note } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
    };

    const res = await saleContactService.update({ ownerId: user.id, contactId, data });
    if (!res.ok) {
      const mappedError: ActionError = res.error === "NOT_FOUND" ? "NOT_FOUND" : "DB_ERROR";
      return { success: false, error: mappedError };
    }

    revalidatePath("/trading/contacts");
    return { success: true };
  } catch (error) {
    console.error("Error [updateContactAction]:", error);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function deleteContactAction(contactId: number): Promise<{ success: true } | { success: false; error: ActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const res = await saleContactService.softDelete({ ownerId: user.id, contactId });
    if (!res.ok) return { success: false, error: res.error };

    revalidatePath("/trading/contacts");
    return { success: true };
  } catch (error) {
    console.error("Error [deleteContactAction]:", error);
    return { success: false, error: "DB_ERROR" };
  }
}

