"use server";

import { revalidatePath } from "next/cache";
import { subjectService } from "../services/subjectService";
import { SubjectSchema, SubjectInput } from "../model/subjectSchema";

/**
 * Server Action: Lấy tất cả môn học
 */
export async function getSubjectsAction() {
  try {
    const subjects = await subjectService.getAll();
    return { success: true, data: subjects };
  } catch (error) {
    console.error("Action error [getSubjects]:", error);
    return { success: false, error: "Không thể tải danh sách môn học" };
  }
}

/**
 * Server Action: Tạo môn học mới
 */
export async function createSubjectAction(formData: SubjectInput) {
  try {
    // 1. Validate dữ liệu
    const validate = SubjectSchema.safeParse(formData);
    if (!validate.success) {
      return { 
        success: false, 
        error: "Dữ liệu không hợp lệ", 
        details: validate.error.flatten().fieldErrors 
      };
    }

    const { name, code } = validate.data;

    // 2. Check trùng lặp
    const existing = await subjectService.findDuplicate(name, code || undefined);
    if (existing) {
      return { 
        success: false, 
        error: `Môn học với tên "${name}" hoặc mã "${code}" đã tồn tại.` 
      };
    }

    // 3. Tạo mới
    const result = await subjectService.create(validate.data);

    // 4. Revalidate
    revalidatePath("/jobs/subjects");

    return { success: true, data: result };
  } catch (error) {
    console.error("Action error [createSubject]:", error);
    return { success: false, error: "Lỗi hệ thống khi tạo môn học" };
  }
}

/**
 * Server Action: Cập nhật môn học
 */
export async function updateSubjectAction(id: number, formData: SubjectInput) {
  try {
    // 1. Validate
    const validate = SubjectSchema.safeParse(formData);
    if (!validate.success) {
      return { success: false, error: "Dữ liệu không hợp lệ" };
    }

    const { name, code } = validate.data;

    // 2. Check trùng lặp (loại trừ ID hiện tại)
    const existing = await subjectService.findDuplicate(name, code || undefined, id);
    if (existing) {
      return { success: false, error: "Tên hoặc mã môn học đã bị trùng." };
    }

    // 3. Update
    const result = await subjectService.update(id, validate.data);

    // 4. Revalidate
    revalidatePath("/jobs/subjects");

    return { success: true, data: result };
  } catch (error) {
    console.error("Action error [updateSubject]:", error);
    return { success: false, error: "Không thể cập nhật môn học" };
  }
}

/**
 * Server Action: Xóa môn học (Soft Delete)
 */
export async function deleteSubjectAction(id: number) {
  try {
    // 1. Kiểm tra xem có đang dùng không
    const inUse = await subjectService.isInUse(id);
    if (inUse) {
      return { 
        success: false, 
        error: "Không thể xóa vì môn học này đang có công việc (Job) liên quan." 
      };
    }

    // 2. Soft delete
    await subjectService.softDelete(id);

    // 3. Revalidate
    revalidatePath("/jobs/subjects");

    return { success: true };
  } catch (error) {
    console.error("Action error [deleteSubject]:", error);
    return { success: false, error: "Lỗi khi xóa môn học" };
  }
}
