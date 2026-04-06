import { NextResponse } from "next/server";
import { getMobileSessionUser } from "@/lib/auth/mobileAuthHelper";
import { bankingService } from "@/features/settings/services/bankingService";
import { SettingsError } from "@/features/settings/model/settingsTypes";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const session = await getMobileSessionUser(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const accountId = parseInt(id, 10);
  if (isNaN(accountId)) {
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  try {
    await bankingService.setDefaultAccount(session.user.id, accountId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof SettingsError) {
      const status = err.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json(
        { success: false, error: err.code, message: err.message },
        { status },
      );
    }
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
