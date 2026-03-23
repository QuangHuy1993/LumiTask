import { prisma } from "@/lib/db/prisma";
import { passwordService } from "@/lib/auth/password";
import { rateLimitService } from "@/lib/auth/rateLimit";
import type { LoginResult, SessionCreated } from "@/features/auth/model/authTypes";

type LoginServiceInput = {
  identifier: string;
  password: string;
  rememberMe: boolean;
  ipAddress: string | null;
  userAgent: string | null;
};

export const authService = {
  async login(input: LoginServiceInput): Promise<LoginResult & { session?: SessionCreated }> {
    const { identifier, password, rememberMe, ipAddress, userAgent } = input;

    // 1. Rate limit check
    const rateLimitResult = await rateLimitService.check(`login:${identifier}`, {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!rateLimitResult.allowed) {
      return {
        success: false,
        error: "RATE_LIMITED",
        retryAfterMs: rateLimitResult.retryAfterMs,
      };
    }

    // 2. Find user
    const user = await this.findUserByIdentifier(identifier);

    if (!user) {
      // Gọi log không chặn luồng chính
      this.writeAuditLog(null, "AUTH_LOGIN_FAILED", ipAddress, userAgent, {
        reason: "user_not_found",
        identifierMasked: maskIdentifier(identifier),
      });
      return { success: false, error: "INVALID_CREDENTIALS" };
    }

    if (user.deletedAt !== null) {
      this.writeAuditLog(user.id, "AUTH_LOGIN_FAILED", ipAddress, userAgent, {
        reason: "account_deleted",
      });
      return { success: false, error: "INVALID_CREDENTIALS" };
    }

    if (!user.isActive) {
      this.writeAuditLog(user.id, "AUTH_LOGIN_FAILED", ipAddress, userAgent, {
        reason: "account_disabled",
      });
      return { success: false, error: "ACCOUNT_DISABLED" };
    }

    // 3. Verify password
    const passwordValid = await passwordService.verify(password, user.password);
    if (!passwordValid) {
      await rateLimitService.increment(`login:${identifier}`);
      this.writeAuditLog(user.id, "AUTH_LOGIN_FAILED", ipAddress, userAgent, {
        reason: "wrong_password",
      });
      return { success: false, error: "INVALID_CREDENTIALS" };
    }

    // 4. Check 2FA
    if (user.twoFactor?.isEnabled) {
      // Tạo một preAuthToken ngắn hạn (5 phút) để đánh dấu đã qua bước password
      // Ở bản dev/simple: lưu userId vào token (có thể hash/sign)
      const preAuthToken = Buffer.from(JSON.stringify({ 
        userId: user.id, 
        expiresAt: Date.now() + 5 * 60 * 1000,
        rememberMe 
      })).toString("base64");
      
      return { success: false, error: "REQUIRES_2FA", preAuthToken };
    }

    // 5. Create session
    const session = await this.createSessionAndLog(user, { rememberMe, ipAddress, userAgent });

    // 6. Reset rate limit
    await rateLimitService.reset(`login:${identifier}`);

    return { success: true, redirectUrl: "/dashboard", session };
  },

  async verify2FAAndLogin(token: string, code: string, ipAddress: string | null, userAgent: string | null) {
    try {
      const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
      if (decoded.expiresAt < Date.now()) {
        return { success: false, error: "EXPIRED" };
      }

      const userId = decoded.userId;
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { twoFactor: true }
      });

      if (!user || !user.twoFactor) {
        return { success: false, error: "INVALID" };
      }

      const { verify } = await import("otplib");
      const result = await verify({
        token: code,
        secret: user.twoFactor.totpSecret,
      });

      if (!result || !result.valid) {
        return { success: false, error: "INVALID_CODE" };
      }

      // Login success
      const session = await this.createSessionAndLog(user, { 
        rememberMe: decoded.rememberMe, 
        ipAddress, 
        userAgent 
      });

      return { success: true, session };
    } catch (e) {
      return { success: false, error: "INVALID" };
    }
  },

  async findUserByIdentifier(identifier: string) {
    const isEmail = identifier.includes("@");
    const normalizedIdentifier = identifier.toLowerCase();

    return prisma.user.findFirst({
      where: isEmail
        ? { email: normalizedIdentifier, deletedAt: null }
        : { username: identifier, deletedAt: null },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        password: true,
        isActive: true,
        deletedAt: true,
        twoFactor: { select: { isEnabled: true } },
      },
    });
  },

  async createSessionAndLog(
    user: { id: number },
    opts: { rememberMe: boolean; ipAddress: string | null; userAgent: string | null }
  ): Promise<SessionCreated> {
    const { rememberMe, ipAddress, userAgent } = opts;
    const { randomBytes } = await import("crypto");
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + (rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000);

    // Dùng transaction để đảm bảo dữ liệu quan trọng nhất
    const [session] = await prisma.$transaction([
      prisma.session.create({
        data: { token, userId: user.id, expiresAt, ipAddress, userAgent },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
      // Audit log thành công quan trọng nên vẫn để trong transaction
      prisma.auditLog.create({
        data: {
          action: "AUTH_LOGIN_SUCCESS",
          userId: user.id,
          ipAddress,
          userAgent,
          metadata: { rememberMe },
        },
      }),
    ]);

    return { sessionId: session.id, token: session.token, expiresAt };
  },

  async writeAuditLog(
    userId: number | null,
    action: "AUTH_LOGIN_SUCCESS" | "AUTH_LOGIN_FAILED",
    ipAddress: string | null,
    userAgent: string | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata: any
  ) {
    // Không await ở đây trong luồng chính để tăng tốc phản hồi
    prisma.auditLog.create({
      data: { action, userId, ipAddress, userAgent, metadata },
    }).catch(err => console.error("Failed to write audit log:", err));
  },
};

export function maskIdentifier(identifier: string): string {
  if (identifier.includes("@")) {
    const [local, domain] = identifier.split("@");
    return `${local.slice(0, 2)}***@${domain}`;
  }
  return `${identifier.slice(0, 2)}***`;
}
