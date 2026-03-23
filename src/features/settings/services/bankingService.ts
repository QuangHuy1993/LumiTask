import { prisma } from "@/lib/db/prisma";
import { SettingsError } from "../model/settingsTypes";
import { bankAccountSchema } from "../model/settingsValidation";
import { z } from "zod";

export const bankingService = {
  /**
   * Lấy danh sách tài khoản ngân hàng của user (có phân trang)
   */
  async getBankAccounts(userId: number, page = 1, limit = 5) {
    const skip = (page - 1) * limit;
    
    const [accounts, total] = await Promise.all([
      prisma.bankAccount.findMany({
        where: { ownerId: userId, deletedAt: null },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        skip,
        take: limit,
      }),
      prisma.bankAccount.count({
        where: { ownerId: userId, deletedAt: null },
      }),
    ]);

    return { accounts, total, page, totalPages: Math.ceil(total / limit) };
  },

  /**
   * Thêm tài khoản ngân hàng mới (Tối ưu performance)
   */
  async createBankAccount(userId: number, data: z.infer<typeof bankAccountSchema>) {
    // 1. Kiểm tra giới hạn và trùng lặp cùng lúc
    const [count, existing] = await Promise.all([
      prisma.bankAccount.count({
        where: { ownerId: userId, deletedAt: null },
      }),
      prisma.bankAccount.findFirst({
        where: { 
          bankId: data.bankId, 
          accountNo: data.accountNo, 
          deletedAt: null 
        },
        select: { id: true }
      })
    ]);

    if (count >= 10) {
      throw new SettingsError("LIMIT_EXCEEDED", "Tối đa 10 tài khoản ngân hàng");
    }

    if (existing) {
      throw new SettingsError("DUPLICATE_ACCOUNT", "Tài khoản này đã được thêm");
    }

    // 2. Nếu đặt làm mặc định trong transaction
    return prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.bankAccount.updateMany({
          where: { ownerId: userId, isDefault: true, deletedAt: null },
          data: { isDefault: false },
        });
      }

      return tx.bankAccount.create({
        data: {
          ...data,
          ownerId: userId,
        },
      });
    });
  },

  /**
   * Cập nhật tài khoản ngân hàng
   */
  async updateBankAccount(userId: number, accountId: number, data: z.infer<typeof bankAccountSchema>) {
    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId },
      select: { ownerId: true }
    });

    if (!account || account.ownerId !== userId) {
      throw new SettingsError("NOT_FOUND", "Không tìm thấy tài khoản");
    }

    return prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.bankAccount.updateMany({
          where: { ownerId: userId, isDefault: true, deletedAt: null, id: { not: accountId } },
          data: { isDefault: false },
        });
      }

      return tx.bankAccount.update({
        where: { id: accountId },
        data,
      });
    });
  },

  /**
   * Đặt tài khoản làm mặc định
   */
  async setDefaultAccount(userId: number, accountId: number) {
    return prisma.$transaction([
      prisma.bankAccount.updateMany({
        where: { ownerId: userId, isDefault: true, deletedAt: null, id: { not: accountId } },
        data: { isDefault: false },
      }),
      prisma.bankAccount.update({
        where: { id: accountId, ownerId: userId },
        data: { isDefault: true },
      }),
    ]);
  },

  /**
   * Xóa tài khoản (soft delete)
   */
  async deleteBankAccount(userId: number, accountId: number) {
    const account = await prisma.bankAccount.findUnique({
      where: { id: accountId },
      select: { isDefault: true, ownerId: true },
    });

    if (!account || account.ownerId !== userId) {
      throw new SettingsError("NOT_FOUND", "Không tìm thấy tài khoản");
    }

    return prisma.$transaction(async (tx) => {
      // 1. Soft delete
      await tx.bankAccount.update({
        where: { id: accountId },
        data: { deletedAt: new Date(), isDefault: false },
      });

      // 2. Nếu là mặc định, thử tìm cái khác thay thế
      if (account.isDefault) {
        const next = await tx.bankAccount.findFirst({
          where: { ownerId: userId, deletedAt: null },
          orderBy: { createdAt: "asc" },
        });

        if (next) {
          await tx.bankAccount.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
    });
  },
};
