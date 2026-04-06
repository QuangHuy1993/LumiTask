import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getAdminDashboardData } from "@/features/admin/services/adminDashboardService";

async function getSessionUser(request: Request) {
  const authorization = request.headers.get("authorization");
  const token =
    authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    select: {
      expiresAt: true,
      revokedAt: true,
      user: {
        select: { id: true, isActive: true, deletedAt: true },
      },
    },
  });

  if (!session || session.revokedAt !== null) return null;
  if (session.expiresAt < new Date()) return null;
  if (!session.user.isActive || session.user.deletedAt !== null) return null;

  return session.user;
}

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  try {
    const data = await getAdminDashboardData();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
