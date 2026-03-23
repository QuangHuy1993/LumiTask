import { NextResponse } from "next/server";

import { subscriptionReminderService } from "@/features/trading/services/subscriptionReminderService";

const HCM_TIMEZONE = "Asia/Ho_Chi_Minh";

function readEnvInt(input: string | undefined, fallback: number): number {
  const parsed = Number(input);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

function getHcmHour(now: Date): number {
  const hourText = new Intl.DateTimeFormat("en-GB", {
    timeZone: HCM_TIMEZONE,
    hour: "2-digit",
    hour12: false,
  }).format(now);
  const hour = Number(hourText);
  return Number.isFinite(hour) ? hour : -1;
}

function readBearerToken(request: Request): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim();
}

async function handleCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return NextResponse.json({ ok: false, error: "MISSING_CRON_SECRET" }, { status: 500 });
  }

  const token = readBearerToken(request);
  if (token !== cronSecret) {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const now = new Date();
  const forceRun = request.headers.get("x-force-run") === "true";
  const hcmHour = getHcmHour(now);
  if (!forceRun && hcmHour !== 8) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "NOT_8AM_HCM",
      hcmHour,
    });
  }

  const windowMinutes = Math.max(1, readEnvInt(process.env.TRADING_REMINDER_WINDOW_MINUTES, 1440));
  const maxCandidatesPerOwner = Math.max(1, readEnvInt(process.env.TRADING_REMINDER_MAX_PER_OWNER, 500));
  const maxOwnerConcurrency = Math.min(10, Math.max(1, readEnvInt(process.env.TRADING_REMINDER_OWNER_CONCURRENCY, 3)));

  const result = await subscriptionReminderService.runDailyRemindersForAllOwners({
    now,
    windowMinutes,
    maxCandidatesPerOwner,
    maxOwnerConcurrency,
    timezone: HCM_TIMEZONE,
    triggerSource: "CRON_API",
  });

  return NextResponse.json({
    ok: true,
    skipped: false,
    hcmHour,
    ...result,
  });
}

export async function POST(request: Request) {
  return handleCronRequest(request);
}

export async function GET(request: Request) {
  return handleCronRequest(request);
}
