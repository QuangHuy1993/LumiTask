"use client";

import React, { useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";

import type { FinanceLoanDirection } from "@/features/expenses/model/financeLoanTypes";
import type { FinanceLoanCreateInput, FinanceLoanUpdateInput } from "@/features/expenses/model/financeLoanValidation";
import { formatVndDigits, parseVndDigits } from "@/features/expenses/utils/vndInputFormat";

const ICONS = ["💳", "🏦", "👤", "🚗", "🏠", "💊", "🎓", "✈️", "🛡️", "🌱", "📚", "💍"];

const toDateInputValue = (isoOrDate?: string | null): string => {
  if (!isoOrDate) return "";
  // iso: 2026-04-03T... or date: 2026-04-03
  if (isoOrDate.includes("T")) return isoOrDate.slice(0, 10);
  return isoOrDate;
};

type FinanceLoanFormModel = {
  name: string;
  icon: string | null;
  loanDirection: FinanceLoanDirection;
  principalAmount: number;
  currency: string;
  startDate: string;
  dueDate?: string | null;
  interestRateApr?: number | undefined;
  status: "ACTIVE" | "CLOSED";
  note?: string;
};

export function FinanceLoanFormModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  initial?: Partial<FinanceLoanFormModel>;
  onClose: () => void;
  onSave: (data: FinanceLoanCreateInput | FinanceLoanUpdateInput) => Promise<void> | void;
}) {
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState<FinanceLoanFormModel>({
    name: initial?.name ?? "",
    icon: initial?.icon ?? "🏦",
    loanDirection: initial?.loanDirection ?? "BORROWED",
    principalAmount: initial?.principalAmount ?? 0,
    currency: initial?.currency ?? "VND",
    startDate: initial?.startDate ?? new Date().toISOString().slice(0, 10),
    dueDate: initial?.dueDate ?? null,
    interestRateApr: initial?.interestRateApr ?? undefined,
    status: initial?.status ?? "ACTIVE",
    note: initial?.note ?? "",
  });

  const title = mode === "add" ? "Thêm khoản nợ" : "Chỉnh sửa khoản nợ";

  const isBorrowed = form.loanDirection === "BORROWED";

  const directionBtnClass = useMemo(() => {
    const borrowed = isBorrowed
      ? "bg-error/10 text-error ring-2 ring-error"
      : "bg-surface-container-low hover:bg-surface-container text-on-surface-variant";
    const lent = !isBorrowed
      ? "bg-primary/10 text-primary ring-2 ring-primary"
      : "bg-surface-container-low hover:bg-surface-container text-on-surface-variant";
    return { borrowed, lent };
  }, [isBorrowed]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-moss-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md lg:max-w-3xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-moss-100">
          <h3 className="text-lg font-bold text-on-surface">{title}</h3>
          <button type="button" onClick={onClose} className="p-2 text-moss-400 hover:text-moss-700 hover:bg-moss-50 rounded-xl transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            <div className="lg:col-start-1">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">Tên khoản nợ</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="VD: Vay ngân hàng Vietcombank"
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div className="lg:col-start-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">Biểu tượng</label>
            <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, icon: ic }))}
                  className={`h-11 rounded-xl text-xl flex items-center justify-center transition-all border-2 ${
                    form.icon === ic ? "border-primary bg-primary/10" : "border-transparent bg-surface-container-low hover:bg-surface-container"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-start-1">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">Chiều nợ</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, loanDirection: "BORROWED" }))}
                className={`flex-1 py-2.5 min-h-[44px] rounded-xl text-sm font-bold transition-colors ${directionBtnClass.borrowed}`}
              >
                Tôi vay
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, loanDirection: "LENT" }))}
                className={`flex-1 py-2.5 min-h-[44px] rounded-xl text-sm font-bold transition-colors ${directionBtnClass.lent}`}
              >
                Tôi cho vay
              </button>
            </div>
          </div>

          <div className="lg:col-start-1">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">Số tiền gốc (VND)</label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={form.principalAmount > 0 ? formatVndDigits(form.principalAmount) : ""}
              onChange={(e) => setForm((f) => ({ ...f, principalAmount: parseVndDigits(e.target.value) }))}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm tabular-nums focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="VD: 1.000.000"
            />
          </div>

          <div className="lg:col-start-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">Lãi suất APR (tuỳ chọn)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              value={form.interestRateApr ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, interestRateApr: v === "" ? undefined : Number(v) }));
              }}
              placeholder="VD: 12 ( % / năm )"
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">Ngày bắt đầu</label>
                <input
                  type="date"
                  value={toDateInputValue(form.startDate)}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">Hạn trả (tuỳ chọn)</label>
                <input
                  type="date"
                  value={toDateInputValue(form.dueDate ?? undefined)}
                  onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value || null }))}
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          {mode === "edit" && (
            <div className="lg:col-span-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">Trạng thái</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: "ACTIVE" }))}
                  className={`flex-1 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-colors border-2 ${
                    form.status === "ACTIVE" ? "border-primary bg-primary/15 text-primary" : "border-transparent bg-surface-container-low hover:bg-surface-container text-on-surface-variant"
                  }`}
                >
                  Đang chạy
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: "CLOSED" }))}
                  className={`flex-1 py-2 min-h-[44px] rounded-xl text-xs font-bold transition-colors border-2 ${
                    form.status === "CLOSED" ? "border-primary bg-primary/15 text-primary" : "border-transparent bg-surface-container-low hover:bg-surface-container text-on-surface-variant"
                  }`}
                >
                  Đã đóng
                </button>
              </div>
            </div>
          )}

          <div className="lg:col-span-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5 block">Ghi chú</label>
            <textarea
              rows={3}
              value={form.note ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Mô tả thêm..."
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none overflow-y-auto max-h-32"
            />
          </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-moss-100 flex-shrink-0">
          <button type="button" onClick={onClose} className="flex-1 py-3 bg-surface-container-low text-on-surface-variant rounded-xl text-sm font-bold hover:bg-surface-container transition-colors">
            Huỷ
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!form.name.trim()) return;

              // Zod expects `YYYY-MM-DD` for startDate/dueDate.
              // In edit mode, `initial.startDate/dueDate` may be ISO (`...T...`), so normalize before submit.
              const normalizedStartDate = toDateInputValue(form.startDate);
              const normalizedDueDate = form.dueDate ? toDateInputValue(form.dueDate) : undefined;

              const payload =
                mode === "add"
                  ? ({
                      name: form.name.trim(),
                      icon: form.icon ?? "",
                      loanDirection: form.loanDirection,
                      principalAmount: form.principalAmount,
                      currency: form.currency,
                      startDate: normalizedStartDate,
                      dueDate: normalizedDueDate,
                      interestRateApr: form.interestRateApr,
                      status: form.status,
                      note: form.note?.trim() ? form.note.trim() : "",
                    } satisfies FinanceLoanCreateInput)
                  : ({
                      name: form.name.trim(),
                      icon: form.icon ?? "",
                      loanDirection: form.loanDirection,
                      principalAmount: form.principalAmount,
                      currency: form.currency,
                      startDate: normalizedStartDate,
                      dueDate: normalizedDueDate,
                      interestRateApr: form.interestRateApr,
                      status: form.status,
                      note: form.note?.trim() ? form.note.trim() : "",
                    } satisfies FinanceLoanUpdateInput);

              startTransition(async () => {
                await onSave(payload);
                onClose();
              });
            }}
            className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all disabled:opacity-60"
          >
            {mode === "add" ? "Thêm khoản nợ" : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

