import { NextResponse } from "next/server";

import { loginSchema } from "@/features/auth/model/authValidation";
import { authService } from "@/features/auth/services/authService";
import { prisma } from "@/lib/db/prisma";

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

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0] as string | undefined;
    return NextResponse.json(
      { success: false, error: "VALIDATION_ERROR", field },
      { status: 400 },
    );
  }

  const { identifier, password, rememberMe } = parsed.data;
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim() ??
    null;
  const userAgent = request.headers.get("user-agent") ?? null;

  let result: Awaited<ReturnType<typeof authService.login>>;
  try {
    result = await authService.login({
      identifier,
      password,
      rememberMe: rememberMe ?? false,
      ipAddress,
      userAgent,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }

  // 2FA required
  if (!result.success && result.error === "REQUIRES_2FA") {
    return NextResponse.json({
      success: false,
      requires2FA: true,
      preAuthToken: result.preAuthToken,
    });
  }

  // Other errors
  if (!result.success) {
    const statusCode =
      result.error === "RATE_LIMITED"
        ? 429
        : result.error === "ACCOUNT_DISABLED"
          ? 403
          : 401;
    return NextResponse.json(
      {
        success: false,
        error: result.error,
        ...(result.error === "RATE_LIMITED" && {
          retryAfterMs: result.retryAfterMs,
        }),
      },
      { status: statusCode },
    );
  }

  // Success — enrich with user data using the session token just created
  if (!result.session) {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }

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
