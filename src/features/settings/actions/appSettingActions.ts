"use server";

import { sessionService } from "@/lib/auth/session";
import { appSettingService } from "@/features/settings/services/appSettingService";
import { appSettingSchema, aiSettingSchema } from "@/features/settings/model/settingsValidation";
import { SettingsResult, SettingsError } from "@/features/settings/model/settingsTypes";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/**
 * Cập nhật cấu hình chung
 */
export async function upsertAppSettingAction(data: unknown): Promise<SettingsResult> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const validated = appSettingSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "VALIDATION_ERROR" };

    await appSettingService.upsertAppSetting(user.id, validated.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: "DB_ERROR" };
  }
}

const adminContactSettingsSchema = z.object({
  adminName: z.string(),
  adminZalo: z.string(),
  adminFacebookUrl: z.string(),
  adminEmail: z.string(),
});

export async function upsertAdminContactSettingsAction(data: unknown): Promise<SettingsResult> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const parsed = adminContactSettingsSchema.safeParse(data);
    if (!parsed.success) return { success: false, error: "VALIDATION_ERROR" };

    const payloads: Array<z.infer<typeof appSettingSchema>> = [
      {
        key: "trading_admin_name",
        value: parsed.data.adminName.trim(),
        description: "Tên admin hiển thị trong email buyer",
      },
      {
        key: "trading_admin_zalo",
        value: parsed.data.adminZalo.trim(),
        description: "Số Zalo liên hệ gia hạn dịch vụ",
      },
      {
        key: "trading_admin_facebook_url",
        value: parsed.data.adminFacebookUrl.trim(),
        description: "Link Facebook admin để buyer bấm liên hệ",
      },
      {
        key: "trading_admin_email",
        value: parsed.data.adminEmail.trim(),
        description: "Email ADMIN nhận nhắc hạn mặc định cho dịch vụ cá nhân",
      },
    ];

    for (const payload of payloads) {
      const validated = appSettingSchema.safeParse(payload);
      if (!validated.success) return { success: false, error: "VALIDATION_ERROR" };
    }

    await appSettingService.upsertAppSettings(user.id, payloads);
    revalidatePath("/settings");
    return { success: true };
  } catch {
    return { success: false, error: "DB_ERROR" };
  }
}

/**
 * Cập nhật cấu hình AI
 */
export async function upsertAISettingAction(data: unknown): Promise<SettingsResult> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const validated = aiSettingSchema.safeParse(data);
    if (!validated.success) return { success: false, error: "VALIDATION_ERROR" };

    await appSettingService.upsertAISetting(user.id, validated.data);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: "DB_ERROR" };
  }
}
