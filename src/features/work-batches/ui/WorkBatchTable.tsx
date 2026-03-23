"use client";

import React from "react";
import Link from "next/link";
import { MoreVertical } from "lucide-react";

import type { WorkBatchListItemDTO } from "@/features/work-batches/model/workBatchTypes";

function StatusBadge({ status }: { status: WorkBatchListItemDTO["status"] }) {
  const isOpen = status === "OPEN";
  return (
    <span
      title={isOpen ? "Đợt đang mở" : "Đợt đã đóng"}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${
        isOpen
          ? "bg-primary/10 text-primary border-primary/20"
          : "bg-moss-50 text-moss-500 border-moss-100"
      }`}
    >
      <span className={`size-2 rounded-full ${isOpen ? "bg-primary" : "bg-moss-300"}`} />
      {status}
    </span>
  );
}

function DateRange({ startDate, endDate }: { startDate: string; endDate: string | null }) {
  const s = startDate.slice(0, 10);
  const e = endDate ? endDate.slice(0, 10) : "—";
  return (
    <div className="text-sm font-bold text-moss-900">
      <span>{s}</span>
      <span className="mx-2 text-moss-300">→</span>
      <span className="text-moss-600">{e}</span>
    </div>
  );
}

export function WorkBatchTable(props: {
  items: WorkBatchListItemDTO[];
  onEdit: (row: WorkBatchListItemDTO) => void;
  onClose: (row: WorkBatchListItemDTO) => void;
  onReopen: (row: WorkBatchListItemDTO) => void;
  onDelete: (row: WorkBatchListItemDTO) => void;
}) {
  const { items, onEdit, onClose, onReopen, onDelete } = props;

  return (
    <div className="bg-white rounded-3xl shadow-card border border-moss-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-moss-50/60 border-b border-moss-100">
            <tr className="text-left">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-moss-500">
                Tên đợt
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-moss-500">
                Status
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-moss-500">
                Thời gian
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-moss-500">
                Jobs
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-moss-500">
                Unpaid
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-moss-500">
                Tổng / Đã thu / Còn lại
              </th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-moss-500 w-[120px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-moss-50">
            {items.map((row) => {
              const hasUnpaid = row.unpaidJobCount > 0;
              return (
                <tr key={row.id} className="hover:bg-moss-50/50 transition-colors">
                  <td className="px-6 py-5 align-top">
                    <Link
                      href={`/jobs/work-batches/${row.id}`}
                      className="block font-black text-moss-900 hover:text-primary transition-colors"
                    >
                      {row.name}
                    </Link>
                    {row.note ? <p className="text-xs text-moss-500 mt-2 line-clamp-2">{row.note}</p> : null}
                  </td>
                  <td className="px-6 py-5 align-top">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-6 py-5 align-top">
                    <DateRange startDate={row.startDate} endDate={row.endDate} />
                  </td>
                  <td className="px-6 py-5 align-top">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-moss-50 border border-moss-100 text-xs font-black text-moss-700">
                      {row.jobCount}
                    </span>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <span
                      className={`inline-flex items-center px-3 py-1.5 rounded-full border text-xs font-black ${
                        hasUnpaid
                          ? "bg-sand-50 border-sand-100 text-sand-700"
                          : "bg-moss-50 border-moss-100 text-moss-500"
                      }`}
                      title={hasUnpaid ? "Còn job chưa thanh toán đủ" : "Không còn job unpaid"}
                    >
                      {row.unpaidJobCount}
                    </span>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-moss-400 font-bold">Tổng</span>
                        <span className="text-sm font-black text-moss-900">{row.totalAmountText}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-moss-400 font-bold">Đã thu</span>
                        <span className="text-sm font-black text-primary">{row.totalPaidText}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-moss-400 font-bold">Còn lại</span>
                        <span className={`text-sm font-black ${hasUnpaid ? "text-sand-700" : "text-moss-700"}`}>
                          {row.remainingText}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 align-top">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEdit(row)}
                        className="px-3 py-2 rounded-xl border border-moss-100 text-moss-600 hover:bg-moss-50 transition-colors text-xs font-black uppercase tracking-[0.15em]"
                      >
                        Sửa
                      </button>
                      {row.status === "OPEN" ? (
                        <button
                          onClick={() => onClose(row)}
                          className="px-3 py-2 rounded-xl border border-coral-100 bg-coral-50 text-coral-600 hover:bg-coral-50/80 transition-colors text-xs font-black uppercase tracking-[0.15em]"
                        >
                          Đóng
                        </button>
                      ) : (
                        <button
                          onClick={() => onReopen(row)}
                          className="px-3 py-2 rounded-xl border border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 transition-colors text-xs font-black uppercase tracking-[0.15em]"
                        >
                          Mở lại
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(row)}
                        className="p-2 rounded-xl border border-moss-100 text-moss-400 hover:text-moss-700 hover:bg-moss-50 transition-colors"
                        aria-label="Mở menu"
                        title="Tác vụ khác"
                      >
                        <MoreVertical className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

