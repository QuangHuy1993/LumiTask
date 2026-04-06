"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowDownLeft, Pencil, Plus, Trash2, RefreshCw } from "lucide-react";

import type { FinanceCategoryListItemDTO } from "@/features/expenses/model/financeCategoryTypes";
import type { FinanceLoanCreateInput, FinanceLoanRepayInput, FinanceLoanUpdateInput } from "@/features/expenses/model/financeLoanValidation";
import type { FinanceLoanDirection, FinanceLoanListItemDTO, FinanceLoanStatsDTO } from "@/features/expenses/model/financeLoanTypes";
import type { FinanceWalletListItemDTO } from "@/features/expenses/model/financeWalletTypes";

import {
  createLoanAction,
  deleteLoanAction,
  listLoansAction,
  recordPaymentAction,
  updateLoanAction,
} from "@/features/expenses/actions/financeLoanActions";
import { listFinanceCategoriesAction } from "@/features/expenses/actions/financeCategoryActions";
import { listWalletsAction } from "@/features/expenses/actions/financeWalletActions";

import { FinanceLoanFormModal } from "./FinanceLoanFormModal";
import { FinanceLoanRepayModal } from "./FinanceLoanRepayModal";

type TabKey = "BORROWED" | "LENT" | "CLOSED";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

function getPct(principal: number, remaining: number): number {
  if (principal <= 0) return 0;
  const paid = principal - remaining;
  return Math.max(0, Math.min(100, Math.round((paid / principal) * 100)));
}

function directionBadgeClasses(dir: FinanceLoanDirection) {
  return dir === "BORROWED" ? "bg-error/10 text-error" : "bg-primary/10 text-primary";
}

export function FinanceLoansClientImpl({
  initialLoans,
  initialStats,
}: {
  initialLoans: FinanceLoanListItemDTO[];
  initialStats: FinanceLoanStatsDTO;
}) {
  const [loans, setLoans] = useState<FinanceLoanListItemDTO[]>(initialLoans);
  const [activeTab, setActiveTab] = useState<TabKey>("BORROWED");

  const [wallets, setWallets] = useState<FinanceWalletListItemDTO[]>([]);
  const [categories, setCategories] = useState<FinanceCategoryListItemDTO[]>([]);

  const [isLoadingLists, setIsLoadingLists] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [formTarget, setFormTarget] = useState<FinanceLoanListItemDTO | null>(null);

  const [repayTarget, setRepayTarget] = useState<FinanceLoanListItemDTO | null>(null);

  const stats = useMemo((): FinanceLoanStatsDTO => {
    if (loans.length === 0) return initialStats;
    // Để đảm bảo UX ổn định, tính trực tiếp từ state thay vì phụ thuộc re-fetch
    const borrowed = loans.filter((l) => l.loanDirection === "BORROWED");
    const lent = loans.filter((l) => l.loanDirection === "LENT");

    const borrowedPrincipal = borrowed.reduce((s, l) => s + l.principalAmount, 0);
    const borrowedRemaining = borrowed.reduce((s, l) => s + l.remainingAmount, 0);
    const lentPrincipal = lent.reduce((s, l) => s + l.principalAmount, 0);
    const lentRemaining = lent.reduce((s, l) => s + l.remainingAmount, 0);

    return {
      totalBorrowedPrincipal: borrowedPrincipal,
      totalBorrowedRemaining: Math.max(0, borrowedRemaining),
      totalLentPrincipal: lentPrincipal,
      totalLentRemaining: Math.max(0, lentRemaining),
    };
  }, [loans, initialStats]);

  const refreshLoans = async () => {
    const res = await listLoansAction({ limit: 200, direction: "ALL", status: "ALL" });
    if (!res.success) {
      toast.error("Không thể tải danh sách khoản nợ");
      return;
    }
    setLoans(res.items);
  };

  useEffect(() => {
    const run = async () => {
      setIsLoadingLists(true);
      const [wRes, cRes] = await Promise.all([
        listWalletsAction({ limit: 200 }),
        listFinanceCategoriesAction({ limit: 200, kind: "ALL" }),
      ]);

      if (wRes.success) setWallets(wRes.items);
      else toast.error("Không thể tải danh sách ví");

      if (cRes.success) setCategories(cRes.items);
      else toast.error("Không thể tải danh sách danh mục");

      setIsLoadingLists(false);
    };
    void run();
  }, []);

  const visibleLoans = useMemo(() => {
    if (activeTab === "BORROWED") return loans.filter((l) => l.loanDirection === "BORROWED" && l.status === "ACTIVE");
    if (activeTab === "LENT") return loans.filter((l) => l.loanDirection === "LENT" && l.status === "ACTIVE");
    return loans.filter((l) => l.status === "CLOSED");
  }, [loans, activeTab]);

  const activeLoans = loans.filter((l) => l.status === "ACTIVE");
  const totalPaid = activeLoans.reduce((s, l) => s + l.totalPaidAmount, 0);

  const openAdd = () => {
    setFormMode("add");
    setFormTarget(null);
    setFormOpen(true);
  };

  const openEdit = (loan: FinanceLoanListItemDTO) => {
    setFormMode("edit");
    setFormTarget(loan);
    setFormOpen(true);
  };

  const onDeleteLoan = async (loanId: number) => {
    const ok = confirm("Bạn có chắc chắn muốn xoá khoản nợ này không? (cũng sẽ xoá các giao dịch liên quan)");
    if (!ok) return;
    const res = await deleteLoanAction(loanId);
    if (!res.success) {
      toast.error("Không thể xoá khoản nợ");
      return;
    }
    toast.success("Đã xoá khoản nợ");
    await refreshLoans();
  };

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-6 max-w-7xl">
      {formOpen && (
        <FinanceLoanFormModal
          mode={formMode}
          initial={
            formTarget
              ? {
                  name: formTarget.name,
                  icon: formTarget.icon,
                  loanDirection: formTarget.loanDirection,
                  principalAmount: formTarget.principalAmount,
                  currency: formTarget.currency,
                  startDate: formTarget.startDate,
                  dueDate: formTarget.dueDate,
                  interestRateApr: formTarget.interestRateApr ?? undefined,
                  status: formTarget.status,
                  note: formTarget.note ?? "",
                }
              : undefined
          }
          onClose={() => setFormOpen(false)}
          onSave={async (payload: FinanceLoanCreateInput | FinanceLoanUpdateInput) => {
            if (formMode === "add") {
              const res = await createLoanAction(payload);
              if (!res.success) {
                toast.error(res.message ?? "Không thể tạo khoản nợ");
                return;
              }
              toast.success("Đã thêm khoản nợ");
            } else if (formMode === "edit" && formTarget) {
              const res = await updateLoanAction(formTarget.id, payload);
              if (!res.success) {
                toast.error(res.message ?? "Không thể cập nhật khoản nợ");
                return;
              }
              toast.success("Đã cập nhật khoản nợ");
            }
            await refreshLoans();
          }}
        />
      )}

      {repayTarget && wallets.length > 0 && categories.length > 0 && (
        <FinanceLoanRepayModal
          loan={repayTarget}
          wallets={wallets}
          categories={categories}
          onClose={() => setRepayTarget(null)}
          onRepay={async (payload: FinanceLoanRepayInput) => {
            const res = await recordPaymentAction(payload);
            if (!res.success) {
              toast.error("Không thể ghi nhận thanh toán");
              return;
            }

            // Optimistic update để UX mượt
            setLoans((prev) =>
              prev.map((l) => {
                if (l.id !== payload.loanId) return l;
                return {
                  ...l,
                  remainingAmount: res.remainingAmountAfter,
                  status: res.statusAfter,
                  totalPaidAmount: l.totalPaidAmount + payload.amount,
                  paymentCount: l.paymentCount + 1,
                };
              }),
            );

            toast.success("Đã ghi nhận thanh toán");
          }}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-on-surface">Khoản nợ</h1>
          <p className="text-on-surface-variant text-sm mt-0.5">Tạo khoản nợ và ghi nhận trả/thu nợ, đồng bộ vào giao dịch & ngân sách.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refreshLoans()}
            className="px-3 py-3 bg-surface-container-low text-on-surface-variant rounded-xl font-bold text-sm hover:bg-surface-container transition-all disabled:opacity-60"
            disabled={isLoadingLists}
            title="Làm mới"
          >
            <RefreshCw className="size-5" />
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all"
          >
            <Plus className="size-4" />
            Thêm khoản nợ
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-2xl shadow-card border-l-4 border-[#F0C05A]">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Còn phải trả</p>
          <h3 className="text-lg font-black text-on-surface mt-1">{fmt(stats.totalBorrowedRemaining)} <span className="text-[10px] font-semibold opacity-40">VND</span></h3>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-card border-l-4 border-primary">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Còn phải thu</p>
          <h3 className="text-lg font-black text-on-surface mt-1">{fmt(stats.totalLentRemaining)} <span className="text-[10px] font-semibold opacity-40">VND</span></h3>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-card border-l-4 border-emerald-400">
          <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant opacity-60">Tổng đã trả/thu (đang chạy)</p>
          <h3 className="text-lg font-black text-on-surface mt-1">{fmt(totalPaid)} <span className="text-[10px] font-semibold opacity-40">VND</span></h3>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("BORROWED")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors border-2 ${
            activeTab === "BORROWED" ? "border-error bg-error/10 text-error" : "border-transparent bg-surface-container-low hover:bg-surface-container text-on-surface-variant"
          }`}
        >
          Tôi vay
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("LENT")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors border-2 ${
            activeTab === "LENT" ? "border-primary bg-primary/10 text-primary" : "border-transparent bg-surface-container-low hover:bg-surface-container text-on-surface-variant"
          }`}
        >
          Tôi cho vay
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("CLOSED")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors border-2 ${
            activeTab === "CLOSED" ? "border-primary bg-primary/10 text-primary" : "border-transparent bg-surface-container-low hover:bg-surface-container text-on-surface-variant"
          }`}
        >
          Đã đóng
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12 space-y-4">
          {visibleLoans.length === 0 ? (
            <div className="py-12 text-center text-on-surface-variant text-sm bg-white rounded-2xl shadow-card">
              Không có khoản nợ phù hợp.
            </div>
          ) : (
            visibleLoans.map((loan) => {
              const pct = getPct(loan.principalAmount, loan.remainingAmount);
              return (
                <div key={loan.id} className="bg-white rounded-2xl shadow-card p-6 border border-outline-variant/10">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${loan.loanDirection === "BORROWED" ? "bg-error/10" : "bg-primary/10"}`}>
                        {loan.icon ?? "🏦"}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-black text-on-surface truncate">{loan.name}</h3>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${directionBadgeClasses(loan.loanDirection)}`}>
                            {loan.loanDirection === "BORROWED" ? "Tôi vay" : "Tôi cho vay"}
                          </span>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${loan.status === "ACTIVE" ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant"}`}>
                            {loan.status === "ACTIVE" ? "Đang chạy" : "Đã đóng"}
                          </span>
                        </div>
                        <p className="text-on-surface-variant text-sm mt-1">
                          Bắt đầu: {loan.startDate.slice(0, 10)} {loan.dueDate ? `- Hạn: ${loan.dueDate.slice(0, 10)}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {loan.status === "ACTIVE" && (
                        <button
                          type="button"
                          onClick={() => setRepayTarget(loan)}
                          className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold hover:bg-primary/20 transition-colors"
                        >
                          <ArrowDownLeft className="size-4" />
                          {loan.loanDirection === "BORROWED" ? "Trả nợ" : "Thu nợ"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openEdit(loan)}
                        className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Pencil className="size-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => void onDeleteLoan(loan.id)}
                        className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-xl transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-surface-container-low rounded-xl p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Gốc</p>
                      <p className="text-lg font-black text-on-surface mt-1">{fmt(loan.principalAmount)}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-xl p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Dư còn lại</p>
                      <p className="text-lg font-black text-primary mt-1">{fmt(loan.remainingAmount)}</p>
                    </div>
                    <div className="bg-surface-container-low rounded-xl p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-60">Tiến độ</p>
                      <div className="mt-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase">Đã trả {pct}%</span>
                          <span className="text-[10px] font-bold text-primary uppercase">{pct}%</span>
                        </div>
                        <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden mt-2">
                          <div className="h-full bg-gradient-to-r from-primary to-mint-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {isLoadingLists && (
        <div className="text-center text-on-surface-variant text-sm">Đang tải danh mục & ví...</div>
      )}
    </main>
  );
}

