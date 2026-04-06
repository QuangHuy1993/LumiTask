import { NextResponse } from "next/server";
import { z } from "zod";

import { authService } from "@/features/auth/services/authService";
import { prisma } from "@/lib/db/prisma";

const verify2FASchema = z.object({
  preAuthToken: z.string().min(1, "preAuthToken is required"),
  code: z
    .string()
    .length(6, "OTP code must be exactly 6 digits")
    .regex(/^\d{6}$/, "OTP code must be numeric"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "INVALID_REQUEST" },
      { status: 400 },
    );
  }

  const parsed = verify2FASchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const { preAuthToken, code } = parsed.data;
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    null;
  const userAgent = request.headers.get("user-agent") ?? null;

  let result: Awaited<ReturnType<typeof authService.verify2FAAndLogin>>;
  try {
    result = await authService.verify2FAAndLogin(
      preAuthToken,
      code,
      ipAddress,
      userAgent,
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }

  if (!result.success) {
    const errorCode =
      result.error === "EXPIRED" ? "EXPIRED" : "INVALID_CODE";
    return NextResponse.json(
      { success: false, error: errorCode },
      { status: 401 },
    );
  }

  if (!result.session) {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }

  // Enrich with user data
  const sessionRecord = await prisma.session.findUnique({
    where: { token: result.session.token },
    select: {
      user: {
        select: { id: true, username: true, email: true, fullName: true },
      },
    },
  });

  if (!sessionRecord) {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    token: result.session.token,
    expiresAt: result.session.expiresAt,
    user: {
      id: sessionRecord.user.id,
      username: sessionRecord.user.username,
      email: sessionRecord.user.email,
      fullName: sessionRecord.user.fullName,
    },
  });
}
