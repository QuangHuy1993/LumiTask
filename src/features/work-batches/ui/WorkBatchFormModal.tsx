"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, FileText, Save, X } from "lucide-react";
import { toast } from "sonner";

import { createWorkBatchAction, updateWorkBatchAction } from "@/features/work-batches/actions/workBatchActions";
import type { WorkBatchListItemDTO } from "@/features/work-batches/model/workBatchTypes";

type Mode = "create" | "edit";

type FormState = {
  name: string;
  startDate: string;
  note: string;
};

function todayInputValue() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function WorkBatchFormModal(props: {
  open: boolean;
  mode: Mode;
  initial?: WorkBatchListItemDTO | null;
  onClose: () => void;
  onCreated?: (created: WorkBatchListItemDTO) => void;
  onUpdated?: (patch: Partial<WorkBatchListItemDTO> & { id: number }) => void;
}) {
  const { open, mode, initial, onClose, onCreated, onUpdated } = props;
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialForm: FormState = useMemo(() => {
    if (mode === "edit" && initial) {
      return {
        name: initial.name,
        startDate: initial.startDate.slice(0, 10),
        note: initial.note ?? "",
      };
    }
    return { name: "", startDate: todayInputValue(), note: "" };
  }, [initial, mode]);

  const [form, setForm] = useState<FormState>(initialForm);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setForm(initialForm);
      document.body.style.overflow = "hidden";
    } else {
      const timer = setTimeout(() => setMounted(false), 200);
      document.body.style.overflow = "unset";
      return () => clearTimeout(timer);
    }
  }, [open, initialForm]);

  if (!mounted && !open) return null;

  const title = mode === "create" ? "Tạo đợt làm" : "Sửa đợt làm";
  const primaryText = mode === "create" ? "Tạo" : "Lưu";

  const canSubmit = form.name.trim().length >= 2 && Boolean(form.startDate) && !isSubmitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      if (mode === "create") {
        const res = await createWorkBatchAction({
          name: form.name,
          startDate: form.startDate,
          note: form.note,
        });
        if (!res.success) {
          if (res.error === "DUPLICATE_BATCH_NAME") toast.error("Tên đợt đã tồn tại.");
          else toast.error(typeof res.error === "string" ? res.error : "Lỗi hệ thống. Vui lòng thử lại.");
          return;
        }
        if (!res.data) {
          toast.error("Không thể tạo đợt làm. Vui lòng thử lại.");
          return;
        }

        const created: WorkBatchListItemDTO = {
          id: res.data.id,
          name: form.name.trim(),
          status: "OPEN",
          startDate: new Date(form.startDate).toISOString(),
          endDate: null,
          note: form.note.trim() || null,
          jobCount: 0,
          unpaidJobCount: 0,
          totalAmountText: "0 ₫",
          totalPaidText: "0 ₫",
          remainingText: "0 ₫",
        };
        onCreated?.(created);
        toast.success("Đã tạo đợt làm");
        onClose();
      } else {
        if (!initial) return;
        const res = await updateWorkBatchAction(initial.id, {
          name: form.name,
          startDate: form.startDate,
          note: form.note,
        });
        if (!res.success) {
          if (res.error === "DUPLICATE_BATCH_NAME") toast.error("Tên đợt đã tồn tại.");
          else toast.error(typeof res.error === "string" ? res.error : "Lỗi hệ thống. Vui lòng thử lại.");
          return;
        }
        onUpdated?.({
          id: initial.id,
          name: form.name.trim(),
          startDate: new Date(form.startDate).toISOString(),
          note: form.note.trim() || null,
        });
        toast.success("Đã lưu thay đổi");
        onClose();
      }
    } catch {
      toast.error("Lỗi hệ thống. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const content = (
    <div className={`fixed inset-0 z-[9999] p-4 transition-all duration-200 ${open ? "opacity-100" : "opacity-0"}`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative mx-auto w-full max-w-xl rounded-[2rem] bg-white shadow-2xl border border-moss-100 overflow-hidden transition-all duration-200 ease-out ${
          open ? "translate-y-0 scale-100" : "translate-y-6 scale-[0.98]"
        }`}
      >
        <div className="flex items-start justify-between gap-4 p-8 pb-6 border-b border-moss-50">
          <div>
            <p className="text-xs font-extrabold text-moss-400 tracking-wide">Đợt làm</p>
            <h2 className="text-2xl font-black text-moss-900 tracking-tight mt-1">{title}</h2>
            <p className="text-sm text-moss-500 mt-2">
              Nhóm job theo đợt để chốt sổ và theo dõi thu tiền.
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

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-moss-600 uppercase tracking-[0.2em]">Tên đợt</label>
            <input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-4 text-moss-900 font-bold placeholder:text-moss-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
              placeholder="Ví dụ: Đợt tháng 03/2026"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-moss-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <Calendar className="size-4" />
                Ngày bắt đầu
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
                tabIndex={-1}
                className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-4 text-moss-900 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-moss-600 uppercase tracking-[0.2em] flex items-center gap-2">
              <FileText className="size-4" />
              Ghi chú (tuỳ chọn)
            </label>
            <textarea
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              className="w-full min-h-[110px] resize-none rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-4 text-moss-900 font-medium placeholder:text-moss-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
              placeholder="Ghi chú nhanh để nhớ mục tiêu/điểm nhấn của đợt…"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-4 rounded-2xl border border-moss-200 text-moss-600 font-black uppercase tracking-[0.2em] text-xs transition-all hover:bg-moss-50 disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="flex-1 px-6 py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="size-4" />
              {isSubmitting ? "Đang lưu…" : primaryText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(content, document.body) : null;
}

