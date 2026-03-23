import { NextResponse } from "next/server";

import { sessionService } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { subscriptionReminderService } from "@/features/trading/services/subscriptionReminderService";

type TestSendBody = {
  toEmail?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as TestSendBody;
  const toEmail = body.toEmail?.trim();
  if (!toEmail) {
    return NextResponse.json({ ok: false, error: "MISSING_TO_EMAIL" }, { status: 400 });
  }

  const user = await sessionService.getCurrentUser();
  let ownerId = user?.id ?? null;
  if (!ownerId && process.env.NODE_ENV !== "production") {
    const firstSub = await prisma.subscription.findFirst({
      where: { deletedAt: null, isActive: true },
      orderBy: [{ renewalOrExpiryAt: "asc" }, { id: "desc" }],
      select: { ownerId: true },
    });
    ownerId = firstSub?.ownerId ?? null;
  }
  if (!ownerId) {
    return NextResponse.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const result = await subscriptionReminderService.sendBuyerLeadTestEmail({
    ownerId,
    toEmail,
  });
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
