import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileSessionUser } from "@/lib/auth/mobileAuthHelper";
import { appSettingService } from "@/features/settings/services/appSettingService";

const adminContactSchema = z.object({
  adminName: z.string().max(120).optional().default(""),
  adminZalo: z.string().max(50).optional().default(""),
  adminFacebookUrl: z.string().max(500).optional().default(""),
  adminEmail: z
    .string()
    .trim()
    .email("Email không hợp lệ")
    .max(255)
    .optional()
    .or(z.literal(""))
    .default(""),
});

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

  const parsed = adminContactSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      {
        success: false,
        error: "VALIDATION_ERROR",
        field: firstIssue?.path[0],
        message: firstIssue?.message,
      },
      { status: 400 },
    );
  }

  const { adminName, adminZalo, adminFacebookUrl, adminEmail } = parsed.data;

  const settings = [
    { key: "trading_admin_name", value: adminName },
    { key: "trading_admin_zalo", value: adminZalo },
    { key: "trading_admin_facebook_url", value: adminFacebookUrl },
    { key: "trading_admin_email", value: adminEmail },
  ];

  try {
    await appSettingService.upsertAppSettings(session.user.id, settings);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
