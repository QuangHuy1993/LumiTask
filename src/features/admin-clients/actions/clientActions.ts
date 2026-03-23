"use server";

import { revalidatePath } from "next/cache";
import { clientService } from "../services/clientService";
import { ClientSchema, ClientInput } from "../model/clientSchema";

/**
 * Server Action: Lấy tất cả khách hàng
 */
export async function getClientsAction() {
  try {
    const clients = await clientService.getAll();
    return { success: true, data: clients };
  } catch (error) {
    console.error("Action error [getClients]:", error);
    return { success: false, error: "Không thể tải danh sách khách hàng" };
  }
}

/**
 * Server Action: Tạo khách hàng mới
 */
export async function createClientAction(formData: ClientInput) {
  try {
    const validate = ClientSchema.safeParse(formData);
    if (!validate.success) {
      return { 
        success: false, 
        error: "Dữ liệu không hợp lệ", 
        details: validate.error.flatten().fieldErrors 
      };
    }

    const result = await clientService.create(validate.data);
    revalidatePath("/jobs/clients");
    return { success: true, data: result };
  } catch (error) {
    console.error("Action error [createClient]:", error);
    return { success: false, error: "Lỗi hệ thống khi tạo khách hàng" };
  }
}

/**
 * Server Action: Cập nhật khách hàng
 */
export async function updateClientAction(id: number, formData: ClientInput) {
  try {
    const validate = ClientSchema.safeParse(formData);
    if (!validate.success) {
      return { success: false, error: "Dữ liệu không hợp lệ" };
    }

    const result = await clientService.update(id, validate.data);
    revalidatePath("/jobs/clients");
    return { success: true, data: result };
  } catch (error) {
    console.error("Action error [updateClient]:", error);
    return { success: false, error: "Không thể cập nhật khách hàng" };
  }
}

/**
 * Server Action: Xóa khách hàng (Soft Delete)
 */
export async function deleteClientAction(id: number) {
  try {
    const inUse = await clientService.isInUse(id);
    if (inUse) {
      return { 
        success: false, 
        error: "Không thể xóa vì khách hàng này đang có công việc (Job) liên quan." 
      };
    }

    await clientService.softDelete(id);
    revalidatePath("/jobs/clients");
    return { success: true };
  } catch (error) {
    console.error("Action error [deleteClient]:", error);
    return { success: false, error: "Lỗi khi xóa khách hàng" };
  }
}

/**
 * Server Action: Lấy thống kê
 */
export async function getClientStatsAction() {
  try {
    const stats = await clientService.getStats();
    return { success: true, data: stats };
  } catch (error) {
    console.error("Action error [getClientStats]:", error);
    return { success: false, error: "Lỗi khi tải thống kê" };
  }
}
