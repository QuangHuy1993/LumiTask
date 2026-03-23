import { prisma } from "@/lib/db/prisma";
import { SubjectInput } from "../model/subjectSchema";

/**
 * Tầng dịch vụ tương tác trực tiếp với Database qua Prisma
 * Đảm bảo các chỉ số tối ưu và hỗ trợ Soft Delete
 */
export const subjectService = {
  /**
   * Lấy danh sách môn học kèm số lượng job liên quan
   */
  getAll: async () => {
    return await prisma.subject.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        code: true,
        color: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { jobs: true }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

  /**
   * Tìm môn học theo ID
   */
  getById: async (id: number) => {
    return await prisma.subject.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  },

  /**
   * Kiểm tra trùng lặp theo tên hoặc mã
   */
  findDuplicate: async (name: string, code?: string, excludeId?: number) => {
    return await prisma.subject.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: "insensitive" as const } },
          ...(code ? [{ code: { equals: code, mode: "insensitive" as const } }] : []),
        ],
        deletedAt: null,
        NOT: excludeId ? { id: excludeId } : undefined,
      },
      select: { id: true, name: true, code: true }
    });
  },

  /**
   * Tạo môn học mới
   */
  create: async (data: SubjectInput) => {
    return await prisma.subject.create({
      data: {
        name: data.name,
        code: data.code || null,
        color: data.color,
      },
    });
  },

  /**
   * Cập nhật thông tin môn học
   */
  update: async (id: number, data: SubjectInput) => {
    return await prisma.subject.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code || null,
        color: data.color,
      },
    });
  },

  /**
   * Xóa tạm (Soft Delete)
   */
  softDelete: async (id: number) => {
    return await prisma.subject.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  },

  /**
   * Kiểm tra xem môn học có đang được sử dụng ở Job nào không
   */
  isInUse: async (id: number) => {
    const jobCount = await prisma.job.count({
      where: {
        subjectId: id,
        deletedAt: null,
      }
    });
    return jobCount > 0;
  }
};
