import { NextResponse } from "next/server";

import { sessionService } from "@/lib/auth/session";
import { manualReminderJobIdParamsSchema } from "@/features/trading/model/subscriptionReminderManualValidation";
import { subscriptionManualReminderService } from "@/features/trading/services/subscriptionManualReminderService";

type Params = {
  params: Promise<{ jobRunId: string }>;
};

export async function GET(_request: Request, context: Params) {
  const user = await sessionService.getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { jobRunId } = await context.params;
  const parsed = manualReminderJobIdParamsSchema.safeParse({ jobRunId });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const status = await subscriptionManualReminderService.getManualReminderJobStatus({
    ownerId: user.id,
    jobRunId: parsed.data.jobRunId,
  });
  if (!status) {
    return NextResponse.json({ ok: false, error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(status);
}

