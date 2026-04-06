import { NextResponse } from "next/server";
import { getMobileSessionUser } from "@/lib/auth/mobileAuthHelper";
import { securityService } from "@/features/settings/services/securityService";
import { changePasswordSchema } from "@/features/settings/model/settingsValidation";
import { SettingsError } from "@/features/settings/model/settingsTypes";

export async function POST(request: Request) {
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

  const parsed = changePasswordSchema.safeParse(body);
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

  try {
    await securityService.changePassword(session.user.id, parsed.data);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof SettingsError) {
      return NextResponse.json(
        { success: false, error: err.code, message: err.message },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
