"use server";

import { loginSchema } from "@/features/auth/model/authValidation";
import type { LoginInput, LoginResult } from "@/features/auth/model/authTypes";
import { authService } from "@/features/auth/services/authService";
import { cookies, headers } from "next/headers";

export async function loginAction(input: LoginInput): Promise<LoginResult> {
  // 1. Validate
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0].path[0] as "identifier" | "password";
    return { success: false, error: "VALIDATION_ERROR", field };
  }

  const { identifier, password, rememberMe } = parsed.data;
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const ipAddress = 
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || 
    headersList.get("x-real-ip")?.trim() || 
    headersList.get("cf-connecting-ip")?.trim() || 
    headersList.get("x-client-ip")?.trim() ||
    null;
  const userAgent = headersList.get("user-agent") || null;

  // 2. Login
  const result = await authService.login({
    identifier,
    password,
    rememberMe: rememberMe ?? false,
    ipAddress,
    userAgent,
  });

  // 3. Set cookie
  if (result.success && "session" in result && result.session) {
    const cookieStore = await cookies();
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;

    cookieStore.set("session_token", result.session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge,
      path: "/",
    });

    return { success: true, redirectUrl: "/dashboard" };
  }

  return result as LoginResult;
}
export async function verify2FAAction(preAuthToken: string, code: string): Promise<LoginResult> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const ipAddress = 
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || 
    headersList.get("x-real-ip")?.trim() || 
    headersList.get("cf-connecting-ip")?.trim() || 
    headersList.get("x-client-ip")?.trim() ||
    null;
  const userAgent = headersList.get("user-agent") || null;

  const result = await authService.verify2FAAndLogin(preAuthToken, code, ipAddress, userAgent);

  if (result.success && result.session) {
    // Để cho nhanh/đơn giản, giải mã preAuthToken lấy rememberMe
    const decoded = JSON.parse(Buffer.from(preAuthToken, "base64").toString("utf-8"));
    const rememberMe = decoded.rememberMe;
    
    await setSessionCookie(result.session.token, rememberMe);
    return { success: true, redirectUrl: "/dashboard" };
  }

  return { success: false, error: "INVALID_CREDENTIALS" };
}

async function setSessionCookie(token: string, rememberMe: boolean) {
  const cookieStore = await cookies();
  const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60;

  cookieStore.set("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
}
