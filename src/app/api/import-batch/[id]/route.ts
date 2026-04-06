import { NextResponse } from "next/server";

import { receiptImportBatchService } from "@/features/expenses/services/receiptImportBatchService";
import { sessionService } from "@/lib/auth/session";

function parseId(value: string): number | null {
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await sessionService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const params = await context.params;
  const id = parseId(params.id);
  if (!id) {
    return NextResponse.json({ success: false, error: "INVALID_BATCH_ID" }, { status: 400 });
  }

  const batch = await receiptImportBatchService.getBatch(user.id, id);
  if (!batch) {
    return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
  }
  return NextResponse.json({ success: true, data: batch });
}
