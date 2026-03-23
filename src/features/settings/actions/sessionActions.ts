"use server";

import { sessionService } from "@/lib/auth/session";
import { sessionService as settingsSessionService } from "@/features/settings/services/sessionService";
import { SettingsResult } from "@/features/settings/model/settingsTypes";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

/**
 * Thu hồi một phiên đăng nhập
 */
export async function revokeSessionAction(sessionId: number): Promise<SettingsResult> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    await settingsSessionService.revokeSession(user.id, sessionId);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: "DB_ERROR" };
  }
}

/**
 * Đăng xuất tất cả các thiết bị khác
 */
export async function revokeAllOtherSessionsAction(): Promise<SettingsResult> {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) return { success: false, error: "UNAUTHENTICATED" };

    const cookieStore = await cookies();
    const currentToken = cookieStore.get("session_token")?.value;

    await settingsSessionService.revokeOtherSessions(user.id, currentToken);
    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    return { success: false, error: "DB_ERROR" };
  }
}
