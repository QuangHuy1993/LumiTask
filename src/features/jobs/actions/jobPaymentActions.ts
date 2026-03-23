"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { formatMoneyVND } from "@/features/work-batches/model/moneyFormat";
import { sessionService } from "@/lib/auth/session";
import { jobPaymentService } from "@/features/jobs/services/jobPaymentService";
import { jobManualPaymentSchema, quickClientCreateSchema, quickSubjectCreateSchema } from "@/features/jobs/model/jobValidation";

export async function recordManualPaymentAction(input: unknown) {
  const parsed = jobManualPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Dữ liệu không hợp lệ" as const };
  }

  const date = new Date(parsed.data.date);
  if (Number.isNaN(date.getTime())) {
    return { success: false as const, error: "Ngày thanh toán không hợp lệ" as const };
  }

  // Kết hợp ngày được chọn với giờ hiện tại (theo múi giờ máy chủ),
  // sau đó khi hiển thị sẽ luôn render theo Asia/Ho_Chi_Minh.
  const now = new Date();
  const combinedDate = new Date(date);
  combinedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

  const user = await sessionService.getCurrentUser();
  const amount = new Prisma.Decimal(parsed.data.amount);

  const res = await jobPaymentService.recordManualPayment({
    jobId: parsed.data.jobId,
    date: combinedDate,
    amount,
    type: parsed.data.type,
    bankAccountId: parsed.data.bankAccountId,
    content: parsed.data.content,
    userId: user?.id,
  });

  if (!res.ok) {
    if (res.error === "JOB_NOT_FOUND") return { success: false as const, error: "Không tìm thấy việc làm" as const };
    return { success: false as const, error: "Lỗi hệ thống" as const };
  }

  revalidatePath(`/jobs/list/${parsed.data.jobId}`);
  revalidatePath("/jobs/list");
  return { success: true as const };
}

export async function getJobPaymentHistoryAction(jobId: number) {
  try {
    const items = await prisma.transaction.findMany({
      where: { deletedAt: null, jobId },
      orderBy: [{ transactionDate: "desc" }, { id: "desc" }],
      include: {
        bankAccount: { select: { bankId: true, accountNo: true, accountName: true } },
      },
    });
    const data = items.map((t) => ({
      id: t.id,
      transactionDate: t.transactionDate.toISOString(),
      amountText: formatMoneyVND(t.amount),
      content: t.content,
      status: t.status,
      bankAccount: t.bankAccount,
    }));
    return { success: true as const, data };
  } catch (error) {
    console.error("Action error [getJobPaymentHistory]:", error);
    return { success: false as const, error: "Không thể tải lịch sử thanh toán" as const };
  }
}

export async function quickCreateClientAction(input: unknown) {
  const parsed = quickClientCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Dữ liệu khách hàng không hợp lệ" as const };
  }

  try {
    const created = await prisma.client.create({
      data: {
        name: parsed.data.name.trim(),
        phone: parsed.data.phone || null,
        zalo: parsed.data.zalo || null,
      },
      select: { id: true, name: true, phone: true, zalo: true },
    });
    return { success: true as const, data: created };
  } catch (error) {
    console.error("Action error [quickCreateClient]:", error);
    return { success: false as const, error: "Không thể tạo khách hàng" as const };
  }
}

export async function quickCreateSubjectAction(input: unknown) {
  const parsed = quickSubjectCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: "Dữ liệu môn học không hợp lệ" as const };
  }

  try {
    const created = await prisma.subject.create({
      data: {
        name: parsed.data.name.trim(),
      },
      select: { id: true, name: true },
    });
    return { success: true as const, data: created };
  } catch (error) {
    console.error("Action error [quickCreateSubject]:", error);
    return { success: false as const, error: "Không thể tạo môn học" as const };
  }
}

export async function getJobFormOptionsAction() {
  try {
    const [clients, subjects, batches] = await Promise.all([
      prisma.client.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, phone: true },
      }),
      prisma.subject.findMany({
        where: { deletedAt: null },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.workBatch.findMany({
        where: { deletedAt: null, status: "OPEN" },
        orderBy: [{ startDate: "desc" }, { id: "desc" }],
        select: { id: true, name: true },
      }),
    ]);

    return {
      success: true as const,
      data: {
        clients,
        subjects,
        batches,
      },
    };
  } catch (error) {
    console.error("Action error [getJobFormOptions]:", error);
    return { success: false as const, error: "Không thể tải dữ liệu form" as const };
  }
}

