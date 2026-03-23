"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarCheck, X } from "lucide-react";
import { toast } from "sonner";

import { closeWorkBatchAction } from "@/features/work-batches/actions/workBatchActions";
import type { BatchStatus, PaymentStatus } from "@prisma/client";

type UnpaidPreviewRow = {
  id: number;
  name: string;
  paymentStatus: PaymentStatus;
  amountText: string;
  totalPaidText: string;
  remainingText: string;
};

function todayInputValue() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function WorkBatchCloseModal(props: {
  open: boolean;
  batchId: number | null;
  batchName?: string;
  status?: BatchStatus;
  onClose: () => void;
  onBlockedViewUnpaid?: () => void;
  onClosed?: () => void;
}) {
  const { open, batchId, batchName, onClose, onBlockedViewUnpaid, onClosed } = props;
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [closeDate, setCloseDate] = useState(todayInputValue());
  const [blocked, setBlocked] = useState<null | { unpaidCount: number; unpaidPreview: UnpaidPreviewRow[] }>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setBlocked(null);
      setCloseDate(todayInputValue());
      document.body.style.overflow = "hidden";
    } else {
      const timer = setTimeout(() => setMounted(false), 200);
      document.body.style.overflow = "unset";
      return () => clearTimeout(timer);
    }
  }, [open]);

  const title = blocked ? "Không thể đóng đợt" : "Đóng đợt làm?";
  const subtitle = useMemo(() => {
    if (blocked) return `Không thể đóng vì còn ${blocked.unpaidCount} job chưa thanh toán đủ.`;
    return "Bạn chỉ có thể đóng khi tất cả job trong đợt đã thanh toán đủ.";
  }, [blocked]);

  if (!mounted && !open) return null;

  async function handleClose() {
    if (!batchId) return;
    if (!closeDate) return;
    setIsSubmitting(true);
    try {
      const res = await closeWorkBatchAction(batchId, { closeDate });
      if (!res.success) {
        if (res.error === "CLOSE_BLOCKED_UNPAID") {
          const details = res as {
            unpaidCount?: number;
            unpaidPreview?: UnpaidPreviewRow[];
          };
          const unpaidCount = details.unpaidCount ?? 0;
          const unpaidPreview = details.unpaidPreview ?? [];
          setBlocked({ unpaidCount, unpaidPreview });
          return;
        }
        toast.error(res.error);
        return;
      }
      toast.success("Đã đóng đợt");
      onClosed?.();
      onClose();
    } catch (error) {
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
        className={`relative mx-auto w-full max-w-2xl rounded-[2rem] bg-white shadow-2xl border border-moss-100 overflow-hidden transition-all duration-200 ease-out ${
          open ? "translate-y-0 scale-100" : "translate-y-6 scale-[0.98]"
        }`}
      >
        <div className="flex items-start justify-between gap-4 p-8 pb-6 border-b border-moss-50">
          <div>
            <p className="text-xs font-extrabold text-moss-400 tracking-wide">Đợt làm</p>
            <h2 className="text-2xl font-black text-moss-900 tracking-tight mt-1">{title}</h2>
            <p className={`text-sm mt-2 ${blocked ? "text-sand-700" : "text-moss-500"}`}>{subtitle}</p>
            {batchName ? (
              <p className="text-xs text-moss-400 font-bold uppercase tracking-[0.2em] mt-3">
                Đợt: <span className="text-moss-700">{batchName}</span>
              </p>
            ) : null}
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
          {!blocked ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-moss-600 uppercase tracking-[0.2em] flex items-center gap-2">
                  <CalendarCheck className="size-4" />
                  Ngày đóng
                </label>
                <input
                  type="date"
                  value={closeDate}
                  onChange={(e) => setCloseDate(e.target.value)}
                  className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-4 text-moss-900 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                />
              </div>
              <div className="rounded-2xl border border-moss-100 bg-moss-50/30 p-5">
                <p className="text-xs font-black text-moss-600 uppercase tracking-[0.2em]">Chính sách</p>
                <p className="text-sm text-moss-600 mt-2 leading-relaxed">
                  Sau khi đóng, bạn không thể thay đổi danh sách job trong đợt (theo policy).
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-sand-100 bg-sand-50 p-6">
              <p className="text-xs font-black text-sand-700 uppercase tracking-[0.2em]">Preview job chưa thanh toán</p>
              <div className="mt-4 space-y-3">
                {blocked.unpaidPreview.map((j) => (
                  <div key={j.id} className="flex items-start justify-between gap-4 rounded-2xl bg-white p-4 border border-sand-100">
                    <div className="min-w-0">
                      <p className="font-bold text-moss-900 truncate">{j.name}</p>
                      <p className="text-xs text-moss-500 mt-1">
                        Trạng thái thanh toán: <span className="font-bold text-sand-700">{j.paymentStatus}</span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-moss-500">Còn lại</p>
                      <p className="font-black text-sand-700">{j.remainingText}</p>
                      <p className="text-[10px] text-moss-400 mt-1">
                        {j.totalPaidText} / {j.amountText}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-6 py-4 rounded-2xl border border-moss-200 text-moss-600 font-black uppercase tracking-[0.2em] text-xs transition-all hover:bg-moss-50 disabled:opacity-50"
            >
              Huỷ
            </button>
            {blocked ? (
              <button
                type="button"
                onClick={() => {
                  onBlockedViewUnpaid?.();
                  onClose();
                }}
                className="flex-1 px-6 py-4 rounded-2xl bg-sand-500 text-white font-black uppercase tracking-[0.2em] text-xs shadow-lg hover:bg-sand-600 transition-all"
              >
                Xem danh sách job chưa thanh toán
              </button>
            ) : (
              <button
                type="button"
                disabled={!batchId || !closeDate || isSubmitting}
                onClick={handleClose}
                className="flex-1 px-6 py-4 rounded-2xl bg-coral-500 text-white font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-coral-500/10 hover:bg-coral-600 transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Đang đóng…" : "Đóng đợt"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(content, document.body) : null;
}

