"use server";

import { revalidatePath } from "next/cache";

import { sessionService } from "@/lib/auth/session";
import type { SubscriptionListPageDTO, SubscriptionDetailDTO, SubscriptionListQuery } from "@/features/trading/model/subscriptionTypes";
import {
  subscriptionListSchema,
  subscriptionRenewSchema,
  subscriptionCreateSchema,
  subscriptionUpdateSchema,
  subscriptionToggleActiveSchema,
} from "@/features/trading/model/tradingValidation";
import { parseDateInputToLocalMidnight } from "@/features/trading/model/tradingParse";
import { subscriptionService } from "@/features/trading/services/subscriptionService";

type ActionError =
  | "UNAUTHENTICATED"
  | "VALIDATION_ERROR"
  | "DB_ERROR"
  | "NOT_FOUND"
  | "CATEGORY_NOT_FOUND"
  | "CONTACT_REQUIRED"
  | "CONTACT_NOT_FOUND";

function emptyToNull(v: string | null | undefined): string | null {
  if (v === undefined || v === null) return null;
  const t = v.trim();
  return t ? t : null;
}

function requireDateOrNull(dateInput: string): Date | null {
  return parseDateInputToLocalMidnight(dateInput);
}

export async function getSubscriptionsAction(queryInput?: unknown): Promise<
  | { success: true; data: SubscriptionListPageDTO }
  | { success: false; error: ActionError; message?: string }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = subscriptionListSchema.safeParse(queryInput ?? {});
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

    const now = new Date();
    const res = await subscriptionService.getListPage({
      ownerId: user.id,
      now,
      query: parsed.data as unknown as SubscriptionListQuery,
    });

    return { success: true, data: res };
  } catch (error) {
    console.error("Error [getSubscriptionsAction]:", error);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function getSubscriptionDetailAction(subscriptionId: number): Promise<
  | { success: true; data: SubscriptionDetailDTO }
  | { success: false; error: ActionError }
> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    if (!Number.isFinite(subscriptionId) || subscriptionId <= 0) return { success: false, error: "VALIDATION_ERROR" };

    const res = await subscriptionService.getDetail({ ownerId: user.id, subscriptionId });
    if (!res) return { success: false, error: "NOT_FOUND" };

    return { success: true, data: res };
  } catch (error) {
    console.error("Error [getSubscriptionDetailAction]:", error);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function createSubscriptionAction(input: unknown): Promise<{ success: true; id: number } | { success: false; error: ActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = subscriptionCreateSchema.safeParse(input);
    if (!parsed.success) {
      console.error("Validation failed [createSubscriptionAction]:", parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })));
      return { success: false, error: "VALIDATION_ERROR" };
    }

    const renewalOrExpiryAt = requireDateOrNull(parsed.data.renewalOrExpiryAt);
    if (!renewalOrExpiryAt) return { success: false, error: "VALIDATION_ERROR" };
    const purchaseStartAt = parsed.data.purchaseStartAt ? requireDateOrNull(parsed.data.purchaseStartAt) : null;
    if (parsed.data.purchaseStartAt && !purchaseStartAt) return { success: false, error: "VALIDATION_ERROR" };

    const contactId =
      parsed.data.usageMode === "RESELL"
        ? parsed.data.contactId ?? null
        : null;

    const purchasePrice = emptyToNull(parsed.data.purchasePrice ?? undefined);
    const salePrice = emptyToNull(parsed.data.salePrice ?? undefined);

    const res = await subscriptionService.create({
      ownerId: user.id,
      data: {
        title: parsed.data.title,
        categoryId: parsed.data.categoryId,
        usageMode: parsed.data.usageMode,
        contactId: contactId,
        purchaseStartAt,
        renewalOrExpiryAt,
        remindDaysBefore: parsed.data.remindDaysBefore,
        remindAfterExpiryDays: parsed.data.remindAfterExpiryDays,
        purchasePrice: parsed.data.usageMode === "RESELL" ? purchasePrice : null,
        salePrice: parsed.data.usageMode === "RESELL" ? salePrice : null,
        currency: emptyToNull(parsed.data.currency ?? undefined),
        notes: emptyToNull(parsed.data.notes ?? undefined),
        youtubeAccountEmail: emptyToNull(parsed.data.youtubeAccountEmail ?? undefined),
        netflixAccountEmail: emptyToNull(parsed.data.netflixAccountEmail ?? undefined),
        netflixAccountPassword: emptyToNull(parsed.data.netflixAccountPassword ?? undefined),
        isActive: true,
      },
    });

    if (!res.ok) {
      const mappedError: ActionError =
        res.error === "VALIDATION_FAILED" ? "VALIDATION_ERROR" : res.error;
      return { success: false, error: mappedError };
    }

    revalidatePath("/trading/subscriptions");
    return { success: true, id: res.id };
  } catch (error) {
    console.error("Error [createSubscriptionAction]:", error);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function updateSubscriptionAction(subscriptionId: number, input: unknown): Promise<{ success: true } | { success: false; error: ActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = subscriptionUpdateSchema.safeParse(input);
    if (!parsed.success) {
      console.error("Validation failed [updateSubscriptionAction]:", parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })));
      return { success: false, error: "VALIDATION_ERROR" };
    }

    const renewalOrExpiryAt = parsed.data.renewalOrExpiryAt ? requireDateOrNull(parsed.data.renewalOrExpiryAt) : undefined;
    if (parsed.data.renewalOrExpiryAt && !renewalOrExpiryAt) return { success: false, error: "VALIDATION_ERROR" };
    const purchaseStartAt = parsed.data.purchaseStartAt ? requireDateOrNull(parsed.data.purchaseStartAt) : undefined;
    if (parsed.data.purchaseStartAt && !purchaseStartAt) return { success: false, error: "VALIDATION_ERROR" };

    const res = await subscriptionService.update({
      ownerId: user.id,
      subscriptionId,
      data: {
        title: parsed.data.title ?? undefined,
        categoryId: parsed.data.categoryId ?? undefined,
        usageMode: parsed.data.usageMode ?? undefined,
        contactId: parsed.data.contactId ?? undefined,
        purchaseStartAt: purchaseStartAt ?? undefined,
        renewalOrExpiryAt: renewalOrExpiryAt ?? undefined,
        remindDaysBefore: parsed.data.remindDaysBefore ?? undefined,
        remindAfterExpiryDays: parsed.data.remindAfterExpiryDays ?? undefined,
        purchasePrice: parsed.data.purchasePrice === undefined ? undefined : emptyToNull(parsed.data.purchasePrice ?? undefined),
        salePrice: parsed.data.salePrice === undefined ? undefined : emptyToNull(parsed.data.salePrice ?? undefined),
        currency: parsed.data.currency === undefined ? undefined : emptyToNull(parsed.data.currency ?? undefined),
        notes: parsed.data.notes === undefined ? undefined : emptyToNull(parsed.data.notes ?? undefined),
        youtubeAccountEmail: parsed.data.youtubeAccountEmail === undefined ? undefined : emptyToNull(parsed.data.youtubeAccountEmail ?? undefined),
        netflixAccountEmail: parsed.data.netflixAccountEmail === undefined ? undefined : emptyToNull(parsed.data.netflixAccountEmail ?? undefined),
        netflixAccountPassword: parsed.data.netflixAccountPassword === undefined ? undefined : emptyToNull(parsed.data.netflixAccountPassword ?? undefined),
      },
    });

    if (!res.ok) {
      const mappedError: ActionError =
        res.error === "UPDATE_FAILED" ? "DB_ERROR" : res.error;
      return { success: false, error: mappedError };
    }

    revalidatePath("/trading/subscriptions");
    revalidatePath(`/trading/subscriptions/${subscriptionId}`);
    return { success: true };
  } catch (error) {
    console.error("Error [updateSubscriptionAction]:", error);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function toggleSubscriptionActiveAction(subscriptionId: number, input: unknown): Promise<{ success: true } | { success: false; error: ActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = subscriptionToggleActiveSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

    const res = await subscriptionService.toggleActive({
      ownerId: user.id,
      subscriptionId,
      active: parsed.data.isActive,
    });

    if (!res.ok) {
      const mappedError: ActionError = res.error;
      return { success: false, error: mappedError };
    }

    revalidatePath("/trading/subscriptions");
    return { success: true };
  } catch (error) {
    console.error("Error [toggleSubscriptionActiveAction]:", error);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function renewSubscriptionAction(input: unknown): Promise<{ success: true } | { success: false; error: ActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = subscriptionRenewSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

    const renewalOrExpiryAt = requireDateOrNull(parsed.data.renewalOrExpiryAt);
    if (!renewalOrExpiryAt) return { success: false, error: "VALIDATION_ERROR" };

    const purchasePrice = parsed.data.purchasePrice === undefined ? null : emptyToNull(parsed.data.purchasePrice ?? undefined);
    const salePrice = parsed.data.salePrice === undefined ? null : emptyToNull(parsed.data.salePrice ?? undefined);

    const res = await subscriptionService.renew({
      ownerId: user.id,
      subscriptionId: parsed.data.subscriptionId,
      data: {
        renewalOrExpiryAt,
        remindDaysBefore: parsed.data.remindDaysBefore,
        remindAfterExpiryDays: parsed.data.remindAfterExpiryDays,
        purchasePrice,
        salePrice,
        currency: parsed.data.currency === undefined ? undefined : emptyToNull(parsed.data.currency ?? undefined),
        youtubeAccountEmail:
          parsed.data.youtubeAccountEmail === undefined ? undefined : emptyToNull(parsed.data.youtubeAccountEmail ?? undefined),
        netflixAccountEmail:
          parsed.data.netflixAccountEmail === undefined ? undefined : emptyToNull(parsed.data.netflixAccountEmail ?? undefined),
        netflixAccountPassword:
          parsed.data.netflixAccountPassword === undefined ? undefined : emptyToNull(parsed.data.netflixAccountPassword ?? undefined),
      },
    });

    if (!res.ok) {
      const mappedError: ActionError =
        res.error === "VALIDATION_FAILED" ? "VALIDATION_ERROR" : res.error;
      return { success: false, error: mappedError };
    }

    revalidatePath("/trading/subscriptions");
    revalidatePath(`/trading/subscriptions/${parsed.data.subscriptionId}`);
    return { success: true };
  } catch (error) {
    console.error("Error [renewSubscriptionAction]:", error);
    return { success: false, error: "DB_ERROR" };
  }
}

export async function deleteSubscriptionAction(
  subscriptionId: number,
): Promise<{ success: true } | { success: false; error: ActionError }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    if (!Number.isFinite(subscriptionId) || subscriptionId <= 0) {
      return { success: false, error: "VALIDATION_ERROR" };
    }

    const res = await subscriptionService.softDelete({ ownerId: user.id, subscriptionId });
    if (!res.ok) return { success: false, error: "NOT_FOUND" };

    revalidatePath("/trading/subscriptions");
    revalidatePath(`/trading/subscriptions/${subscriptionId}`);
    return { success: true };
  } catch (error) {
    console.error("Error [deleteSubscriptionAction]:", error);
    return { success: false, error: "DB_ERROR" };
  }
}

