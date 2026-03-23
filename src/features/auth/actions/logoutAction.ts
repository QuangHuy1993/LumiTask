"use server";

import { sessionService } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Đăng xuất người dùng: Thu hồi session và xoá cookie
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (token) {
    // 1. Thu hồi trong DB
    await sessionService.revokeSession(token);
    
    // 2. Xoá cookie
    cookieStore.set("session_token", "", {
      maxAge: 0,
      path: "/",
    });
  }

  // 3. Chuyển hướng về trang login với tham số thông báo
  redirect("/login?logout=1");
}
