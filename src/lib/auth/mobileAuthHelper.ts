import { prisma } from "@/lib/db/prisma";

export type MobileSessionUser = {
  id: number;
  username: string;
  email: string | null;
  fullName: string | null;
};

export type MobileSessionContext = {
  user: MobileSessionUser;
  token: string;
  sessionId: number;
};

/**
 * Extract and validate Bearer token from Authorization header.
 * Returns user if valid session, null otherwise.
 */
export async function getMobileSessionUser(
  request: Request,
): Promise<MobileSessionContext | null> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : null;

  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { token },
    select: {
      id: true,
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

  if (!session || session.revokedAt !== null) return null;
  if (session.expiresAt < new Date()) return null;
  if (!session.user.isActive || session.user.deletedAt !== null) return null;

  return {
    user: {
      id: session.user.id,
      username: session.user.username,
      email: session.user.email,
      fullName: session.user.fullName,
    },
    token,
    sessionId: session.id,
  };
}
