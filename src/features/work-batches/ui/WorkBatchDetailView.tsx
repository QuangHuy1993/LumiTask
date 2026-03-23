"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarRange, FileText, Filter, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import type { WorkBatchDetailDTO } from "@/features/work-batches/model/workBatchTypes";
import { WorkBatchJobsTable } from "@/features/work-batches/ui/WorkBatchJobsTable";
import { WorkBatchCloseModal } from "@/features/work-batches/ui/WorkBatchCloseModal";
import { WorkBatchFormModal } from "@/features/work-batches/ui/WorkBatchFormModal";
import { AddJobsModal } from "@/features/work-batches/ui/AddJobsModal";
import { MoveJobsModal } from "@/features/work-batches/ui/MoveJobsModal";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { removeJobsFromBatchAction, reopenWorkBatchAction } from "@/features/work-batches/actions/workBatchActions";

export function WorkBatchDetailView(props: { initial: WorkBatchDetailDTO }) {
  const [data, setData] = useState<WorkBatchDetailDTO>(props.initial);

  const [search, setSearch] = useState("");
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [client, setClient] = useState("");
  const [jobStatus, setJobStatus] = useState<"ALL" | WorkBatchDetailDTO["jobs"][number]["status"]>("ALL");

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [editOpen, setEditOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [addJobsOpen, setAddJobsOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);

  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const clientOptions = useMemo(() => {
    const s = new Set<string>();
    for (const j of data.jobs) {
      if (j.clientName) s.add(j.clientName);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [data.jobs]);

  const statusOptions = useMemo(() => {
    const s = new Set<WorkBatchDetailDTO["jobs"][number]["status"]>();
    for (const j of data.jobs) s.add(j.status);
    return Array.from(s);
  }, [data.jobs]);

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function toggleSelected(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible(ids: number[], nextChecked: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (nextChecked) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });
  }

  async function handleReopen() {
    setIsBusy(true);
    try {
      const res = await reopenWorkBatchAction(data.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      setData((p) => ({ ...p, status: "OPEN" }));
      toast.success("Đã mở lại đợt");
    } catch (e) {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleBulkRemove() {
    if (selectedIds.size === 0) return;
    setRemoveConfirmOpen(true);
  }

  async function handleConfirmRemove() {
    if (selectedIds.size === 0) return;
    setIsBusy(true);
    try {
      const res = await removeJobsFromBatchAction({ batchId: data.id, jobIds: Array.from(selectedIds) });
      if (!res.success) {
        if (res.error === "BATCH_CLOSED") toast.error("Đợt đã đóng");
        else toast.error(res.error);
        return;
      }
      toast.success("Đã gỡ job khỏi đợt");
      window.location.reload();
    } catch (e) {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsBusy(false);
      setRemoveConfirmOpen(false);
      clearSelection();
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-10 animate-fade-in-up">
      {/* Breadcrumb + Header */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 text-sm font-bold text-moss-500">
          <Link href="/jobs" className="hover:text-primary transition-colors">
            Jobs
          </Link>
          <span className="text-moss-300">→</span>
          <Link href="/jobs/work-batches" className="hover:text-primary transition-colors">
            Work Batches
          </Link>
          <span className="text-moss-300">→</span>
          <span className="text-moss-700">{data.name}</span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-4">
              <Link
                href="/jobs/work-batches"
                className="p-2 rounded-2xl border border-moss-100 bg-white text-moss-600 hover:bg-moss-50 transition-colors"
                aria-label="Quay lại"
              >
                <ArrowLeft className="size-5" />
              </Link>
              <div>
                <h1 className="text-4xl font-black text-moss-900 tracking-tight">{data.name}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <span
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${
                      data.status === "OPEN"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-moss-50 text-moss-500 border-moss-100"
                    }`}
                  >
                    <span className={`size-2 rounded-full ${data.status === "OPEN" ? "bg-primary" : "bg-moss-300"}`} />
                    {data.status}
                  </span>
                  <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-moss-400">
                    <CalendarRange className="size-4" />
                    {data.startDate.slice(0, 10)} → {data.endDate ? data.endDate.slice(0, 10) : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {data.status === "OPEN" ? (
              <button
                onClick={() => setCloseOpen(true)}
                className="px-6 py-4 rounded-2xl bg-coral-500 text-white font-black uppercase tracking-[0.2em] text-xs shadow-lg hover:bg-coral-600 transition-colors"
              >
                Đóng đợt
              </button>
            ) : (
              <button
                onClick={() => void handleReopen()}
                disabled={isBusy}
                className="px-6 py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all disabled:opacity-50"
              >
                Mở lại đợt
              </button>
            )}
            <button
              onClick={() => setEditOpen(true)}
              className="px-6 py-4 rounded-2xl bg-white border border-moss-100 text-moss-700 font-black uppercase tracking-[0.2em] text-xs hover:bg-moss-50 transition-colors flex items-center justify-center gap-2"
            >
              <FileText className="size-4" />
              Sửa ghi chú
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-4 rounded-2xl bg-white border border-moss-100 text-moss-600 font-black uppercase tracking-[0.2em] text-xs hover:bg-moss-50 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="size-4" />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-3xl bg-white border border-moss-100 shadow-card p-8">
        <div className="flex flex-col lg:flex-row gap-8 justify-between">
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-moss-400">Ghi chú</p>
            <p className="text-moss-700 mt-3 leading-relaxed whitespace-pre-wrap">
              {data.note ? data.note : "—"}
            </p>
            {data.status === "OPEN" && data.unpaidJobCount > 0 ? (
              <div className="mt-6 rounded-2xl border border-sand-100 bg-sand-50 p-5">
                <p className="font-black text-sand-700">Còn {data.unpaidJobCount} job chưa thanh toán đủ.</p>
                <p className="text-sm text-moss-600 mt-1">
                  Bạn cần xử lý trước khi đóng đợt.
                </p>
                <button
                  onClick={() => setUnpaidOnly(true)}
                  className="mt-4 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-sand-500 text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-sand-600 transition-colors"
                >
                  <Filter className="size-4" />
                  Lọc job chưa thanh toán
                </button>
              </div>
            ) : null}
          </div>

          {/* KPI */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 w-full lg:w-[360px]">
            <div className="rounded-3xl border border-moss-100 bg-moss-50/40 p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-moss-400">Tổng job</p>
              <p className="text-3xl font-black text-moss-900 mt-2">{data.jobCount}</p>
            </div>
            <div className="rounded-3xl border border-sand-100 bg-sand-50 p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sand-700">Job chưa thanh toán</p>
              <p className="text-3xl font-black text-sand-700 mt-2">{data.unpaidJobCount}</p>
            </div>
            <div className="rounded-3xl border border-moss-100 bg-white p-6">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-moss-400">Tổng tiền</p>
              <p className="text-2xl font-black text-moss-900 mt-2">{data.totalAmountText}</p>
              <p className="text-sm text-moss-500 mt-1">Đã thu: <span className="font-black text-primary">{data.totalPaidText}</span></p>
              <p className="text-sm text-moss-500 mt-1">Còn lại: <span className="font-black text-sand-700">{data.remainingText}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs table toolbar */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div className="flex flex-col md:flex-row gap-3 w-full">
            <div className="relative flex-1 max-w-2xl group">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-moss-300 group-focus-within:text-primary transition-colors" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm job trong đợt…"
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-moss-100 shadow-sm font-bold text-moss-900 placeholder:text-moss-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
              />
            </div>
            <label className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-moss-500 bg-white border border-moss-100 rounded-2xl px-5 py-4 shadow-sm">
              <input
                type="checkbox"
                checked={unpaidOnly}
                onChange={(e) => setUnpaidOnly(e.target.checked)}
                className="size-4 rounded border-moss-200 text-primary focus:ring-primary/20"
              />
              Chỉ unpaid
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              disabled={data.status !== "OPEN"}
              onClick={() => setAddJobsOpen(true)}
              className="px-6 py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="size-5" />
              Thêm job vào đợt
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="px-4 py-3 rounded-2xl bg-white border border-moss-100 text-sm font-bold text-moss-700"
            >
              <option value="">Tất cả client</option>
              {clientOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={jobStatus}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "ALL") setJobStatus("ALL");
                else setJobStatus(v as WorkBatchDetailDTO["jobs"][number]["status"]);
              }}
              className="px-4 py-3 rounded-2xl bg-white border border-moss-100 text-sm font-bold text-moss-700"
            >
              <option value="ALL">Tất cả trạng thái job</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-moss-400">
            Tổng: {data.jobs.length} job
          </div>
        </div>
      </div>

      <WorkBatchJobsTable
        jobs={data.jobs}
        filter={{ search, unpaidOnly, client, jobStatus }}
        selectedIds={selectedIds}
        onToggleSelected={toggleSelected}
        onToggleAllVisible={toggleAllVisible}
        onBulkRemove={() => void handleBulkRemove()}
        onBulkMove={() => {
          if (selectedIds.size === 0) return;
          setMoveOpen(true);
        }}
      />

      <WorkBatchFormModal
        open={editOpen}
        mode="edit"
        initial={{
          id: data.id,
          name: data.name,
          status: data.status,
          startDate: data.startDate,
          endDate: data.endDate,
          note: data.note,
          jobCount: data.jobCount,
          unpaidJobCount: data.unpaidJobCount,
          totalAmountText: data.totalAmountText,
          totalPaidText: data.totalPaidText,
          remainingText: data.remainingText,
        }}
        onClose={() => setEditOpen(false)}
        onUpdated={(patch) => {
          setData((p) => ({ ...p, ...(patch.note !== undefined ? { note: patch.note ?? null } : {}), name: patch.name ?? p.name }));
          window.location.reload();
        }}
      />

      <WorkBatchCloseModal
        open={closeOpen}
        batchId={data.id}
        batchName={data.name}
        status={data.status}
        onClose={() => setCloseOpen(false)}
        onClosed={() => window.location.reload()}
        onBlockedViewUnpaid={() => setUnpaidOnly(true)}
      />

      <AddJobsModal
        open={addJobsOpen}
        batchId={data.id}
        batchName={data.name}
        onClose={() => setAddJobsOpen(false)}
        onDone={() => window.location.reload()}
      />

      <MoveJobsModal
        open={moveOpen}
        sourceBatchId={data.id}
        sourceBatchName={data.name}
        jobIds={Array.from(selectedIds)}
        onClose={() => setMoveOpen(false)}
        onDone={() => {
          clearSelection();
          window.location.reload();
        }}
      />

      <ConfirmationDialog
        isOpen={removeConfirmOpen}
        onClose={() => {
          if (isBusy) return;
          setRemoveConfirmOpen(false);
        }}
        onConfirm={() => void handleConfirmRemove()}
        title="Gỡ job khỏi đợt?"
        description={`Bạn sẽ gỡ ${selectedIds.size} job khỏi đợt. Bạn có thể gán lại job vào đợt khác sau.`}
        confirmText="Gỡ khỏi đợt"
        variant="warning"
        isLoading={isBusy}
      />
    </div>
  );
}

