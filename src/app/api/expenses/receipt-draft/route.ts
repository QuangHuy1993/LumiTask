import { NextResponse } from "next/server";
import { z } from "zod";

import { receiptOcrDraftService } from "@/features/expenses/services/receiptOcrDraftService";
import { sessionService } from "@/lib/auth/session";

const bodySchema = z.object({
  rawText: z.string().max(50_000),
});

export async function POST(request: Request) {
  const user = await sessionService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    const result = await receiptOcrDraftService.extractDraftFromOcrText(user.id, parsed.data.rawText);
    if (!result.ok) {
      const status =
        result.code === "EMPTY_INPUT" || result.code === "INPUT_TOO_LONG"
          ? 400
          : result.code === "NO_AI_PROFILE" ||
              result.code === "AI_INACTIVE" ||
              result.code === "MISSING_API_KEY" ||
              result.code === "MISSING_BASE_URL"
            ? 422
            : 502;
      return NextResponse.json(
        { success: false, error: result.code, message: result.message },
        { status }
      );
    }
    return NextResponse.json({ success: true, data: result.data });
  } catch (err) {
    console.error("[POST /api/expenses/receipt-draft]", err);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
