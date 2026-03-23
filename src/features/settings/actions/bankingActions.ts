"use server";

import { sessionService } from "@/lib/auth/session";
import { bankingService } from "@/features/settings/services/bankingService";
import { bankAccountSchema } from "@/features/settings/model/settingsValidation";
import { SettingsResult, SettingsError } from "@/features/settings/model/settingsTypes";
import { revalidatePath } from "next/cache";

/**
 * Thêm tài khoản ngân hàng
 */
export async function createBankAccountAction(data: unknown): Promise<SettingsResult> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const validated = bankAccountSchema.safeParse(data);
    if (!validated.success) {
      return { success: false, error: "VALIDATION_ERROR" };
    }

    await bankingService.createBankAccount(user.id, validated.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    if (error instanceof SettingsError) {
      return { success: false, error: error.code, message: error.message };
    }
    return { success: false, error: "DB_ERROR" };
  }
}

/**
 * Đặt làm mặc định
 */
export async function setDefaultBankAccountAction(accountId: number): Promise<SettingsResult> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    await bankingService.setDefaultAccount(user.id, accountId);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: "DB_ERROR" };
  }
}

/**
 * Xóa tài khoản
 */
export async function deleteBankAccountAction(accountId: number): Promise<SettingsResult> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    await bankingService.deleteBankAccount(user.id, accountId);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    if (error instanceof SettingsError) {
      return { success: false, error: error.code, message: error.message };
    }
    return { success: false, error: "DB_ERROR" };
  }
}

/**
 * Cập nhật tài khoản
 */
export async function updateBankAccountAction(accountId: number, data: unknown): Promise<SettingsResult> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const validated = bankAccountSchema.safeParse(data);
    if (!validated.success) {
      return { success: false, error: "VALIDATION_ERROR" };
    }

    await bankingService.updateBankAccount(user.id, accountId, validated.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    if (error instanceof SettingsError) {
      return { success: false, error: error.code, message: error.message };
    }
    return { success: false, error: "DB_ERROR" };
  }
}
