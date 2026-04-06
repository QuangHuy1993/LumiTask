"use server";

import { revalidatePath } from "next/cache";
import { sessionService } from "@/lib/auth/session";
import { adminUsersService } from "../services/adminUsersService";
import { createUserSchema, updateUserSchema } from "../model/userSchema";

function ownerOnly() {
  return { success: false as const, error: "Bạn không có quyền thực hiện hành động này" };
}

export async function getUsersAction() {
  try {
    const me = await sessionService.getCurrentUser();
    if (!me || me.role !== "OWNER") return ownerOnly();

    const data = await adminUsersService.getAll();
    return { success: true as const, data };
  } catch {
    return { success: false as const, error: "Không thể tải danh sách người dùng" };
  }
}

export async function createUserAction(formData: unknown) {
  try {
    const me = await sessionService.getCurrentUser();
    if (!me || me.role !== "OWNER") return ownerOnly();

    const parsed = createUserSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false as const,
        error: "Dữ liệu không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      };
    }

    const user = await adminUsersService.createUser(parsed.data);
    revalidatePath("/users");
    return { success: true as const, data: user };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi hệ thống khi tạo người dùng";
    return { success: false as const, error: message };
  }
}

export async function updateUserAction(userId: number, formData: unknown) {
  try {
    const me = await sessionService.getCurrentUser();
    if (!me || me.role !== "OWNER") return ownerOnly();

    const parsed = updateUserSchema.safeParse(formData);
    if (!parsed.success) {
      return {
        success: false as const,
        error: "Dữ liệu không hợp lệ",
        details: parsed.error.flatten().fieldErrors,
      };
    }

    const user = await adminUsersService.updateUser(userId, parsed.data);
    revalidatePath("/users");
    return { success: true as const, data: user };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi hệ thống khi cập nhật người dùng";
    return { success: false as const, error: message };
  }
}

export async function disableUserAction(userId: number) {
  try {
    const me = await sessionService.getCurrentUser();
    if (!me || me.role !== "OWNER") return ownerOnly();
    if (me.id === userId) {
      return { success: false as const, error: "Không thể tắt tài khoản của chính mình" };
    }

    await adminUsersService.disableUser(userId);
    revalidatePath("/users");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Lỗi khi tắt người dùng" };
  }
}

export async function enableUserAction(userId: number) {
  try {
    const me = await sessionService.getCurrentUser();
    if (!me || me.role !== "OWNER") return ownerOnly();

    await adminUsersService.enableUser(userId);
    revalidatePath("/users");
    return { success: true as const };
  } catch {
    return { success: false as const, error: "Lỗi khi kích hoạt người dùng" };
  }
}
