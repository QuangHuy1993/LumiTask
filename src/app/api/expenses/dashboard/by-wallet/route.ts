import { NextResponse } from "next/server";
import { sessionService } from "@/lib/auth/session";
import { parseDashboardRangeFromSearchParams } from "@/features/expenses/api/parseDashboardRangeFromSearchParams";
import { financeDashboardService } from "@/features/expenses/services/financeDashboardService";

export async function GET(request: Request) {
  const user = await sessionService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = parseDashboardRangeFromSearchParams(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "VALIDATION_ERROR", message: parsed.error }, { status: 400 });
  }
  const query = parsed.data;

  try {
    const data = await financeDashboardService.getByWallet(user.id, query);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (err) {
    console.error("[GET /api/expenses/dashboard/by-wallet]", err);
    return NextResponse.json({ error: "DB_ERROR" }, { status: 500 });
  }
}
