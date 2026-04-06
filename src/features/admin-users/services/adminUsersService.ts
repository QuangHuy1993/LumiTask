import { prisma } from "@/lib/db/prisma";
import { passwordService } from "@/lib/auth/password";
import type { CreateUserInput, UpdateUserInput, UserDTO } from "../model/userSchema";

export const adminUsersService = {
  async getAll(): Promise<UserDTO[]> {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return users;
  },

  async createUser(data: CreateUserInput): Promise<UserDTO> {
    const normalizedEmail = data.email.trim() === "" ? null : data.email;
    const existing = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { username: data.username },
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ],
      },
      select: { id: true, username: true, email: true },
    });
    if (existing?.username === data.username) {
      throw new Error(`Tên đăng nhập "${data.username}" đã tồn tại`);
    }
    if (normalizedEmail && existing?.email === normalizedEmail) {
      throw new Error(`Email "${normalizedEmail}" đã tồn tại`);
    }

    const hashedPassword = await passwordService.hash(data.password);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        email: normalizedEmail,
        password: hashedPassword,
        fullName: data.fullName || null,
        role: data.role,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    return user;
  },

  async updateUser(userId: number, data: UpdateUserInput): Promise<UserDTO> {
    const normalizedEmail = data.email.trim() === "" ? null : data.email;
    if (normalizedEmail) {
      const duplicate = await prisma.user.findFirst({
        where: {
          deletedAt: null,
          email: normalizedEmail,
          id: { not: userId },
        },
        select: { id: true },
      });
      if (duplicate) {
        throw new Error(`Email "${normalizedEmail}" đã tồn tại`);
      }
    }

    const updateData: Record<string, unknown> = {
      fullName: data.fullName || null,
      email: normalizedEmail,
      role: data.role,
    };

    if (data.password && data.password.trim() !== "") {
      updateData.password = await passwordService.hash(data.password);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    return user;
  },

  async disableUser(userId: number): Promise<void> {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { isActive: false },
      }),
      prisma.session.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      }),
    ]);
  },

  async enableUser(userId: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });
  },
};
