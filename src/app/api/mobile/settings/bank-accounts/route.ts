import { NextResponse } from "next/server";
import { getMobileSessionUser } from "@/lib/auth/mobileAuthHelper";
import { bankingService } from "@/features/settings/services/bankingService";
import { bankAccountSchema } from "@/features/settings/model/settingsValidation";
import { SettingsError } from "@/features/settings/model/settingsTypes";

export async function GET(request: Request) {
  const session = await getMobileSessionUser(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    20,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "10", 10)),
  );

  try {
    const result = await bankingService.getBankAccounts(
      session.user.id,
      page,
      limit,
    );
    return NextResponse.json({ success: true, data: result });
  } catch {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}

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
    const account = await bankingService.createBankAccount(
      session.user.id,
      parsed.data,
    );
    return NextResponse.json({ success: true, data: account }, { status: 201 });
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
