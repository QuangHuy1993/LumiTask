"use client";

import React from "react";
import { Edit3, QrCode, Trash2, Eye } from "lucide-react";
import Link from "next/link";

import type { JobListItemDTO } from "@/features/jobs/model/jobTypes";
import type { PaymentStatus, JobPriority } from "@prisma/client";

type Props = {
  items: JobListItemDTO[];
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onOpenQr: (id: number) => void;
};

function paymentBadgeClasses(status: PaymentStatus): string {
  if (status === "UNPAID") return "bg-coral-50 text-coral-600";
  if (status === "DEPOSIT_PAID") return "bg-sand-50 text-sand-700";
  return "bg-mint-100 text-mint-700";
}

function paymentLabel(status: PaymentStatus): string {
  if (status === "UNPAID") return "Chưa đóng";
  if (status === "DEPOSIT_PAID") return "Đã cọc";
  return "Đã xong";
}

function priorityBadgeClasses(priority: JobPriority): string {
  if (priority === "LOW") return "bg-slate-100 text-slate-600 border border-slate-200";
  if (priority === "HIGH") return "bg-orange-100 text-orange-700 border border-orange-200";
  if (priority === "URGENT") return "bg-rose-100 text-rose-700 border border-rose-200";
  return "bg-blue-100 text-blue-700 border border-blue-200"; // MEDIUM
}

function priorityLabel(priority: JobPriority): string {
  if (priority === "LOW") return "Thấp";
  if (priority === "HIGH") return "Cao";
  if (priority === "URGENT") return "Khẩn cấp";
  return "Bình thường";
}

export function JobTable({ items, onEdit, onDelete, onOpenQr }: Props) {
  if (items.length === 0) {
    return (
      <div className="border border-dashed border-slate-200 rounded-xl p-10 text-center text-slate-500 text-sm">
        Chưa có việc làm nào. Bấm &quot;Thêm việc làm&quot; để bắt đầu.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Việc làm &amp; Hạn chót
            </th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Khách hàng</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Môn/Batch</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
              Tổng tiền
            </th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Đã trả</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
              Còn lại
            </th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
              Trạng thái
            </th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {items.map((job) => (
            <tr key={job.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="font-bold text-sm text-slate-900">{job.name}</div>
                  <span className={`px-2 py-[1px] rounded text-[10px] font-bold ${priorityBadgeClasses(job.priority)}`}>
                    {priorityLabel(job.priority)}
                  </span>
                </div>
                {job.deadline ? (
                  <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                    Hạn chót: {new Date(job.deadline).toLocaleString("vi-VN")}
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 mt-0.5">—</div>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="text-sm font-medium text-slate-900">{job.clientName ?? "—"}</div>
                <div className="text-xs text-slate-400">#{job.id}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-slate-900">{job.subjectName ?? "—"}</div>
                <div className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-1 text-slate-700">
                  {job.batchName ?? "—"}
                </div>
              </td>
              <td className="px-6 py-4 text-right font-semibold text-sm text-slate-900">{job.amountText}</td>
              <td className="px-6 py-4 text-right text-sm text-mint-600 font-semibold">{job.totalPaidText}</td>
              <td className="px-6 py-4 text-right text-sm font-bold text-slate-900">{job.remainingText}</td>
              <td className="px-6 py-4 text-center">
                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${paymentBadgeClasses(
                    job.paymentStatus,
                  )}`}
                >
                  {paymentLabel(job.paymentStatus)}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => onOpenQr(job.id)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                    title="QR Thanh toán"
                  >
                    <QrCode className="size-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(job.id)}
                    className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                    title="Chỉnh sửa"
                  >
                    <Edit3 className="size-5" />
                  </button>
                  <Link
                    href={`/jobs/list/${job.id}`}
                    className="p-1.5 rounded-lg hover:bg-slate-200 text-primary transition-colors"
                    title="Chi tiết"
                  >
                    <Eye className="size-5" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(job.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                    title="Xóa"
                  >
                    <Trash2 className="size-5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

