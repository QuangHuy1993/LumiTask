"use client";

import React, { useMemo } from "react";
import { ArrowRightLeft, Filter, Trash2 } from "lucide-react";

import type { WorkBatchJobRowDTO } from "@/features/work-batches/model/workBatchTypes";

type JobStatusFilter = "ALL" | WorkBatchJobRowDTO["status"];

function PaymentBadge({ paymentStatus, isPaid }: { paymentStatus: WorkBatchJobRowDTO["paymentStatus"]; isPaid: boolean }) {
  const ok = isPaid || paymentStatus === "COMPLETED";
  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-[0.2em] ${
        ok ? "bg-primary/10 border-primary/20 text-primary" : "bg-sand-50 border-sand-100 text-sand-700"
      }`}
      title={ok ? "Đã thanh toán đủ" : "Chưa thanh toán đủ"}
    >
      {ok ? "ĐÃ THU" : "CHƯA THU"}
    </span>
  );
}

export function WorkBatchJobsTable(props: {
  jobs: WorkBatchJobRowDTO[];
  filter: {
    search: string;
    unpaidOnly: boolean;
    client: string;
    jobStatus: JobStatusFilter;
  };
  selectedIds: Set<number>;
  onToggleSelected: (id: number) => void;
  onToggleAllVisible: (ids: number[], nextChecked: boolean) => void;
  onBulkRemove: () => void;
  onBulkMove: () => void;
}) {
  const { jobs, filter, selectedIds, onToggleSelected, onToggleAllVisible, onBulkMove, onBulkRemove } = props;

  const visible = useMemo(() => {
    const term = filter.search.trim().toLowerCase();
    let list = [...jobs];

    if (term) {
      list = list.filter((j) => {
        const hay = `${j.name} ${j.clientName ?? ""} ${j.subjectName ?? ""}`.toLowerCase();
        return hay.includes(term);
      });
    }

    if (filter.unpaidOnly) {
      list = list.filter((j) => !(j.isPaid || j.paymentStatus === "COMPLETED"));
    }

    if (filter.client) {
      list = list.filter((j) => (j.clientName ?? "") === filter.client);
    }

    if (filter.jobStatus !== "ALL") {
      list = list.filter((j) => j.status === filter.jobStatus);
    }

    return list;
  }, [filter.client, filter.jobStatus, filter.search, filter.unpaidOnly, jobs]);

  const visibleIds = visible.map((j) => j.id);
  const visibleSelectedCount = visibleIds.filter((id) => selectedIds.has(id)).length;
  const allVisibleSelected = visibleIds.length > 0 && visibleSelectedCount === visibleIds.length;

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 ? (
        <div className="rounded-3xl border border-primary/15 bg-primary/5 p-5 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
              <Filter className="size-5" />
            </div>
            <div>
              <p className="font-black text-moss-900">
                Đã chọn <span className="text-primary">{selectedIds.size}</span> job
              </p>
              <p className="text-sm text-moss-600">Bạn có thể gỡ khỏi đợt hoặc chuyển sang đợt khác.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onBulkRemove}
              className="px-5 py-3 rounded-2xl bg-white border border-coral-100 text-coral-600 font-black uppercase tracking-[0.2em] text-xs hover:bg-coral-50 transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="size-4" />
              Gỡ khỏi đợt
            </button>
            <button
              onClick={onBulkMove}
              className="px-5 py-3 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
            >
              <ArrowRightLeft className="size-4" />
              Chuyển đợt…
            </button>
          </div>
        </div>
      ) : null}

      <div className="bg-white rounded-3xl shadow-card border border-moss-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-moss-50/60 border-b border-moss-100">
              <tr className="text-left">
                <th className="px-6 py-4 w-[52px]">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={(e) => onToggleAllVisible(visibleIds, e.target.checked)}
                    className="size-4 rounded border-moss-200 text-primary focus:ring-primary/20"
                    aria-label="Chọn tất cả"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-moss-500">Job</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-moss-500">Khách / Môn</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-moss-500">Trạng thái</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-moss-500">Thanh toán</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-moss-500">Tổng / Đã thu / Còn lại</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-moss-500">Hạn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-moss-50">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-moss-500 font-bold">
                    Không có job phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                visible.map((j) => {
                  const checked = selectedIds.has(j.id);
                  const hasUnpaid = !(j.isPaid || j.paymentStatus === "COMPLETED");
                  return (
                    <tr key={j.id} className="hover:bg-moss-50/50 transition-colors">
                      <td className="px-6 py-5 align-top">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onToggleSelected(j.id)}
                          className="size-4 rounded border-moss-200 text-primary focus:ring-primary/20"
                          aria-label={`Chọn job ${j.name}`}
                        />
                      </td>
                      <td className="px-6 py-5 align-top">
                        <p className="font-black text-moss-900">{j.name}</p>
                      </td>
                      <td className="px-6 py-5 align-top">
                        <p className="text-sm font-bold text-moss-900">{j.clientName ?? "—"}</p>
                        <p className="text-xs text-moss-500 mt-1">{j.subjectName ?? "—"}</p>
                      </td>
                      <td className="px-6 py-5 align-top">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-moss-50 border border-moss-100 text-[10px] font-black uppercase tracking-[0.2em] text-moss-600">
                          {j.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 align-top">
                        <PaymentBadge paymentStatus={j.paymentStatus} isPaid={j.isPaid} />
                        {hasUnpaid ? (
                          <p className="text-[10px] text-sand-700 font-extrabold mt-2 tracking-wide">CẦN XỬ LÝ</p>
                        ) : null}
                      </td>
                      <td className="px-6 py-5 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-moss-400 font-bold">Tổng</span>
                            <span className="text-sm font-black text-moss-900">{j.amountText}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-moss-400 font-bold">Đã thu</span>
                            <span className="text-sm font-black text-primary">{j.totalPaidText}</span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-xs text-moss-400 font-bold">Còn lại</span>
                            <span className={`text-sm font-black ${hasUnpaid ? "text-sand-700" : "text-moss-700"}`}>
                              {j.remainingText}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 align-top">
                        <span className="text-sm font-bold text-moss-700">{j.deadline ? j.deadline.slice(0, 10) : "—"}</span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

