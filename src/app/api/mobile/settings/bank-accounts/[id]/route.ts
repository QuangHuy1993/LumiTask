import { NextResponse } from "next/server";
import { getMobileSessionUser } from "@/lib/auth/mobileAuthHelper";
import { bankingService } from "@/features/settings/services/bankingService";
import { bankAccountSchema } from "@/features/settings/model/settingsValidation";
import { SettingsError } from "@/features/settings/model/settingsTypes";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const parsed = bankAccountSchema.safeParse(body);
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
    const account = await bankingService.updateBankAccount(
      session.user.id,
      accountId,
      parsed.data,
    );
    return NextResponse.json({ success: true, data: account });
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

export async function DELETE(request: Request, { params }: RouteParams) {
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
    await bankingService.deleteBankAccount(session.user.id, accountId);
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
