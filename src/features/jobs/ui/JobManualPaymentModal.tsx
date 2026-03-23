"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, X } from "lucide-react";
import { toast } from "sonner";
import type { PaymentStatus } from "@prisma/client";
import { useRouter } from "next/navigation";

import { getUserBankAccountsAction } from "@/features/payments/actions/paymentActions";
import { recordManualPaymentAction } from "@/features/jobs/actions/jobPaymentActions";

type BankAccount = {
  id: number;
  bankId: string;
  accountNo: string;
  accountName: string;
  isDefault: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  jobId: number | null;
  paymentStatus: PaymentStatus;
  amount: number;
  deposit: number;
  totalPaid: number;
  onPaymentRecorded?: () => void;
};

function formatVNDInline(valueStr: string): string {
  const digits = valueStr.replace(/[^\d]/g, "");
  if (!digits) return "0 ₫";
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return "0 ₫";
  return `${new Intl.NumberFormat("vi-VN").format(n)} ₫`;
}

function getDepositAmount(amount: number, deposit: number): number {
  if (deposit > 0) return deposit;
  if (amount > 0) return amount;
  return 0;
}

function getFullAmount(amount: number, totalPaid: number): number {
  const remaining = Math.max(amount - totalPaid, 0);
  if (remaining > 0) return remaining;
  if (amount > 0 && totalPaid === 0) return amount;
  return remaining;
}

export function JobManualPaymentModal({ open, onClose, jobId, paymentStatus, amount: totalAmount, deposit, totalPaid, onPaymentRecorded }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"DEPOSIT" | "FULL">("DEPOSIT");
  const [content, setContent] = useState("");
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [bankAccountId, setBankAccountId] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      let defaultType: "DEPOSIT" | "FULL" = "DEPOSIT";
      if (paymentStatus === "DEPOSIT_PAID" || paymentStatus === "COMPLETED") {
        defaultType = "FULL";
      }
      setType(defaultType);
      const suggested =
        defaultType === "DEPOSIT" ? getDepositAmount(totalAmount, deposit) : getFullAmount(totalAmount, totalPaid);
      setAmount(suggested > 0 ? String(suggested) : "");
      if (jobId) {
        setContent(defaultType === "DEPOSIT" ? `JOB${jobId}COC` : `JOB${jobId}FULL`);
      } else {
        setContent("");
      }
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, "0");
      const dd = String(today.getDate()).padStart(2, "0");
      setDate(`${yyyy}-${mm}-${dd}`);
      async function load() {
        const res = await getUserBankAccountsAction();
        if (res.success && res.data) {
          setAccounts(res.data);
          const def = res.data.find((a) => a.isDefault) ?? res.data[0];
          setBankAccountId(def?.id ?? null);
        }
      }
      load();
      document.body.style.overflow = "hidden";
    } else {
      const t = setTimeout(() => setMounted(false), 200);
      document.body.style.overflow = "unset";
      return () => clearTimeout(t);
    }
  }, [open, totalAmount, deposit, totalPaid, jobId, paymentStatus]);

  if (!mounted && !open) return null;

  const canSubmit =
    !!jobId && !!date && !!bankAccountId && !isSubmitting && Number.parseInt(amount || "0", 10) > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !jobId || !bankAccountId) return;
    setIsSubmitting(true);
    try {
      const res = await recordManualPaymentAction({
        jobId,
        date,
        amount: amount || "0",
        type,
        bankAccountId,
        content: content || `JOB${jobId}${type === "DEPOSIT" ? "COC" : "FULL"}`,
      });
      if (!res.success) {
        toast.error(res.error || "Không thể ghi nhận thanh toán");
        return;
      }
      toast.success("Đã ghi nhận thanh toán");
      router.refresh();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("job:payment-recorded", { detail: { jobId } }));
      }
      if (typeof onPaymentRecorded === "function") {
        onPaymentRecorded();
      }
      onClose();
    } catch {
      toast.error("Lỗi hệ thống. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isDepositDisabled = paymentStatus === "DEPOSIT_PAID" || paymentStatus === "COMPLETED";

  const contentEl = (
    <div className={`fixed inset-0 z-[9999] p-4 transition-all duration-200 ${open ? "opacity-100" : "opacity-0"}`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-auto w-full max-w-lg rounded-xl bg-bgApp shadow-2xl overflow-hidden border border-slate-200 transition-all duration-200 ease-out">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Ghi nhận thanh toán thủ công</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700"
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-bgApp">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Ngày thanh toán</label>
            <div className="relative">
              <input
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 pr-10 text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Số tiền</label>
            <div className="relative">
              <input
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                placeholder="0"
                inputMode="numeric"
                value={amount}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, "");
                  if (!raw) {
                    setAmount("");
                    return;
                  }
                  const normalized = String(Number.parseInt(raw, 10));
                  setAmount(normalized);
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">VND</span>
            </div>
            <p className="text-[11px] text-slate-500">{formatVNDInline(amount || "0")}</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Loại thanh toán</label>
            <div className="flex gap-3">
              <label
                className={`flex-1 relative ${
                  isDepositDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                }`}
              >
                <input
                  className="peer sr-only"
                  type="radio"
                  name="payment_type"
                  checked={type === "DEPOSIT"}
                  disabled={isDepositDisabled}
                  onChange={() => {
                    if (isDepositDisabled) return;
                    setType("DEPOSIT");
                    const suggested = getDepositAmount(totalAmount, deposit);
                    setAmount(suggested > 0 ? String(suggested) : "");
                    if (jobId) {
                      setContent((prev) => prev || `JOB${jobId}COC`);
                    }
                  }}
                />
                <div
                  className={`flex items-center justify-center h-11 rounded-lg text-sm font-medium transition-all ${
                    isDepositDisabled
                      ? "border border-slate-200 bg-slate-100 text-slate-400"
                      : "border border-slate-300 text-slate-600 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary"
                  }`}
                >
                  Đặt cọc
                </div>
              </label>
              <label className="flex-1 relative cursor-pointer">
                <input
                  className="peer sr-only"
                  type="radio"
                  name="payment_type"
                  checked={type === "FULL"}
                  onChange={() => {
                    setType("FULL");
                    const suggested = getFullAmount(totalAmount, totalPaid);
                    setAmount(suggested > 0 ? String(suggested) : "");
                    if (jobId) {
                      setContent((prev) => prev || `JOB${jobId}FULL`);
                    }
                  }}
                />
                <div className="flex items-center justify-center h-11 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 peer-checked:border-primary peer-checked:bg-primary/5 peer-checked:text-primary transition-all">
                  Thanh toán toàn bộ
                </div>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Tài khoản thụ hưởng</label>
            <div className="relative">
              <select
                className="appearance-none w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                value={bankAccountId ?? ""}
                onChange={(e) => setBankAccountId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Chọn tài khoản</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankId} - {acc.accountNo} ({acc.accountName})
                  </option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">▾</span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">Nội dung thanh toán</label>
            <textarea
              className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all resize-none font-mono text-sm"
              rows={3}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={jobId ? `JOB${jobId}${type === "DEPOSIT" ? "COC" : "FULL"}` : "JOB{id}COC / JOB{id}FULL"}
            />
          </div>

          <div className="px-0 pt-2">
            <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-semibold shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? "Đang lưu…" : "Xác nhận thanh toán"}
            </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(contentEl, document.body) : null;
}

