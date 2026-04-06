import { NextResponse } from "next/server";
import { getMobileSessionUser } from "@/lib/auth/mobileAuthHelper";
import { sessionService } from "@/features/settings/services/sessionService";
import { parseUserAgent } from "@/features/settings/utils/userAgent";

export async function GET(request: Request) {
  const session = await getMobileSessionUser(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  try {
    const sessions = await sessionService.getSessions(session.user.id);
    const data = sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      device: parseUserAgent(s.userAgent),
      isCurrent: s.id === session.sessionId,
    }));
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
