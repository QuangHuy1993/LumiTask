"use client";

import React from "react";
import { Search } from "lucide-react";

import type { JobStatus, PaymentStatus } from "@prisma/client";

type Option = { id: number; label: string };

type Props = {
  search: string;
  onSearchChange: (v: string) => void;
  clientOptions: Option[];
  subjectOptions: Option[];
  batchOptions: Option[];
  clientId?: number;
  onClientChange: (id?: number) => void;
  subjectId?: number;
  onSubjectChange: (id?: number) => void;
  batchId?: number;
  onBatchChange: (id?: number) => void;
  status: JobStatus | "ALL";
  onStatusChange: (s: JobStatus | "ALL") => void;
  paymentStatus: PaymentStatus | "ALL";
  onPaymentStatusChange: (s: PaymentStatus | "ALL") => void;
};

export function JobFilterBar(props: Props) {
  const {
    search,
    onSearchChange,
    clientOptions,
    subjectOptions,
    batchOptions,
    clientId,
    onClientChange,
    subjectId,
    onSubjectChange,
    batchId,
    onBatchChange,
    status,
    onStatusChange,
    paymentStatus,
    onPaymentStatusChange,
  } = props;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
      <div className="lg:col-span-1">
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Tìm kiếm</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ID, Tên việc..."
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
          />
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Khách hàng</label>
        <select
          className="w-full text-sm border-slate-200 rounded-lg focus:ring-primary/20 focus:border-primary/40"
          value={clientId ?? ""}
          onChange={(e) => onClientChange(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">Tất cả khách</option>
          {clientOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Môn học</label>
        <select
          className="w-full text-sm border-slate-200 rounded-lg focus:ring-primary/20 focus:border-primary/40"
          value={subjectId ?? ""}
          onChange={(e) => onSubjectChange(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">Tất cả môn</option>
          {subjectOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Đợt (Batch)</label>
        <select
          className="w-full text-sm border-slate-200 rounded-lg focus:ring-primary/20 focus:border-primary/40"
          value={batchId ?? ""}
          onChange={(e) => onBatchChange(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">Tất cả đợt</option>
          {batchOptions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Trạng thái việc</label>
        <select
          className="w-full text-sm border-slate-200 rounded-lg focus:ring-primary/20 focus:border-primary/40"
          value={status}
          onChange={(e) => onStatusChange(e.target.value as JobStatus | "ALL")}
        >
          <option value="ALL">Mọi trạng thái</option>
          <option value="NOT_STARTED">Chưa bắt đầu</option>
          <option value="IN_PROGRESS">Đang làm</option>
          <option value="COMPLETED">Hoàn thành</option>
          <option value="CANCELLED">Đã hủy</option>
        </select>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 ml-1">Thanh toán</label>
        <select
          className="w-full text-sm border-slate-200 rounded-lg focus:ring-primary/20 focus:border-primary/40"
          value={paymentStatus}
          onChange={(e) => onPaymentStatusChange(e.target.value as PaymentStatus | "ALL")}
        >
          <option value="ALL">Tất cả</option>
          <option value="UNPAID">Chưa đóng</option>
          <option value="DEPOSIT_PAID">Đã cọc</option>
          <option value="COMPLETED">Đã xong</option>
        </select>
      </div>
    </div>
  );
}

