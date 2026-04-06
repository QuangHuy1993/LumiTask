import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileSessionUser } from "@/lib/auth/mobileAuthHelper";
import { appSettingService } from "@/features/settings/services/appSettingService";
import { appSettingSchema } from "@/features/settings/model/settingsValidation";

export async function GET(request: Request) {
  const session = await getMobileSessionUser(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  try {
    const settings = await appSettingService.getAllAppSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

const batchSchema = z.object({ settings: z.array(appSettingSchema).min(1) });

export async function PATCH(request: Request) {
  const session = await getMobileSessionUser(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "VALIDATION_ERROR",
        message: parsed.error.issues[0]?.message,
      },
      { status: 400 },
    );
  }

  try {
    await appSettingService.upsertAppSettings(
      session.user.id,
      parsed.data.settings,
    );
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
