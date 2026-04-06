import { NextResponse } from "next/server";

import { sessionService } from "@/lib/auth/session";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : null;

  if (!token) {
    return NextResponse.json(
      { success: false, error: "MISSING_TOKEN" },
      { status: 401 },
    );
  }

  try {
    await sessionService.revokeSession(token);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
