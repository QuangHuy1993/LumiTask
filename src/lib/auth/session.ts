import { cache } from "react";

import { prisma } from "@/lib/db/prisma";
import { cookies } from "next/headers";

export type UserSessionDTO = {
  id: number;
  username: string;
  email: string | null;
  fullName: string | null;
};

const getCurrentUserCached = cache(async (): Promise<UserSessionDTO | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    select: {
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          isActive: true,
          deletedAt: true,
        },
      },
    },
  });

  if (!session) return null;
  if (session.revokedAt !== null) return null;
  if (session.expiresAt < new Date()) return null;
  if (!session.user.isActive) return null;
  if (session.user.deletedAt !== null) return null;

  return {
    id: session.user.id,
    username: session.user.username,
    email: session.user.email,
    fullName: session.user.fullName,
  };
});

export const sessionService = {
  getCurrentUser: getCurrentUserCached,

  async revokeSession(token: string): Promise<void> {
    await prisma.session.updateMany({
      where: { token, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },

  async revokeAllUserSessions(userId: number): Promise<void> {
    await prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};
