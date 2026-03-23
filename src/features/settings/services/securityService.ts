import { prisma } from "@/lib/db/prisma";
import { passwordService } from "@/lib/auth/password";
import { generateSecret, generateURI, verify } from "otplib";
import { SettingsError } from "@/features/settings/model/settingsTypes";
import { changePasswordSchema } from "@/features/settings/model/settingsValidation";
import { z } from "zod";

export const securityService = {
  /**
   * Đổi mật khẩu người dùng
   */
  async changePassword(userId: number, data: z.infer<typeof changePasswordSchema>) {
    // 1. Lấy thông tin user hiện tại
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    if (!user) {
      throw new SettingsError("USER_NOT_FOUND", "Người dùng không tồn tại");
    }

    // 2. Kiểm tra mật khẩu cũ
    const isOldCorrect = await passwordService.verify(data.currentPassword, user.password);
    if (!isOldCorrect) {
      throw new SettingsError("WRONG_CURRENT_PASSWORD", "Mật khẩu hiện tại không đúng");
    }

    // 3. Hash mật khẩu mới
    const newHash = await passwordService.hash(data.newPassword);

    // 4. Update trong transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { password: newHash, updatedAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          action: "AUTH_PASSWORD_CHANGED",
          userId,
          metadata: { changedAt: new Date().toISOString() },
        },
      }),
      // Revoke all sessions after password change for security
      prisma.session.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { success: true };
  },

  /**
   * Khởi tạo thiết lập 2FA (tạo secret và QR URI)
   */
  async init2FA(userId: number, forceNew = false) {
    const existing = await prisma.userTwoFactor.findUnique({
      where: { userId }
    });

    // Nếu đã có secret và không bị ép buộc tạo mới, thì dùng lại
    const secret = (!forceNew && existing?.totpSecret) ? existing.totpSecret : generateSecret();
    const isReactivating = !!(!forceNew && existing?.totpSecret);
    
    // Lấy email để gán vào QR code
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, username: true }
    });

    const accountName = user?.email || user?.username || "LumiTask User";
    const issuer = "LumiTask";
    const otpauth = generateURI({ 
      issuer, 
      label: accountName, 
      secret,
      algorithm: "sha1",
      digits: 6,
      period: 30
    });

    // Lưu tạm secret (chưa enable)
    await prisma.userTwoFactor.upsert({
      where: { userId },
      update: { totpSecret: secret, isEnabled: false },
      create: { userId, totpSecret: secret, isEnabled: false },
    });

    return { secret, otpauth, isReactivating };
  },

  /**
   * Xác thực mã OTP và kích hoạt 2FA + tạo mã khôi phục
   */
  async verifyAndEnable2FA(userId: number, code: string) {
    const twoFactor = await prisma.userTwoFactor.findUnique({
      where: { userId },
    });

    if (!twoFactor) throw new SettingsError("NOT_FOUND", "Yêu cầu 2FA không tồn tại");

    const result = await verify({
      token: code,
      secret: twoFactor.totpSecret,
    });

    if (!result || !result.valid) throw new SettingsError("INVALID_CODE", "Mã xác thực không chính xác");

    // Tạo 10 mã khôi phục ngẫu nhiên (8 ký tự alphanumeric)
    const { randomBytes } = await import("crypto");
    const recoveryCodes = Array.from({ length: 10 }).map(() => 
      randomBytes(4).toString("hex").toUpperCase()
    );

    // Lưu mã khôi phục (hash) và kích hoạt 2FA trong 1 transaction
    const bcrypt = await import("bcryptjs");
    const hashedCodes = await Promise.all(
      recoveryCodes.map(code => bcrypt.hash(code, 10))
    );

    await prisma.$transaction([
      prisma.userTwoFactor.update({
        where: { userId },
        data: { isEnabled: true, lastVerifiedAt: new Date() },
      }),
      // Xoá mã cũ (nếu có)
      prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
      // Thêm mã mới
      prisma.twoFactorRecoveryCode.createMany({
        data: hashedCodes.map(hash => ({
          userId,
          codeHash: hash,
        })),
      }),
      prisma.auditLog.create({
        data: {
          action: "AUTH_2FA_ENABLED",
          userId,
          metadata: { enabledAt: new Date().toISOString() },
        },
      }),
    ]);

    return { recoveryCodes };
  },

  /**
   * Tắt 2FA
   */
  async disable2FA(userId: number) {
    await prisma.$transaction([
      prisma.userTwoFactor.update({
        where: { userId },
        data: { isEnabled: false }
      }),
      prisma.twoFactorRecoveryCode.deleteMany({ where: { userId } }),
      prisma.auditLog.create({
        data: {
          action: "AUTH_2FA_DISABLED",
          userId,
          metadata: { disabledAt: new Date().toISOString() },
        },
      }),
    ]);

    return { success: true };
  },

  /**
   * Lấy trạng thái 2FA hiện tại
   */
  async get2FAStatus(userId: number) {
    const twoFactor = await prisma.userTwoFactor.findUnique({
      where: { userId },
      select: { isEnabled: true },
    });
    return !!twoFactor?.isEnabled;
  },
};
