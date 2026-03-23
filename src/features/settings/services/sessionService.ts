import { prisma } from "@/lib/db/prisma";
import { SettingsError } from "../model/settingsTypes";

export const sessionService = {
  /**
   * Lấy danh sách sessions đang hoạt động
   */
  async getSessions(userId: number) {
    return prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  /**
   * Revoke một session cụ thể
   */
  async revokeSession(userId: number, sessionId: number) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    });

    if (!session || session.userId !== userId) {
      throw new SettingsError("FORBIDDEN", "Không có quyền thực hiện");
    }

    return prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  },

  /**
   * Revoke tất cả session ngoại trừ session hiện tại (nếu có currentToken)
   */
  async revokeOtherSessions(userId: number, currentToken?: string) {
    return prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        NOT: currentToken ? { token: currentToken } : undefined,
      },
      data: { revokedAt: new Date() },
    });
  },
};
