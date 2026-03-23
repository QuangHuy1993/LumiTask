"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { jobService } from "@/features/jobs/services/jobService";
import type { JobListQuery } from "@/features/jobs/model/jobTypes";
import { jobCreateSchema, jobUpdateSchema, jobFilterSchema } from "@/features/jobs/model/jobValidation";
import { prisma } from "@/lib/db/prisma";

export async function getJobsAction(query?: JobListQuery) {
  try {
    const parsed = jobFilterSchema.safeParse(query ?? { limit: 20 });
    if (!parsed.success) {
      return { success: false as const, error: "Dữ liệu không hợp lệ" as const };
    }
    const res = await jobService.getListPage(parsed.data);
    return { success: true as const, ...res };
  } catch (error) {
    console.error("Action error [getJobsAction]:", error);
    return { success: false as const, error: "Không thể tải danh sách việc làm" as const };
  }
}

export async function getJobDetailAction(jobId: number) {
  try {
    const data = await jobService.getById(jobId);
    if (!data) return { success: false as const, error: "Không tìm thấy việc làm" as const };
    return { success: true as const, data };
  } catch (error) {
    console.error("Action error [getJobDetailAction]:", error);
    return { success: false as const, error: "Không thể tải chi tiết việc làm" as const };
  }
}

export async function createJobAction(input: unknown) {
  const parsed = jobCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Dữ liệu không hợp lệ" as const };
  }

  const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : null;
  const deadline = parsed.data.deadline ? new Date(parsed.data.deadline) : null;
  if (startDate && Number.isNaN(startDate.getTime())) return { success: false as const, error: "Ngày bắt đầu không hợp lệ" as const };
  if (deadline && Number.isNaN(deadline.getTime())) return { success: false as const, error: "Deadline không hợp lệ" as const };

  const amount = new Prisma.Decimal(parsed.data.amount);
  const deposit = new Prisma.Decimal(parsed.data.deposit || "0");
  const referralFee = new Prisma.Decimal(parsed.data.referralFee || "0");

  let batchIdToUse: number | null = parsed.data.batchId ?? null;
  if (batchIdToUse == null) {
    const latestOpen = await prisma.workBatch.findFirst({
      where: { deletedAt: null, status: "OPEN" },
      orderBy: [{ startDate: "desc" }, { id: "desc" }],
      select: { id: true },
    });
    if (latestOpen) batchIdToUse = latestOpen.id;
  }

  const res = await jobService.create({
    name: parsed.data.name,
    clientId: parsed.data.clientId ?? null,
    subjectId: parsed.data.subjectId ?? null,
    batchId: batchIdToUse,
    status: parsed.data.status,
    priority: parsed.data.priority,
    startDate,
    deadline,
    amount,
    deposit,
    referralFee,
    referrer: parsed.data.referrer || null,
    note: parsed.data.note || null,
  });

  if (!res.ok) {
    return { success: false as const, error: "Lỗi hệ thống" as const };
  }

  revalidatePath("/jobs/list");
  return { success: true as const, data: { id: res.id } };
}

export async function updateJobAction(jobId: number, input: unknown) {
  const parsed = jobUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Dữ liệu không hợp lệ" as const };
  }

  const startDate = parsed.data.startDate ? new Date(parsed.data.startDate) : undefined;
  const deadline = parsed.data.deadline ? new Date(parsed.data.deadline) : undefined;
  if (startDate && Number.isNaN(startDate.getTime())) return { success: false as const, error: "Ngày bắt đầu không hợp lệ" as const };
  if (deadline && Number.isNaN(deadline.getTime())) return { success: false as const, error: "Deadline không hợp lệ" as const };

  const amount = parsed.data.amount !== undefined ? new Prisma.Decimal(parsed.data.amount) : undefined;
  const deposit = parsed.data.deposit !== undefined ? new Prisma.Decimal(parsed.data.deposit) : undefined;
  const referralFee = parsed.data.referralFee !== undefined ? new Prisma.Decimal(parsed.data.referralFee) : undefined;

  const res = await jobService.update(jobId, {
    name: parsed.data.name,
    clientId: parsed.data.clientId,
    subjectId: parsed.data.subjectId,
    batchId: parsed.data.batchId,
    status: parsed.data.status,
    priority: parsed.data.priority,
    startDate,
    deadline,
    amount,
    deposit,
    referralFee,
    referrer: parsed.data.referrer === undefined ? undefined : parsed.data.referrer || null,
    note: parsed.data.note === undefined ? undefined : parsed.data.note || null,
  });

  if (!res.ok) {
    return { success: false as const, error: "Lỗi hệ thống" as const };
  }

  revalidatePath("/jobs/list");
  revalidatePath(`/jobs/list/${jobId}`);
  return { success: true as const };
}

export async function deleteJobAction(jobId: number) {
  try {
    const res = await jobService.softDelete(jobId);
    if (!res.ok) return { success: false as const, error: "Không thể xóa việc làm" as const };
    revalidatePath("/jobs/list");
    return { success: true as const };
  } catch (error) {
    console.error("Action error [deleteJobAction]:", error);
    return { success: false as const, error: "Không thể xóa việc làm" as const };
  }
}

