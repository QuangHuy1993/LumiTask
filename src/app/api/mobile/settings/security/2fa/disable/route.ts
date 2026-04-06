import { NextResponse } from "next/server";
import { getMobileSessionUser } from "@/lib/auth/mobileAuthHelper";
import { securityService } from "@/features/settings/services/securityService";

export async function POST(request: Request) {
  const session = await getMobileSessionUser(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  try {
    await securityService.disable2FA(session.user.id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
