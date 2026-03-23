import { NextResponse } from "next/server";

import { sessionService } from "@/lib/auth/session";
import { manualReminderPreviewQuerySchema } from "@/features/trading/model/subscriptionReminderManualValidation";
import { subscriptionManualReminderService } from "@/features/trading/services/subscriptionManualReminderService";

export async function GET(request: Request) {
  const user = await sessionService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = manualReminderPreviewQuerySchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
    stage: url.searchParams.get("stage") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    categoryId: url.searchParams.get("categoryId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const data = await subscriptionManualReminderService.getDueReminderPreview({
    ownerId: user.id,
    now: new Date(),
    page: parsed.data.page,
    limit: parsed.data.limit,
    stage: parsed.data.stage,
    q: parsed.data.q,
    categoryId: parsed.data.categoryId,
  });

  return NextResponse.json({ ok: true, ...data });
}

