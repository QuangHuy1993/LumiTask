"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import type { FinanceRecurringListItemDTO } from "@/features/expenses/model/financeRecurringTypes";
import { formatVndDigits, parseVndDigits } from "@/features/expenses/utils/vndInputFormat";

export type RecurringWalletOption = { id: number; name: string; currency: string };
export type RecurringCategoryOption = {
  id: number;
  name: string;
  icon: string | null;
  kind: "INCOME" | "EXPENSE";
};

const FREQUENCIES: { value: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"; label: string }[] = [
  { value: "DAILY", label: "Hàng ngày" },
  { value: "WEEKLY", label: "Hàng tuần" },
  { value: "MONTHLY", label: "Hàng tháng" },
  { value: "YEARLY", label: "Hàng năm" },
];

function defaultNextLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function splitLocalDateTime(local: string): { datePart: string; timePart: string } {
  const normalized = local.includes("T") ? local : `${local}T09:00`;
  const [d, tRaw = "09:00"] = normalized.split("T");
  const timePart = (tRaw.length >= 5 ? tRaw.slice(0, 5) : "09:00") as string;
  return { datePart: d.slice(0, 10), timePart };
}

export function FinanceRecurringFormModal({
  mode,
  initial,
  wallets,
  categories,
  onClose,
  onSubmit,
}: {
  mode: "add" | "edit";
  initial?: FinanceRecurringListItemDTO;
  wallets: RecurringWalletOption[];
  categories: RecurringCategoryOption[];
  onClose: () => void;
  onSubmit: (payload: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>;
}) {
  const initialLocal = initial?.nextRunAtLocal ?? defaultNextLocal();
  const { datePart: initDate, timePart: initTime } = splitLocalDateTime(initialLocal);

  const [kind, setKind] = useState<"INCOME" | "EXPENSE">(
    initial?.entryKind === "INCOME" ? "INCOME" : "EXPENSE",
  );
  const [walletId, setWalletId] = useState<number | "">(initial?.walletId ?? (wallets[0]?.id ?? ""));
  const [categoryId, setCategoryId] = useState<number | "">(initial?.categoryId ?? "");
  const [frequency, setFrequency] = useState<(typeof FREQUENCIES)[number]["value"]>(
    (initial?.frequency as (typeof FREQUENCIES)[number]["value"]) ?? "MONTHLY",
  );
  const [interval, setInterval] = useState(String(initial?.interval ?? 1));
  const [datePart, setDatePart] = useState(initDate);
  const [timePart, setTimePart] = useState(initTime);
  const [amountVnd, setAmountVnd] = useState(
    initial && initial.currency === "VND" ? Math.floor(initial.amountRaw) : 0,
  );
  const [amountForeign, setAmountForeign] = useState(
    initial && initial.currency !== "VND" ? String(initial.amountRaw) : "",
  );
  const [note, setNote] = useState(initial?.note ?? "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedWallet = useMemo(
    () => wallets.find((w) => w.id === walletId),
    [wallets, walletId],
  );
  const currency = selectedWallet?.currency ?? "VND";
  const isVnd = currency === "VND";

  const catOptions = categories.filter((c) => c.kind === kind);

  useEffect(() => {
    if (categoryId === "") return;
    const c = categories.find((x) => x.id === categoryId);
    if (c && c.kind !== kind) setCategoryId("");
  }, [kind, categoryId, categories]);

  const mergedNextRunAt = `${datePart}T${timePart}`;

  const selectWallet = (w: RecurringWalletOption) => {
    const prev = wallets.find((x) => x.id === walletId);
    setWalletId(w.id);
    if (prev?.currency === "VND" && w.currency !== "VND" && amountVnd > 0) {
      setAmountForeign(String(amountVnd));
      setAmountVnd(0);
    } else if (prev && prev.currency !== "VND" && w.currency === "VND" && amountForeign.trim()) {
      const n = Number(amountForeign.trim());
      if (Number.isFinite(n) && n > 0) setAmountVnd(Math.floor(n));
      setAmountForeign("");
    }
  };

  const resolveAmountString = (): string | null => {
    if (isVnd) {
      if (amountVnd <= 0) return null;
      return String(amountVnd);
    }
    const raw = amountForeign.trim();
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return String(n);
  };

  const fieldClass =
    "w-full bg-surface-container-low border-none rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 min-h-11";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-moss-900/70" onClick={submitting ? undefined : onClose} />
      <div
        className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl lg:max-w-4xl"
        style={{ maxHeight: "min(92vh, 760px)" }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-outline-variant/10 px-4 py-3 sm:px-6 sm:py-4">
          <h3 className="text-base font-black text-on-surface sm:text-lg">
            {mode === "add" ? "Thêm quy tắc định kỳ" : "Sửa quy tắc định kỳ"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-11 min-w-11 rounded-xl p-2 text-on-surface-variant hover:bg-surface-container-low"
            aria-label="Đóng"
          >
            <X className="mx-auto size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {error && (
            <p className="mb-3 rounded-xl bg-error/10 px-3 py-2 text-sm font-bold text-error">{error}</p>
          )}

          <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-x-6 lg:space-y-0">
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setKind("INCOME")}
                  className={`min-h-11 flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
                    kind === "INCOME"
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "bg-surface-container-low text-on-surface-variant"
                  }`}
                >
                  Thu nhập
                </button>
                <button
                  type="button"
                  onClick={() => setKind("EXPENSE")}
                  className={`min-h-11 flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
                    kind === "EXPENSE"
                      ? "bg-error text-white shadow-lg shadow-error/20"
                      : "bg-surface-container-low text-on-surface-variant"
                  }`}
                >
                  Chi tiêu
                </button>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant sm:text-xs">
                  Ví
                </label>
                <div className="flex flex-wrap gap-2">
                  {wallets.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => selectWallet(w)}
                      className={`min-h-10 rounded-xl border-2 px-3 py-2 text-xs font-bold ${
                        walletId === w.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-transparent bg-surface-container-low text-on-surface-variant"
                      }`}
                    >
                      {w.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant sm:text-xs">
                  Danh mục (tuỳ chọn)
                </label>
                <div className="grid max-h-36 grid-cols-2 gap-2 overflow-y-auto scrollbar-primary-thin sm:max-h-40 lg:max-h-44">
                  <button
                    type="button"
                    onClick={() => setCategoryId("")}
                    className={`min-h-10 rounded-xl border-2 px-3 py-2 text-left text-xs font-bold ${
                      categoryId === ""
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-transparent bg-surface-container-low"
                    }`}
                  >
                    Không chọn
                  </button>
                  {catOptions.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      className={`flex min-h-10 min-w-0 items-center gap-2 rounded-xl border-2 px-3 py-2 text-left text-xs font-bold ${
                        categoryId === c.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-transparent bg-surface-container-low"
                      }`}
                    >
                      <span className="shrink-0">{c.icon ?? "💰"}</span>
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 space-y-3 lg:mt-0">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant sm:text-xs">
                    Tần suất
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) =>
                      setFrequency(e.target.value as (typeof FREQUENCIES)[number]["value"])
                    }
                    className={fieldClass}
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant sm:text-xs">
                    Chu kỳ (mỗi N)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={366}
                    value={interval}
                    onChange={(e) => setInterval(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant sm:text-xs">
                  Lần chạy tiếp theo
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="date"
                    value={datePart}
                    onChange={(e) => setDatePart(e.target.value)}
                    className={fieldClass}
                  />
                  <input
                    type="time"
                    value={timePart}
                    onChange={(e) => setTimePart(e.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant sm:text-xs">
                  Số tiền ({currency})
                </label>
                {isVnd ? (
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={amountVnd > 0 ? formatVndDigits(amountVnd) : ""}
                    onChange={(e) => setAmountVnd(parseVndDigits(e.target.value))}
                    placeholder="0"
                    className={`${fieldClass} text-lg font-black`}
                  />
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={amountForeign}
                    onChange={(e) => setAmountForeign(e.target.value)}
                    placeholder="0"
                    className={`${fieldClass} text-lg font-black`}
                  />
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant sm:text-xs">
                  Ghi chú / tên gợi nhớ
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className={`${fieldClass} min-h-[4.5rem] resize-none font-normal`}
                />
              </div>

              {mode === "edit" && (
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold text-on-surface">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-outline-variant"
                  />
                  Đang hoạt động
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-outline-variant/10 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="min-h-11 flex-1 rounded-xl bg-surface-container-low text-sm font-bold text-on-surface-variant"
          >
            Huỷ
          </button>
          <button
            type="button"
            disabled={submitting || walletId === ""}
            onClick={async () => {
              setError(null);
              const iv = parseInt(interval, 10);
              const amountStr = resolveAmountString();
              if (!amountStr) {
                setError("Nhập số tiền hợp lệ");
                return;
              }
              if (!datePart || !timePart) {
                setError("Chọn ngày và giờ");
                return;
              }
              if (Number.isNaN(iv) || iv < 1) {
                setError("Chu kỳ phải từ 1 trở lên");
                return;
              }
              const payload: Record<string, unknown> = {
                walletId,
                categoryId: categoryId === "" ? null : categoryId,
                entryKind: kind,
                frequency,
                interval: iv,
                nextRunAt: mergedNextRunAt,
                amount: amountStr,
                currency,
                note: note.trim() || "",
                isActive: mode === "add" ? true : isActive,
              };
              setSubmitting(true);
              const res = await onSubmit(payload);
              setSubmitting(false);
              if (!res.ok) {
                setError(res.message ?? "Không lưu được");
                return;
              }
              onClose();
            }}
            className={`min-h-11 flex-1 rounded-xl text-sm font-bold text-white shadow-lg ${
              kind === "INCOME"
                ? "bg-primary shadow-primary/20"
                : "bg-error shadow-error/20"
            } disabled:opacity-50`}
          >
            {submitting ? "Đang lưu…" : mode === "add" ? "Tạo quy tắc" : "Lưu"}
          </button>
        </div>
      </div>
    </div>
  );
}
