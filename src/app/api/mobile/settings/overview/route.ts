import { NextResponse } from "next/server";
import { getMobileSessionUser } from "@/lib/auth/mobileAuthHelper";
import { securityService } from "@/features/settings/services/securityService";

export async function GET(request: Request) {
  const session = await getMobileSessionUser(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  try {
    const is2FAEnabled = await securityService.get2FAStatus(session.user.id);
    return NextResponse.json({
      success: true,
      data: {
        user: session.user,
        is2FAEnabled,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
