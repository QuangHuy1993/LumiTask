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

  let forceNew = false;
  try {
    const body = await request.json();
    forceNew = body?.forceNew === true;
  } catch {
    // body is optional
  }

  try {
    const result = await securityService.init2FA(session.user.id, forceNew);
    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
