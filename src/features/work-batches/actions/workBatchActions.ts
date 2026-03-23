"use server";

import { revalidatePath } from "next/cache";

import { workBatchService } from "@/features/work-batches/services/workBatchService";
import type { WorkBatchListQuery } from "@/features/work-batches/model/workBatchTypes";
import {
  workBatchCloseSchema,
  workBatchCreateSchema,
  workBatchAddJobsSchema,
  workBatchMoveJobsSchema,
  workBatchRemoveJobsSchema,
  workBatchUpdateSchema,
} from "@/features/work-batches/model/workBatchValidation";

export async function getWorkBatchesAction(query?: WorkBatchListQuery) {
  try {
    const res = query ? await workBatchService.getListPage(query) : await workBatchService.getListPage({ limit: 20 });
    return { success: true, ...res };
  } catch (error) {
    console.error("Action error [getWorkBatches]:", error);
    return { success: false, error: "Không thể tải danh sách đợt làm" as const };
  }
}

export async function getWorkBatchDetailAction(batchId: number) {
  try {
    const data = await workBatchService.getDetail(batchId);
    if (!data) return { success: false, error: "Không tìm thấy đợt làm" as const };
    return { success: true, data };
  } catch (error) {
    console.error("Action error [getWorkBatchDetail]:", error);
    return { success: false, error: "Không thể tải chi tiết đợt làm" as const };
  }
}

export async function createWorkBatchAction(input: unknown) {
  const parsed = workBatchCreateSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dữ liệu không hợp lệ" as const };

  const startDate = new Date(parsed.data.startDate);
  if (Number.isNaN(startDate.getTime())) return { success: false, error: "Ngày bắt đầu không hợp lệ" as const };

  const res = await workBatchService.create({
    name: parsed.data.name,
    startDate,
    note: parsed.data.note || null,
  });

  if (!res.ok) {
    if (res.error === "DUPLICATE_BATCH_NAME") return { success: false, error: "DUPLICATE_BATCH_NAME" as const };
    return { success: false, error: "Lỗi hệ thống" as const };
  }

  revalidatePath("/jobs/work-batches");
  return { success: true, data: { id: res.id } };
}

export async function updateWorkBatchAction(batchId: number, input: unknown) {
  const parsed = workBatchUpdateSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dữ liệu không hợp lệ" as const };

  const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : undefined;
  if (startDate && Number.isNaN(startDate.getTime())) return { success: false, error: "Ngày bắt đầu không hợp lệ" as const };

  const endDate =
    parsed.data.endDate === undefined
      ? undefined
      : parsed.data.endDate
        ? new Date(parsed.data.endDate)
        : null;
  if (endDate instanceof Date && Number.isNaN(endDate.getTime())) return { success: false, error: "Ngày kết thúc không hợp lệ" as const };

  const res = await workBatchService.update(batchId, {
    name: parsed.data.name,
    startDate,
    endDate,
    note: parsed.data.note === undefined ? undefined : parsed.data.note || null,
  });

  if (!res.ok) {
    if (res.error === "DUPLICATE_BATCH_NAME") return { success: false, error: "DUPLICATE_BATCH_NAME" as const };
    return { success: false, error: "Lỗi hệ thống" as const };
  }

  revalidatePath("/jobs/work-batches");
  revalidatePath(`/jobs/work-batches/${batchId}`);
  return { success: true };
}

export async function closeWorkBatchAction(batchId: number, input: unknown) {
  const parsed = workBatchCloseSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dữ liệu không hợp lệ" as const };
  const closeDate = new Date(parsed.data.closeDate);
  if (Number.isNaN(closeDate.getTime())) return { success: false, error: "Ngày đóng không hợp lệ" as const };

  const res = await workBatchService.close(batchId, closeDate);
  if (!res.ok) return { success: false, ...res };

  revalidatePath("/jobs/work-batches");
  revalidatePath(`/jobs/work-batches/${batchId}`);
  return { success: true };
}

export async function reopenWorkBatchAction(batchId: number) {
  try {
    await workBatchService.reopen(batchId);
    revalidatePath("/jobs/work-batches");
    revalidatePath(`/jobs/work-batches/${batchId}`);
    return { success: true };
  } catch (error) {
    console.error("Action error [reopenWorkBatch]:", error);
    return { success: false, error: "Không thể mở lại đợt" as const };
  }
}

export async function deleteWorkBatchAction(batchId: number) {
  try {
    const res = await workBatchService.softDelete(batchId);
    if (!res.ok) return { success: false, ...res };
    revalidatePath("/jobs/work-batches");
    return { success: true };
  } catch (error) {
    console.error("Action error [deleteWorkBatch]:", error);
    return { success: false, error: "Không thể xóa đợt" as const };
  }
}

export async function revalidateWorkBatches() {
  revalidatePath("/jobs/work-batches");
}

export async function getOpenWorkBatchOptionsAction(excludeId?: number) {
  try {
    const data = await workBatchService.getOpenBatchOptions(excludeId);
    return { success: true, data };
  } catch (error) {
    console.error("Action error [getOpenWorkBatchOptions]:", error);
    return { success: false, error: "Không thể tải danh sách đợt mở" as const };
  }
}

export async function getAssignableJobsAction(batchId: number) {
  try {
    const data = await workBatchService.getAssignableJobs(batchId);
    return { success: true, data };
  } catch (error) {
    console.error("Action error [getAssignableJobs]:", error);
    return { success: false, error: "Không thể tải danh sách job" as const };
  }
}

export async function addJobsToBatchAction(input: unknown) {
  const parsed = workBatchAddJobsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dữ liệu không hợp lệ" as const };
  try {
    const res = await workBatchService.addJobsToBatch(parsed.data.batchId, parsed.data.jobIds);
    if (!res.ok) return { success: false, ...res };
    revalidatePath(`/jobs/work-batches/${parsed.data.batchId}`);
    revalidatePath("/jobs/work-batches");
    return { success: true, data: { updatedCount: res.updatedCount } };
  } catch (error) {
    console.error("Action error [addJobsToBatch]:", error);
    return { success: false, error: "Lỗi hệ thống" as const };
  }
}

export async function removeJobsFromBatchAction(input: unknown) {
  const parsed = workBatchRemoveJobsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dữ liệu không hợp lệ" as const };
  try {
    const res = await workBatchService.removeJobsFromBatch(parsed.data.batchId, parsed.data.jobIds);
    if (!res.ok) return { success: false, ...res };
    revalidatePath(`/jobs/work-batches/${parsed.data.batchId}`);
    revalidatePath("/jobs/work-batches");
    return { success: true, data: { updatedCount: res.updatedCount } };
  } catch (error) {
    console.error("Action error [removeJobsFromBatch]:", error);
    return { success: false, error: "Lỗi hệ thống" as const };
  }
}

export async function moveJobsToAnotherBatchAction(input: unknown) {
  const parsed = workBatchMoveJobsSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dữ liệu không hợp lệ" as const };
  try {
    const res = await workBatchService.moveJobsToAnotherBatch(
      parsed.data.sourceBatchId,
      parsed.data.targetBatchId,
      parsed.data.jobIds
    );
    if (!res.ok) return { success: false, ...res };
    revalidatePath(`/jobs/work-batches/${parsed.data.sourceBatchId}`);
    revalidatePath(`/jobs/work-batches/${parsed.data.targetBatchId}`);
    revalidatePath("/jobs/work-batches");
    return { success: true, data: { updatedCount: res.updatedCount } };
  } catch (error) {
    console.error("Action error [moveJobsToAnotherBatch]:", error);
    return { success: false, error: "Lỗi hệ thống" as const };
  }
}

