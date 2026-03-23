"use server";

import { prisma } from "@/lib/db/prisma";
import { sessionService } from "@/lib/auth/session";

/**
 * Lấy tất cả tài khoản ngân hàng của người dùng hiện tại
 * (Phục vụ cho chức năng Tạo mã thanh toán)
 */
export async function getUserBankAccountsAction() {
  try {
    const user = await sessionService.getCurrentUser();
    if (!user) {
      return { success: false, error: "UNAUTHORIZED" };
    }

    const accounts = await prisma.bankAccount.findMany({
      where: { 
        ownerId: user.id, 
        deletedAt: null 
      },
      orderBy: [
        { isDefault: "desc" },
        { createdAt: "asc" }
      ],
    });

    return { 
      success: true, 
      data: accounts.map(acc => ({
        id: acc.id,
        bankId: acc.bankId,
        accountNo: acc.accountNo,
        accountName: acc.accountName,
        isDefault: acc.isDefault
      }))
    };
  } catch (error) {
    console.error("[Payment Action] Failed to fetch bank accounts:", error);
    return { success: false, error: "SERVER_ERROR" };
  }
}
