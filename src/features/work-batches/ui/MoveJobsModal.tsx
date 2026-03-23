"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { toast } from "sonner";

import type { WorkBatchOptionDTO } from "@/features/work-batches/model/workBatchTypes";
import { getOpenWorkBatchOptionsAction, moveJobsToAnotherBatchAction } from "@/features/work-batches/actions/workBatchActions";

export function MoveJobsModal(props: {
  open: boolean;
  sourceBatchId: number | null;
  sourceBatchName?: string;
  jobIds: number[];
  onClose: () => void;
  onDone?: () => void;
}) {
  const { open, sourceBatchId, sourceBatchName, jobIds, onClose, onDone } = props;
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [options, setOptions] = useState<WorkBatchOptionDTO[]>([]);
  const [targetId, setTargetId] = useState<number | "">("");

  useEffect(() => {
    if (!open) return;
    setMounted(true);
    document.body.style.overflow = "hidden";
    setTargetId("");

    async function load() {
      if (!sourceBatchId) return;
      setIsLoading(true);
      try {
        const res = await getOpenWorkBatchOptionsAction(sourceBatchId);
        if (!res.success) {
          toast.error(res.error || "Không thể tải danh sách đợt làm");
          setOptions([]);
          return;
        }
        if (!res.data) {
          toast.error("Không thể tải danh sách đợt làm");
          setOptions([]);
          return;
        }
        setOptions(res.data);
      } catch {
        toast.error("Lỗi hệ thống");
        setOptions([]);
      } finally {
        setIsLoading(false);
      }
    }

    void load();

    return () => {
      document.body.style.overflow = "unset";
      setTimeout(() => setMounted(false), 200);
    };
  }, [open, sourceBatchId]);

  const canSubmit = Boolean(sourceBatchId) && jobIds.length > 0 && targetId !== "" && !isSubmitting;

  const targetName = useMemo(() => {
    if (targetId === "") return null;
    return options.find((o) => o.id === targetId)?.name ?? null;
  }, [options, targetId]);

  async function handleSubmit() {
    if (!canSubmit) return;
    if (!sourceBatchId) return;

    setIsSubmitting(true);
    try {
      const res = await moveJobsToAnotherBatchAction({
        sourceBatchId,
        targetBatchId: targetId,
        jobIds,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success("Đã chuyển job sang đợt khác");
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
        className={`relative mx-auto w-full max-w-2xl rounded-[2rem] bg-white shadow-2xl border border-moss-100 overflow-hidden transition-all duration-200 ease-out ${
          open ? "translate-y-0 scale-100" : "translate-y-6 scale-[0.98]"
        }`}
      >
        <div className="flex items-start justify-between gap-4 p-8 pb-6 border-b border-moss-50">
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-moss-400 tracking-wide">Chuyển job</p>
            <h2 className="text-2xl font-black text-moss-900 tracking-tight mt-1">Chuyển job sang đợt khác</h2>
            <p className="text-sm text-moss-500 mt-2">
              Bạn sẽ chuyển <span className="font-black text-moss-900">{jobIds.length}</span> job từ{" "}
              <span className="font-black text-moss-900">{sourceBatchName ?? "đợt hiện tại"}</span>
              {targetName ? (
                <>
                  {" "}
                  → <span className="font-black text-primary">{targetName}</span>
                </>
              ) : null}
              .
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
          <div className="space-y-2">
            <label className="text-xs font-black text-moss-600 uppercase tracking-[0.2em]">Đợt đích (OPEN)</label>
            <div className="relative">
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value ? Number(e.target.value) : "")}
                className="w-full appearance-none rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-4 text-moss-900 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                disabled={isLoading}
              >
                <option value="">{isLoading ? "Đang tải..." : "Chọn đợt đích"}</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 size-5 text-moss-400" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-4 rounded-2xl border border-moss-200 text-moss-600 font-black uppercase tracking-[0.2em] text-xs transition-all hover:bg-moss-50 disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!canSubmit}
              className="flex-1 px-6 py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Đang chuyển…" : "Chuyển đợt"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(content, document.body) : null;
}

