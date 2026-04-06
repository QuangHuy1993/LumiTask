"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";

import type { FinanceCategoryListItemDTO } from "@/features/expenses/model/financeCategoryTypes";
import type { FinanceWalletListItemDTO } from "@/features/expenses/model/financeWalletTypes";
import type { FinanceLoanListItemDTO } from "@/features/expenses/model/financeLoanTypes";
import type { FinanceLoanRepayInput } from "@/features/expenses/model/financeLoanValidation";
import { formatVndDigits, parseVndDigits } from "@/features/expenses/utils/vndInputFormat";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

function loanDirectionToCategoryKind(dir: FinanceLoanListItemDTO["loanDirection"]): "INCOME" | "EXPENSE" {
  return dir === "BORROWED" ? "EXPENSE" : "INCOME";
}

export function FinanceLoanRepayModal({
  loan,
  wallets,
  categories,
  onClose,
  onRepay,
}: {
  loan: FinanceLoanListItemDTO;
  wallets: FinanceWalletListItemDTO[];
  categories: FinanceCategoryListItemDTO[];
  onClose: () => void;
  onRepay: (payload: FinanceLoanRepayInput) => Promise<void> | void;
}) {
  const [pending, startTransition] = useTransition();

  const expectedCategoryKind = loanDirectionToCategoryKind(loan.loanDirection);

  const categoryOptions = useMemo(() => categories.filter((c) => c.kind === expectedCategoryKind), [categories, expectedCategoryKind]);
  const walletOptions = wallets;

  const remainingPrincipal = Math.max(0, loan.remainingAmount);
  const quickAmounts = useMemo(() => {
    const base = [500_000, 1_000_000, 2_500_000, 5_000_000];
    if (remainingPrincipal <= 0) return [1_000_000];

    const filtered = base.filter((v) => v <= remainingPrincipal);
    if (filtered.length > 0) return filtered;

    // Nếu còn lại < 500k, vẫn cho 1 lựa chọn đúng bằng số còn lại.
    return [Math.floor(remainingPrincipal)];
  }, [remainingPrincipal]);
  const todayYmd = new Date().toISOString().slice(0, 10);

  // Default payment amount should match what user sees as "Còn lại"
  const [amount, setAmount] = useState<number>(() => {
    // Dùng biến quickAmounts để tránh ESLint báo unused (UI vẫn đang dùng nhánh nút cũ).
    void quickAmounts;
    return remainingPrincipal > 0 ? Math.floor(remainingPrincipal) : 0;
  });
  const [principalPaidStr, setPrincipalPaidStr] = useState<string>("");
  const [interestPaidStr, setInterestPaidStr] = useState<string>("");
  const [paidAt, setPaidAt] = useState<string>(todayYmd);
  const [note, setNote] = useState<string>(loan.loanDirection === "BORROWED" ? "Trả nợ" : "Thu nợ");

  const [walletId, setWalletId] = useState<number | null>(walletOptions[0]?.id ?? null);
  const [categoryId, setCategoryId] = useState<number | null>(categoryOptions[0]?.id ?? null);
  const [createEntry, setCreateEntry] = useState<boolean>(true);

  // amountMode: user chỉnh "Số tiền" thì gốc/lãi tự suy ra (gốc=amount, lãi=0)
  // breakdownMode: user chỉnh "Gốc/Lãi" thì amount tự tính theo gốc+lãi, để pass rule Zod.
  const [breakdownMode, setBreakdownMode] = useState<boolean>(false);

  useEffect(() => {
    if (breakdownMode) return;
    // Khi ở chế độ "amount": tự đổ gốc/lãi mặc định cho user sửa.
    setPrincipalPaidStr(amount > 0 ? String(amount) : "");
    setInterestPaidStr("0");
  }, [amount, breakdownMode]);

  useEffect(() => {
    if (!breakdownMode) return;
    if (principalPaidStr === "" || interestPaidStr === "") return;
    const principalNum = parseVndDigits(principalPaidStr);
    const interestNum = parseVndDigits(interestPaidStr);
    setAmount(principalNum + interestNum);
  }, [breakdownMode, principalPaidStr, interestPaidStr]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-moss-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm lg:max-w-3xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-moss-100 shrink-0">
          <h3 className="text-lg font-bold text-on-surface">{loan.loanDirection === "BORROWED" ? "Trả nợ" : "Thu nợ"}</h3>
          <button type="button" onClick={onClose} className="p-2 text-moss-400 hover:text-moss-700 hover:bg-moss-50 rounded-xl transition-colors">
            <X className="size-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-5">
            <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl lg:col-span-2">
            <span className="text-2xl">{loan.icon ?? "🏦"}</span>
            <div>
              <p className="font-bold text-on-surface text-sm truncate">{loan.name}</p>
              <p className="text-xs text-on-surface-variant">Còn {fmt(loan.remainingAmount)} {loan.currency}</p>
            </div>
            </div>

          <div className="lg:col-start-1">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Số tiền</label>
            <input
              type="text"
              inputMode="numeric"
              min={1}
              autoComplete="off"
              value={amount > 0 ? formatVndDigits(amount) : ""}
              onChange={(e) => {
                setBreakdownMode(false);
                const parsed = parseVndDigits(e.target.value);
                const next = remainingPrincipal > 0 ? Math.min(parsed, remainingPrincipal) : parsed;
                setAmount(next);
              }}
              disabled={breakdownMode}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="VD: 1.000.000"
            />
            <div className="flex gap-2 flex-wrap mt-2">
              {([500_000, 1_000_000, 2_500_000, 5_000_000].filter((v) => remainingPrincipal <= 0 ? v === 1_000_000 : v <= remainingPrincipal).length > 0
                ? [500_000, 1_000_000, 2_500_000, 5_000_000].filter((v) => remainingPrincipal <= 0 ? v === 1_000_000 : v <= remainingPrincipal)
                : remainingPrincipal > 0
                  ? [remainingPrincipal]
                  : [1_000_000]
              ).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    setBreakdownMode(false);
                    setAmount(Math.floor(v));
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    amount === v ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  {fmt(v)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:col-start-2">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Ngày</label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Tạo giao dịch</label>
              <button
                type="button"
                onClick={() => setCreateEntry((v) => !v)}
                className={`w-full flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition-colors border-2 ${
                  createEntry
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-outline-variant/20 bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <span className="tabular-nums">{createEntry ? "Vâng" : "Không"}</span>
              </button>
              <p className="mt-2 text-[10px] leading-snug text-on-surface-variant">
                {createEntry ? "Tạo giao dịch trong sổ chi tiêu & danh mục." : "Chỉ ghi nhận vào khoản nợ (không tạo giao dịch)."}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:col-start-1">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Gốc (tuỳ chọn)</label>
              <input
                type="text"
                inputMode="numeric"
                min={0}
                autoComplete="off"
                value={principalPaidStr ? formatVndDigits(parseVndDigits(principalPaidStr), { showZero: true }) : ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw.replace(/\D/g, "") === "") {
                    setPrincipalPaidStr("");
                    setBreakdownMode(true);
                    return;
                  }
                  setBreakdownMode(true);
                  setPrincipalPaidStr(String(parseVndDigits(raw)));
                }}
                placeholder="VD: 800.000"
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Lãi (tuỳ chọn)</label>
              <input
                type="text"
                inputMode="numeric"
                min={0}
                autoComplete="off"
                value={interestPaidStr ? formatVndDigits(parseVndDigits(interestPaidStr), { showZero: true }) : ""}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw.replace(/\D/g, "") === "") {
                    setInterestPaidStr("");
                    setBreakdownMode(true);
                    return;
                  }
                  setBreakdownMode(true);
                  setInterestPaidStr(String(parseVndDigits(raw)));
                }}
                placeholder="VD: 200.000"
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="lg:col-start-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Ví</label>
            <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto pr-1.5">
              {walletOptions.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setWalletId(w.id)}
                  className={`truncate px-2 py-2 rounded-xl text-[11px] font-bold transition-colors border-2 box-border ${
                    walletId === w.id ? "border-primary bg-primary/15 text-primary" : "border-transparent bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  {w.name}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-start-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Danh mục</label>
            <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto pr-1.5">
              {categoryOptions.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCategoryId(c.id)}
                  className={`truncate px-2 py-2 rounded-xl text-[11px] font-bold transition-colors border-2 box-border text-left ${
                    categoryId === c.id
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-transparent bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  <span className="mr-2">{c.icon ?? "💰"}</span>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Ghi chú</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Tuỳ chọn..."
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
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
              if (!walletId) return;
              if (!categoryId) return;
              if (!paidAt) return;
              if ((principalPaidStr && !interestPaidStr) || (!principalPaidStr && interestPaidStr)) {
                toast.error("Vui lòng nhập đủ cả gốc và lãi (hoặc bỏ trống cả hai)");
                return;
              }

              startTransition(async () => {
                await onRepay({
                  loanId: loan.id,
                  amount,
                  principalPaid: principalPaidStr ? parseVndDigits(principalPaidStr) : undefined,
                  interestPaid: interestPaidStr ? parseVndDigits(interestPaidStr) : undefined,
                  paidAt,
                  walletId,
                  categoryId,
                  note,
                  createEntry,
                });
                onClose();
              });
            }}
            className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all disabled:opacity-60"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

