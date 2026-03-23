import { NextResponse } from "next/server";

import { sessionService } from "@/lib/auth/session";
import { manualReminderSendBodySchema } from "@/features/trading/model/subscriptionReminderManualValidation";
import { subscriptionManualReminderService } from "@/features/trading/services/subscriptionManualReminderService";

export async function POST(request: Request) {
  const user = await sessionService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = manualReminderSendBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const now = parsed.data.nowISO ? new Date(parsed.data.nowISO) : new Date();
  const result = await subscriptionManualReminderService.startManualReminderSend({
    ownerId: user.id,
    selectedSubscriptionIds: parsed.data.selectedSubscriptionIds,
    now,
    windowMinutes: parsed.data.windowMinutes,
  });

  return NextResponse.json({ ok: true, ...result });
}

