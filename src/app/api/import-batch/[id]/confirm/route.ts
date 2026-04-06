import { NextResponse } from "next/server";
import { z } from "zod";

import { receiptImportBatchService } from "@/features/expenses/services/receiptImportBatchService";
import { sessionService } from "@/lib/auth/session";

const confirmBodySchema = z.object({
  rows: z.array(
    z.object({
      amount: z.string(),
      occurredAt: z.string(),
      note: z.string().default(""),
      currency: z.string().default("VND"),
      confidence: z.number().default(0),
      walletId: z.number().int().positive().nullable(),
      categoryId: z.number().int().positive().nullable(),
      mergeKey: z.string().nullable().optional(),
    })
  ),
});

function parseId(value: string): number | null {
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await sessionService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const params = await context.params;
  const id = parseId(params.id);
  if (!id) {
    return NextResponse.json({ success: false, error: "INVALID_BATCH_ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = confirmBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const normalizedRows = parsed.data.rows.map((r) => ({
    ...r,
    mergeKey: r.mergeKey ?? null,
  }));

  const result = await receiptImportBatchService.confirmBatch(user.id, id, normalizedRows);
  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: "CONFIRM_FAILED", message: result.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, data: { createdIds: result.createdIds } });
}
