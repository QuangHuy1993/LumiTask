"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, FileText, Save, X } from "lucide-react";
import { toast } from "sonner";

import type { JobFormInput, JobDetailDTO } from "@/features/jobs/model/jobTypes";
import { createJobAction, updateJobAction } from "@/features/jobs/actions/jobActions";
import { ClientCombobox } from "@/features/jobs/ui/ClientCombobox";
import { SubjectCombobox } from "@/features/jobs/ui/SubjectCombobox";

type Mode = "create" | "edit";

type JobFormModalProps = {
  open: boolean;
  mode: Mode;
  initial?: JobDetailDTO | null;
  formOptions: {
    clients: { id: number; name: string; phone?: string | null }[];
    subjects: { id: number; name: string }[];
    batches: { id: number; name: string }[];
  };
  onClose: () => void;
  onCreated?: (createdId: number) => void;
  onUpdated?: () => void;
  onRequestOpenQr?: (jobId: number) => void;
  onClientCreated?: (client: { id: number; name: string; phone?: string | null }) => void;
  onSubjectCreated?: (subject: { id: number; name: string }) => void;
};

function toInputDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function sanitizeMoneyInput(prev: string, nextRaw: string): string {
  const digits = nextRaw.replace(/[^\d]/g, "");
  if (!digits) return "0";

  // If currently "0", treat typing as replacement (avoid "05")
  let normalized = prev === "0" ? digits : digits;

  // Normalize leading zeros (keep single "0" only)
  normalized = normalized.replace(/^0+(\d)/, "$1");
  return normalized || "0";
}

function formatVNDInline(valueStr: string): string {
  const digits = valueStr.replace(/[^\d]/g, "");
  const n = digits ? Number.parseInt(digits, 10) : 0;
  const safe = Number.isFinite(n) ? n : 0;
  return `${new Intl.NumberFormat("vi-VN").format(safe)} ₫`;
}

export function JobFormModal(props: JobFormModalProps) {
  const {
    open,
    mode,
    initial,
    formOptions,
    onClose,
    onCreated,
    onUpdated,
    onRequestOpenQr,
    onClientCreated,
    onSubjectCreated,
  } = props;
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [clientId, setClientId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [status, setStatus] = useState<JobFormInput["status"]>("NOT_STARTED");
  const [priority, setPriority] = useState<JobFormInput["priority"]>("MEDIUM");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [amount, setAmount] = useState("0");
  const [deposit, setDeposit] = useState("0");
  const [referralFee, setReferralFee] = useState("0");
  const [referrer, setReferrer] = useState("");
  const [note, setNote] = useState("");

  const initialFilled = useMemo(() => {
    if (mode === "edit" && initial) {
      return {
        name: initial.name,
        clientName: initial.clientName,
      };
    }
    return null;
  }, [mode, initial]);

  useEffect(() => {
    if (open) {
      setMounted(true);
      if (mode === "edit" && initial) {
        setName(initial.name);
        setStartDate(toInputDate(initial.startDate));
        setDeadline(toInputDate(initial.deadline));
        setStatus(initial.status);
        setPriority(initial.priority || "MEDIUM");
        setAmount(initial.amountText.replace(/[^\d]/g, "") || "0");
        setDeposit(initial.depositText.replace(/[^\d]/g, "") || "0");
        setReferralFee(initial.referralFeeText.replace(/[^\d]/g, "") || "0");
        setReferrer(initial.referrer ?? "");
        setNote(initial.note ?? "");
        setClientId(initial.clientId ?? null);
        setSubjectId(initial.subjectId ?? null);
        setBatchId(initial.batchId ?? null);
      } else {
        setName("");
        setStartDate("");
        setDeadline("");
        setStatus("NOT_STARTED");
        setPriority("MEDIUM");
        setAmount("0");
        setDeposit("0");
        setReferralFee("0");
        setReferrer("");
        setNote("");
        setClientId(null);
        setSubjectId(null);
        setBatchId(null);
      }

      // Auto-assign latest OPEN batch (formOptions.batches is ordered desc by startDate/id)
      if (mode === "create" && formOptions.batches.length > 0) {
        setBatchId((prev) => (prev == null ? formOptions.batches[0].id : prev));
      }
      document.body.style.overflow = "hidden";
    } else {
      const timer = setTimeout(() => setMounted(false), 200);
      document.body.style.overflow = "unset";
      return () => clearTimeout(timer);
    }
  }, [open, mode, initial, formOptions.batches]);

  if (!mounted && !open) return null;

  const title = mode === "create" ? "Tạo việc làm" : "Sửa việc làm";
  const primaryText = mode === "create" ? "Tạo" : "Lưu";
  const canSubmit = name.trim().length >= 2 && amount.trim().length > 0 && !isSubmitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const payload: JobFormInput = {
        name: name.trim(),
        clientId,
        subjectId,
        batchId,
        status,
        priority,
        startDate: startDate || null,
        deadline: deadline || null,
        amount: amount || "0",
        deposit: deposit || "0",
        referralFee: referralFee || "0",
        referrer: referrer || "",
        note,
      };

      if (mode === "create") {
        const res = await createJobAction(payload);
        if (!res.success || !res.data) {
          toast.error(typeof res.error === "string" ? res.error : "Lỗi hệ thống. Vui lòng thử lại.");
          return;
        }
        onCreated?.(res.data.id);
        toast.success("Đã tạo việc làm");
        onClose();
        if (onRequestOpenQr) {
          onRequestOpenQr(res.data.id);
        }
      } else {
        if (!initial) return;
        const res = await updateJobAction(initial.id, payload);
        if (!res.success) {
          toast.error(typeof res.error === "string" ? res.error : "Lỗi hệ thống. Vui lòng thử lại.");
          return;
        }
        onUpdated?.();
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
        className={`relative mx-auto w-full max-w-3xl rounded-[2rem] bg-white shadow-2xl border border-moss-100 overflow-hidden transition-all duration-200 ease-out ${
          open ? "translate-y-0 scale-100" : "translate-y-6 scale-[0.98]"
        }`}
      >
        <div className="flex items-start justify-between gap-4 p-8 pb-6 border-b border-moss-50">
          <div>
            <p className="text-xs font-extrabold text-moss-400 tracking-wide">Việc làm</p>
            <h2 className="text-2xl font-black text-moss-900 tracking-tight mt-1">{title}</h2>
            <p className="text-sm text-moss-500 mt-2">
              Nhập đầy đủ thông tin job để theo dõi thu tiền và tiến độ.
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

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="text-xs font-black text-moss-600 uppercase tracking-[0.2em]">Tên job</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-moss-900 font-bold placeholder:text-moss-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
              placeholder="Ví dụ: Đồ án CSDL cho Nguyễn Văn A"
              required
            />
            {initialFilled?.clientName && (
              <p className="text-[11px] text-moss-400">Khách hàng: {initialFilled.clientName}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ClientCombobox
              value={clientId}
              onChange={(id) => setClientId(id)}
              options={formOptions.clients}
              onCreated={onClientCreated}
            />
            <SubjectCombobox
              value={subjectId}
              onChange={(id) => setSubjectId(id)}
              options={formOptions.subjects}
              onCreated={onSubjectCreated}
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
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                tabIndex={-1}
                className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-moss-900 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-moss-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <Calendar className="size-4" />
                Deadline
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                tabIndex={-1}
                className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-moss-900 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-moss-600 uppercase tracking-[0.2em]">Tổng tiền</label>
              <input
                value={amount}
                onChange={(e) => setAmount((prev) => sanitizeMoneyInput(prev, e.target.value))}
                className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-moss-900 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
              />
              <p className="text-[11px] text-slate-500">{formatVNDInline(amount)}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-moss-600 uppercase tracking-[0.2em]">Tiền cọc</label>
              <input
                value={deposit}
                onChange={(e) => setDeposit((prev) => sanitizeMoneyInput(prev, e.target.value))}
                className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-moss-900 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
              />
              <p className="text-[11px] text-slate-500">{formatVNDInline(deposit)}</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-moss-600 uppercase tracking-[0.2em]">Hoa hồng giới thiệu</label>
              <input
                value={referralFee}
                onChange={(e) => setReferralFee((prev) => sanitizeMoneyInput(prev, e.target.value))}
                className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-moss-900 font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
              />
              <p className="text-[11px] text-slate-500">{formatVNDInline(referralFee)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-moss-600 uppercase tracking-[0.2em]">Đợt làm</label>
              <select
                className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-sm font-bold text-moss-900 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                value={batchId ?? ""}
                onChange={(e) => setBatchId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Chưa gán đợt</option>
                {formOptions.batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-moss-600 uppercase tracking-[0.2em]">Trạng thái</label>
              <select
                className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-sm font-bold text-moss-900 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                value={status}
                onChange={(e) => setStatus(e.target.value as JobFormInput["status"])}
              >
                <option value="NOT_STARTED">Chưa bắt đầu</option>
                <option value="IN_PROGRESS">Đang làm</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-moss-600 uppercase tracking-[0.2em]">Mức độ ưu tiên</label>
              <select
                className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-sm font-bold text-moss-900 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                value={priority}
                onChange={(e) => setPriority(e.target.value as JobFormInput["priority"])}
              >
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Bình thường</option>
                <option value="HIGH">Cao</option>
                <option value="URGENT">Khẩn cấp</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-moss-600 uppercase tracking-[0.2em]">Người giới thiệu</label>
              <input
                value={referrer}
                onChange={(e) => setReferrer(e.target.value)}
                className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-moss-900 font-medium placeholder:text-moss-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                placeholder="Tên người giới thiệu (nếu có)"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-moss-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <FileText className="size-4" />
                Ghi chú
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full min-h-[80px] resize-none rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-moss-900 font-medium placeholder:text-moss-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
                placeholder="Ghi chú riêng cho job này..."
              />
            </div>
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

