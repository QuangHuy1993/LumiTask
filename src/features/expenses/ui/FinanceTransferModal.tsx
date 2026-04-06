"use client";

import React, { useState } from "react";
import { X, ArrowLeftRight } from "lucide-react";

import type { TransferFormInput } from "@/features/expenses/model/financeEntryTypes";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

export interface WalletOption {
  id: number;
  name: string;
}

export function FinanceTransferModal({
  onClose,
  onSave,
  defaultDateIso,
  wallets = [],
}: {
  onClose: () => void;
  onSave: (data: TransferFormInput) => void;
  defaultDateIso?: string; 
  wallets?: WalletOption[];
}) {
  const [fromWalletId, setFromWalletId] = useState<number | string>(wallets[0]?.id ?? "");
  const [toWalletId, setToWalletId] = useState<number | string>(wallets[1]?.id ?? wallets[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  
  const parseDateToIso = (dStr: string) => {
    if (dStr.includes("/")) return dStr.split("/").reverse().join("-");
    const d = new Date(dStr);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0,10);
    return new Date().toISOString().slice(0, 10);
  }
  
  const [date, setDate] = useState(defaultDateIso ? parseDateToIso(defaultDateIso) : new Date().toISOString().slice(0, 10));

  const error = fromWalletId === toWalletId ? "Ví nguồn và ví đích phải khác nhau" : null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleConfirm = async () => {
    if (error || !amount || Number(amount) <= 0 || !fromWalletId || !toWalletId || isSubmitting) return;
    setIsSubmitting(true);
    await onSave({
      fromWalletId: Number(fromWalletId),
      toWalletId: Number(toWalletId),
      amount: amount, // String for zod
      occurredAt: date,
      note: note || `Chuyển khoản nội bộ`,
    });
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-moss-900/70" onClick={isSubmitting ? undefined : onClose} />
      <div
        className={`relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 transform transition-all duration-200 ${
          isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-moss-100">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="size-5 text-on-surface-variant" />
            <h3 className="text-lg font-bold text-on-surface">Chuyển khoản nội bộ</h3>
          </div>
          <button onClick={onClose} className="p-2 text-moss-400 hover:text-moss-700 rounded-xl transition-colors"><X className="size-5" /></button>
        </div>
        
        <div className="p-6 space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Từ ví</label>
            <div className="grid grid-cols-3 gap-2">
              {wallets.map((w) => (
                <button 
                  key={w.id} 
                  type="button"
                  onClick={() => setFromWalletId(w.id)} 
                  className={`truncate px-2 py-2.5 rounded-xl text-[11px] font-bold transition-all ${fromWalletId === w.id ? "bg-primary/15 ring-2 ring-primary text-primary" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"}`}
                >
                  {w.name}
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-outline-variant/30" />
            <div className="p-2 bg-primary/10 rounded-full"><ArrowLeftRight className="size-4 text-primary" /></div>
            <div className="flex-1 h-px bg-outline-variant/30" />
          </div>
          
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Đến ví</label>
            <div className="grid grid-cols-3 gap-2">
              {wallets.map((w) => (
                <button 
                  key={w.id} 
                  type="button"
                  onClick={() => setToWalletId(w.id)} 
                  className={`truncate px-2 py-2.5 rounded-xl text-[11px] font-bold transition-all ${toWalletId === w.id ? "bg-primary/15 ring-2 ring-primary text-primary" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"}`}
                >
                  {w.name}
                </button>
              ))}
            </div>
            {error && <p className="text-xs text-error mt-2 font-medium">{error}</p>}
          </div>
          
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Số tiền (VND)</label>
            <input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-xl font-black outline-none focus:ring-2 focus:ring-primary/20" />
            {amount && <p className="text-xs text-on-surface-variant mt-1">{fmt(Number(amount))} VND</p>}
          </div>
          
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Ngày</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Ghi chú</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lý do chuyển khoản..." className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
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
            type="button"
            disabled={!!error || !amount || Number(amount) <= 0 || !fromWalletId || !toWalletId || isSubmitting}
            onClick={() => { void handleConfirm(); }}
            className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Đang thực hiện..." : "Xác nhận chuyển"}
          </button>
        </div>
      </div>
    </div>
  );
}
