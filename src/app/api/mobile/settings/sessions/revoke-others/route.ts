import { NextResponse } from "next/server";
import { getMobileSessionUser } from "@/lib/auth/mobileAuthHelper";
import { sessionService } from "@/features/settings/services/sessionService";

export async function POST(request: Request) {
  const session = await getMobileSessionUser(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  try {
    const result = await sessionService.revokeOtherSessions(
      session.user.id,
      session.token,
    );
    return NextResponse.json({ success: true, data: { count: result.count } });
  } catch {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
