"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Search, X } from "lucide-react";
import { toast } from "sonner";

import type { AssignableJobDTO } from "@/features/work-batches/model/workBatchTypes";
import { addJobsToBatchAction, getAssignableJobsAction } from "@/features/work-batches/actions/workBatchActions";

export function AddJobsModal(props: {
  open: boolean;
  batchId: number | null;
  batchName?: string;
  onClose: () => void;
  onDone?: () => void;
}) {
  const { open, batchId, batchName, onClose, onDone } = props;
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [jobs, setJobs] = useState<AssignableJobDTO[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setMounted(true);
    document.body.style.overflow = "hidden";
    setSelected(new Set());
    setSearch("");
    setError(null);

    async function load() {
      if (!batchId) return;
      setIsLoading(true);
      try {
        const res = await getAssignableJobsAction(batchId);
        if (!res.success) {
          setError(res.error || "Không thể tải danh sách job");
          setJobs([]);
          return;
        }
        if (!res.data) {
          setError("Không thể tải danh sách job");
          setJobs([]);
          return;
        }
        setJobs(res.data);
      } catch {
        setError("Lỗi hệ thống");
        setJobs([]);
      } finally {
        setIsLoading(false);
      }
    }

    void load();

    return () => {
      document.body.style.overflow = "unset";
      setTimeout(() => setMounted(false), 200);
    };
  }, [batchId, open]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return jobs;
    return jobs.filter((j) => {
      const hay = `${j.name} ${j.clientName ?? ""} ${j.subjectName ?? ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [jobs, search]);

  const selectedCount = selected.size;
  const selectedOverLimit = selectedCount > 200;

  async function handleSubmit() {
    if (!batchId) return;
    if (selectedCount === 0) return;
    if (selectedOverLimit) return;

    setIsSubmitting(true);
    try {
      const res = await addJobsToBatchAction({ batchId, jobIds: Array.from(selected) });
      if (!res.success) {
        if (res.error === "BATCH_CLOSED") toast.error("Đợt đã đóng");
        else toast.error(res.error);
        return;
      }
      toast.success("Đã thêm job vào đợt");
      onDone?.();
      onClose();
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!mounted && !open) return null;

  const content = (
    <div className={`fixed inset-0 z-[9999] p-4 transition-all duration-200 ${open ? "opacity-100" : "opacity-0"}`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative mx-auto w-full max-w-5xl rounded-[2rem] bg-white shadow-2xl border border-moss-100 overflow-hidden transition-all duration-200 ease-out ${
          open ? "translate-y-0 scale-100" : "translate-y-6 scale-[0.98]"
        }`}
      >
        <div className="flex items-start justify-between gap-4 p-8 pb-6 border-b border-moss-50">
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-moss-400 tracking-wide">Thêm job</p>
            <h2 className="text-2xl font-black text-moss-900 tracking-tight mt-1 truncate">
              Thêm job vào đợt{batchName ? `: ${batchName}` : ""}
            </h2>
            <p className="text-sm text-moss-500 mt-2">
              Chọn tối đa 200 job/lần. Đã chọn <span className="font-black text-moss-900">{selectedCount}/200</span>.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-2xl text-moss-400 hover:text-moss-700 hover:bg-moss-50 transition-colors"
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="relative flex-1 max-w-2xl group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-moss-300 group-focus-within:text-primary transition-colors" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm job theo tên, client, subject…"
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-moss-100 shadow-sm font-bold text-moss-900 placeholder:text-moss-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="px-4 py-3 rounded-2xl bg-white border border-moss-100 text-moss-600 font-black uppercase tracking-[0.2em] text-xs hover:bg-moss-50 transition-colors"
              >
                Bỏ chọn
              </button>
              <button
                type="button"
                disabled={!batchId || selectedCount === 0 || selectedOverLimit || isSubmitting}
                onClick={() => void handleSubmit()}
                className="px-6 py-3 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Đang thêm…" : "Thêm vào đợt"}
              </button>
            </div>
          </div>

          {selectedOverLimit ? (
            <div className="rounded-2xl border border-coral-100 bg-coral-50 p-4 text-coral-700 font-bold">
              Bạn đã chọn vượt quá giới hạn 200 job/lần.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-coral-100 bg-coral-50 p-4 text-coral-700 font-bold">{error}</div>
          ) : null}

          <div className="rounded-3xl border border-moss-100 overflow-hidden">
            <div className="max-h-[52vh] overflow-y-auto">
              {isLoading ? (
                <div className="p-10 text-center text-moss-500 font-bold">Đang tải danh sách job…</div>
              ) : filtered.length === 0 ? (
                <div className="p-10 text-center text-moss-500 font-bold">Không có job phù hợp để thêm.</div>
              ) : (
                <div className="divide-y divide-moss-50">
                  {filtered.map((j) => {
                    const checked = selected.has(j.id);
                    return (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(j.id)) next.delete(j.id);
                            else next.add(j.id);
                            return next;
                          });
                        }}
                        className="w-full text-left p-5 hover:bg-moss-50/60 transition-colors flex items-start gap-4"
                      >
                        <div
                          className={`mt-0.5 size-6 rounded-xl border flex items-center justify-center shrink-0 ${
                            checked ? "bg-primary border-primary text-white" : "bg-white border-moss-200 text-transparent"
                          }`}
                          aria-hidden="true"
                        >
                          <Check className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-moss-900 truncate">{j.name}</p>
                          <p className="text-xs text-moss-500 mt-1 truncate">
                            {j.clientName ? j.clientName : "—"} · {j.subjectName ? j.subjectName : "—"}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-moss-500">Còn lại</p>
                          <p className="font-black text-moss-900">{j.remainingText}</p>
                          <p className="text-[10px] text-moss-400 mt-1">
                            {j.totalPaidText} / {j.amountText}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(content, document.body) : null;
}

