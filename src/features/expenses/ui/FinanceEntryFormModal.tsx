import React, { useState } from "react";
import { X } from "lucide-react";

import type { FinanceEntryLifecycle } from "@prisma/client";

import type { EntryFormInput, EntryListItemDTO } from "@/features/expenses/model/financeEntryTypes";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

export interface WalletOption {
  id: number;
  name: string;
}

export interface CategoryOption {
  id: number;
  name: string;
  icon: string | null;
  kind: "INCOME" | "EXPENSE";
}

export function FinanceEntryFormModal({
  mode,
  initial,
  defaultDateIso,
  onClose,
  onSave,
  wallets = [],
  categories = []
}: {
  mode: "add" | "edit";
  initial?: EntryListItemDTO;
  defaultDateIso?: string;
  onClose: () => void;
  onSave: (data: EntryFormInput) => void;
  wallets?: WalletOption[];
  categories?: CategoryOption[];
}) {
  const [kind, setKind] = useState<"INCOME" | "EXPENSE">(
    initial?.entryKind === "EXPENSE" ? "EXPENSE" : "INCOME"
  );
  const [amount, setAmount] = useState(initial ? String(initial.amountRaw) : "");
  
  // Find initial wallet ID or name
  const [walletId, setWalletId] = useState<number | string>(initial?.walletId ?? (wallets[0]?.id ?? ""));
  const [categoryId, setCategoryId] = useState<number | string>(initial?.categoryId ?? "");
  
  const [note, setNote] = useState(initial?.note ?? "");
  
  const parseDateToIso = (dStr: string) => {
    if (dStr.includes("/")) return dStr.split("/").reverse().join("-");
    const d = new Date(dStr);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0,10);
    return new Date().toISOString().slice(0, 10);
  }
  
  const [date, setDate] = useState(
    initial?.occurredAt ? initial.occurredAt.slice(0, 10) : (defaultDateIso ? parseDateToIso(defaultDateIso) : new Date().toISOString().slice(0, 10))
  );
  
  const [lifecycle, setLifecycle] = useState<FinanceEntryLifecycle>(initial?.lifecycleStatus ?? "POSTED");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const catOptions = categories.filter((c) => c.kind === kind);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-moss-900/70" onClick={isSubmitting ? undefined : onClose} />
      <div
        className={`relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md sm:max-w-2xl mx-4 max-h-[90vh] overflow-y-auto transform transition-all duration-200 ${
          isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-moss-100">
          <h3 className="text-lg font-bold text-on-surface">
            {mode === "add" ? "Thêm giao dịch mới" : "Chỉnh sửa giao dịch"}
          </h3>
          <button onClick={onClose} className="p-2 text-moss-400 hover:text-moss-700 hover:bg-moss-50 rounded-xl transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex p-4 gap-2 border-b border-moss-50">
          <button
            onClick={() => { setKind("INCOME"); setCategoryId(""); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${kind === "INCOME" ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"}`}
          >
            🟢 Thu nhập
          </button>
          <button
            onClick={() => { setKind("EXPENSE"); setCategoryId(""); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${kind === "EXPENSE" ? "bg-error text-white shadow-lg shadow-error/20" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"}`}
          >
            🔴 Chi tiêu
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Số tiền (VND)</label>
              <input
                type="number"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-xl font-black outline-none focus:ring-2 focus:ring-primary/20"
              />
              {amount && <p className="text-xs text-on-surface-variant mt-1">{fmt(Number(amount))} VND</p>}
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Ngày giao dịch</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Ví</label>
              <div className="grid grid-cols-3 gap-2">
                {wallets.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => setWalletId(w.id)}
                    className={`truncate px-2 py-2.5 rounded-xl text-[11px] font-bold transition-colors border-2 box-border ${Number(walletId) === w.id ? "border-primary bg-primary/15 text-primary" : "border-transparent bg-surface-container-low text-on-surface-variant hover:bg-surface-container"}`}
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-0">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Danh mục</label>
              <div className="grid grid-cols-2 gap-2 max-h-48 min-h-0 overflow-y-auto scrollbar-primary-thin pr-1.5 -mr-0.5">
                {catOptions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={`flex min-w-0 items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border-2 box-border text-left ${
                      categoryId !== "" && Number(categoryId) === c.id
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-transparent bg-surface-container-low text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    <span className="shrink-0">{c.icon ?? "💰"}</span>
                    <span className="min-w-0 truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Trạng thái</label>
              <div className="flex gap-2">
                {(
                  [
                    ["POSTED", "Đã thực hiện"],
                    ["PLANNED", "Dự kiến"],
                    ["VOIDED", "Đã hủy"],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setLifecycle(v)}
                    className={`flex-1 min-w-[5.5rem] py-2 rounded-xl text-xs font-bold transition-colors border-2 box-border ${lifecycle === v ? "border-primary bg-primary/15 text-primary" : "border-transparent bg-surface-container-low text-on-surface-variant"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Ghi chú</label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Mô tả thêm về giao dịch..."
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={() => {
              if (isSubmitting) return;
              onClose();
            }}
            className="flex-1 py-3 bg-surface-container-low text-on-surface-variant rounded-xl text-sm font-bold hover:bg-surface-container transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            onClick={async () => {
              if (!amount || Number(amount) <= 0) return;
              if (!walletId || isSubmitting) return;
              setIsSubmitting(true);
              await onSave({
                walletId: Number(walletId),
                categoryId: categoryId ? Number(categoryId) : null,
                entryKind: kind,
                lifecycleStatus: lifecycle,
                amount: amount, // String for Zod
                occurredAt: date,
                note: note || undefined,
              });
              setIsClosing(true);
              setTimeout(() => {
                onClose();
              }, 220);
            }}
            disabled={isSubmitting}
            className={`flex-1 py-3 text-white rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-all disabled:opacity-60 ${
              kind === "INCOME"
                ? "bg-primary shadow-primary/20 hover:brightness-105"
                : "bg-error shadow-error/20 hover:brightness-105"
            }`}
          >
            {isSubmitting ? "Đang thực hiện..." : mode === "add" ? "Thêm giao dịch" : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}
