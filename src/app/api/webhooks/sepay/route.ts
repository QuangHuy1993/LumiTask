import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { jobPaymentService } from "@/features/jobs/services/jobPaymentService";
import { emitPaymentEvent } from "@/lib/sse/paymentEmitter";

type SePayPayload = {
  id: string | number;
  transferAmount: number;
  content: string;
  accountNumber: string;
};

async function getWebhookSecret() {
  if (process.env.SEPAY_WEBHOOK_SECRET) {
    return process.env.SEPAY_WEBHOOK_SECRET;
  }
  const setting = await prisma.appSetting.findFirst({
    where: { key: "SEPAY_WEBHOOK_SECRET" },
  });
  return setting?.value ?? "";
}

function verifySignature(body: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(body, "utf8");
  const digest = hmac.digest("hex");
  return digest === signature;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let payload: SePayPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const secret = await getWebhookSecret();
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Missing Webhook Secret" }, { status: 500 });
  }

  let isAuthenticated = false;

  // 1. Check SePay API Key header (Authorization: Apikey <SECRET>)
  const authHeader = req.headers.get("Authorization");
  if (authHeader && authHeader.includes(secret)) {
    isAuthenticated = true;
  }

  // 2. Check SePay Signature HMAC (x-sepay-signature)
  if (!isAuthenticated) {
    const signature = req.headers.get("x-sepay-signature");
    if (signature && verifySignature(rawBody, signature, secret)) {
      isAuthenticated = true;
    }
  }

  if (!isAuthenticated) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  if (!payload.id || !payload.accountNumber || !payload.transferAmount) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const amount = new Prisma.Decimal(payload.transferAmount);

  const result = await jobPaymentService.processSePayWebhook({
    gatewayTransId: String(payload.id),
    accountNo: payload.accountNumber,
    amount,
    content: payload.content || "",
    rawPayload: rawBody,
  });

  if (!result.ok && result.error === "NO_JOB_PATTERN") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  if (result.ok) {
    emitPaymentEvent({
      success: true,
      amount: payload.transferAmount,
      content: payload.content || "Chưa rõ",
      gatewayTransId: String(payload.id)
    });
  }

  return NextResponse.json({ ok: true });
}

