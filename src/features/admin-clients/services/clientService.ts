import { prisma } from "@/lib/db/prisma";
import { ClientDTO, ClientInput, ClientStats } from "../model/clientSchema";
import { startOfMonth } from "date-fns";

export const clientService = {
  /**
   * Lấy danh sách khách hàng chưa xóa
   */
  async getAll(): Promise<ClientDTO[]> {
    return await prisma.client.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { jobs: true }
        }
      }
    });
  },

  /**
   * Tạo khách hàng mới
   */
  async create(data: ClientInput): Promise<ClientDTO> {
    return await prisma.client.create({
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        zalo: data.zalo || null,
        note: data.note || null,
      },
      include: {
        _count: {
          select: { jobs: true }
        }
      }
    });
  },

  /**
   * Cập nhật thông tin khách hàng
   */
  async update(id: number, data: ClientInput): Promise<ClientDTO> {
    return await prisma.client.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        zalo: data.zalo || null,
        note: data.note || null,
      },
      include: {
        _count: {
          select: { jobs: true }
        }
      }
    });
  },

  /**
   * Xóa mềm khách hàng
   */
  async softDelete(id: number): Promise<void> {
    await prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() }
    });
  },

  /**
   * Kiểm tra khách hàng có đang có Job liên kết không
   */
  async isInUse(id: number): Promise<boolean> {
    const jobCount = await prisma.job.count({
      where: {
        clientId: id,
        deletedAt: null
      }
    });
    return jobCount > 0;
  },

  /**
   * Thống kê các chỉ số khách hàng
   */
  async getStats(): Promise<ClientStats> {
    const total = await prisma.client.count({ where: { deletedAt: null } });
    
    // Khách hàng active (giả định khách có ít nhất 1 job chưa hoàn thành)
    const active = await prisma.client.count({
      where: {
        deletedAt: null,
        jobs: {
          some: {
            status: { not: "COMPLETED" },
            deletedAt: null
          }
        }
      }
    });

    // Khách hàng mới trong tháng
    const monthNew = await prisma.client.count({
      where: {
        deletedAt: null,
        createdAt: { gte: startOfMonth(new Date()) }
      }
    });

    // Phiên online: Giả định dựa trên Job được tạo/cập nhật gần đây hoặc logic tương đương
    // Vì DB không có bảng Online, ta lấy số khách hàng có Job cập nhật trong 24h qua làm ví dụ
    const online = await prisma.client.count({
      where: {
        deletedAt: null,
        updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });

    return { total, active, monthNew, online };
  }
};
