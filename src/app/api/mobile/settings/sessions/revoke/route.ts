import { NextResponse } from "next/server";
import { z } from "zod";
import { getMobileSessionUser } from "@/lib/auth/mobileAuthHelper";
import { sessionService } from "@/features/settings/services/sessionService";
import { SettingsError } from "@/features/settings/model/settingsTypes";

const revokeSchema = z.object({ sessionId: z.number().int().positive() });

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

  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  if (parsed.data.sessionId === session.sessionId) {
    return NextResponse.json(
      { success: false, error: "CANNOT_REVOKE_CURRENT" },
      { status: 400 },
    );
  }

  try {
    await sessionService.revokeSession(session.user.id, parsed.data.sessionId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof SettingsError) {
      return NextResponse.json(
        { success: false, error: err.code, message: err.message },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
