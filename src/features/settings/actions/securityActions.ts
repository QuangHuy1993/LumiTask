"use server";

import { sessionService } from "@/lib/auth/session";
import { securityService } from "@/features/settings/services/securityService";
import { changePasswordSchema } from "@/features/settings/model/settingsValidation";
import { SettingsResult, SettingsError } from "@/features/settings/model/settingsTypes";
import { revalidatePath } from "next/cache";

/**
 * Đổi mật khẩu
 */
export async function changePasswordAction(formData: unknown): Promise<SettingsResult> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const validated = changePasswordSchema.safeParse(formData);
    if (!validated.success) {
      return { success: false, error: "VALIDATION_ERROR", message: "Dữ liệu không hợp lệ" };
    }

    await securityService.changePassword(user.id, validated.data);
    
    return { success: true };
  } catch (error) {
    if (error instanceof SettingsError) {
      return { success: false, error: error.code, message: error.message };
    }
    return { success: false, error: "DB_ERROR", message: "Lỗi hệ thống, vui lòng thử lại sau" };
  }
}

/**
 * Khởi tạo thiết lập 2FA
 */
export async function init2FAAction(forceNew = false): Promise<SettingsResult & { secret?: string; otpauth?: string; isReactivating?: boolean }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const { secret, otpauth, isReactivating } = await securityService.init2FA(user.id, forceNew);
    return { success: true, secret, otpauth, isReactivating };
  } catch (error) {
    return { success: false, error: "DB_ERROR", message: "Không thể khởi tạo 2FA" };
  }
}

/**
 * Kích hoạt 2FA
 */
export async function enable2FAAction(code: string): Promise<SettingsResult & { recoveryCodes?: string[] }> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const { recoveryCodes } = await securityService.verifyAndEnable2FA(user.id, code);
    revalidatePath("/settings");
    return { success: true, recoveryCodes };
  } catch (error) {
    if (error instanceof SettingsError) {
      return { success: false, error: error.code, message: error.message };
    }
    return { success: false, error: "DB_ERROR", message: "Lỗi hệ thống" };
  }
}

/**
 * Tắt 2FA
 */
export async function disable2FAAction(): Promise<SettingsResult> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    await securityService.disable2FA(user.id);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: "DB_ERROR", message: "Không thể tắt 2FA" };
  }
}
