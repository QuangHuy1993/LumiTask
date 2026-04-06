"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Clock3,
  CheckCircle2,
  Plus,
  CreditCard,
  Bike,
  User,
  History,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  ArrowDownLeft,
} from "lucide-react";

import type { FinanceLoanListItemDTO, FinanceLoanStatsDTO } from "@/features/expenses/model/financeLoanTypes";
import { FinanceLoansClientImpl } from "./FinanceLoansClientImpl";

// ─── Types ────────────────────────────────────────────────────────────────────

type LoanStatus = "ACTIVE" | "CLOSED";

interface Loan {
  id: number;
  name: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  startDate: string;
  principalAmount: number;
  remainingAmount: number;
  interestRate?: string;
  status: LoanStatus;
}

interface RepaymentRecord {
  id: number;
  date: string;
  loanName: string;
  amount: number;
  note: string;
}

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_LOANS: Loan[] = [
  {
    id: 1,
    name: "Thẻ tín dụng TCB",
    icon: CreditCard,
    iconBg: "bg-surface-container-low",
    iconColor: "text-primary",
    startDate: "01/01/2026",
    principalAmount: 50_000_000,
    remainingAmount: 35_000_000,
    interestRate: "24%/năm",
    status: "ACTIVE",
  },
  {
    id: 2,
    name: "Vay mua xe máy",
    icon: Bike,
    iconBg: "bg-surface-container-low",
    iconColor: "text-primary",
    startDate: "15/12/2025",
    principalAmount: 40_000_000,
    remainingAmount: 10_000_000,
    status: "ACTIVE",
  },
  {
    id: 3,
    name: "Nợ cá nhân (Anh B)",
    icon: User,
    iconBg: "bg-surface-container-high",
    iconColor: "text-outline",
    startDate: "01/10/2025",
    principalAmount: 5_000_000,
    remainingAmount: 0,
    status: "CLOSED",
  },
];

const INITIAL_HISTORY: RepaymentRecord[] = [
  { id: 1, date: "12/01/2026", loanName: "Thẻ tín dụng TCB", amount: 5_000_000, note: "Thanh toán kỳ tháng 01" },
  { id: 2, date: "05/01/2026", loanName: "Vay mua xe máy", amount: 2_500_000, note: "Tiền góp hàng tháng" },
  { id: 3, date: "28/12/2025", loanName: "Thẻ tín dụng TCB", amount: 10_000_000, note: "Tất toán dư nợ cũ" },
  { id: 4, date: "01/12/2025", loanName: "Nợ cá nhân (Anh B)", amount: 5_000_000, note: "Thanh toán toàn bộ" },
];

// ─── Add Loan Modal ───────────────────────────────────────────────────────────

function AddLoanModal({ onClose, onAdd }: { onClose: () => void; onAdd: (l: Loan) => void }) {
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState(10_000_000);
  const [interest, setInterest] = useState("");
  const [startDate, setStartDate] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-moss-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-5 border-b border-moss-100">
          <h3 className="text-lg font-bold text-on-surface">Thêm khoản nợ mới</h3>
          <button onClick={onClose} className="p-2 text-moss-400 hover:text-moss-700 hover:bg-moss-50 rounded-xl transition-colors">
            <X className="size-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Tên khoản nợ</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Vay ngân hàng Vietcombank"
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Số tiền gốc (VND)</label>
            <input
              type="number"
              min={0}
              value={principal}
              onChange={(e) => setPrincipal(Number(e.target.value))}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Lãi suất</label>
              <input
                value={interest}
                onChange={(e) => setInterest(e.target.value)}
                placeholder="VD: 12%/năm"
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Ngày bắt đầu</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-3 bg-surface-container-low text-on-surface-variant rounded-xl text-sm font-bold hover:bg-surface-container transition-colors">
            Hủy
          </button>
          <button
            onClick={() => {
              if (!name.trim()) return;
              onAdd({
                id: Date.now(),
                name,
                icon: CreditCard,
                iconBg: "bg-surface-container-low",
                iconColor: "text-primary",
                startDate: startDate ? new Date(startDate).toLocaleDateString("vi-VN") : "—",
                principalAmount: principal,
                remainingAmount: principal,
                interestRate: interest || undefined,
                status: "ACTIVE",
              });
              onClose();
            }}
            className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all"
          >
            Thêm khoản nợ
          </button>
        </div>
      </div>
    </div>
  );
}

export function FinanceLoansClient({
  initialLoans,
  initialStats,
}: {
  initialLoans: FinanceLoanListItemDTO[];
  initialStats: FinanceLoanStatsDTO;
}) {
  return <FinanceLoansClientImpl initialLoans={initialLoans} initialStats={initialStats} />;
}

// ─── Repay Modal ─────────────────────────────────────────────────────────────

function RepayModal({
  loan,
  onClose,
  onRepay,
}: {
  loan: Loan;
  onClose: () => void;
  onRepay: (loanId: number, amount: number, note: string) => void;
}) {
  const [amount, setAmount] = useState(1_000_000);
  const [note, setNote] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-moss-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-5 border-b border-moss-100">
          <h3 className="text-lg font-bold text-on-surface">Ghi nhận trả nợ</h3>
          <button onClick={onClose} className="p-2 text-moss-400 hover:text-moss-700 rounded-xl transition-colors">
            <X className="size-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl">
            <loan.icon className="size-5 text-primary shrink-0" />
            <div>
              <p className="font-bold text-on-surface text-sm">{loan.name}</p>
              <p className="text-xs text-on-surface-variant">Còn {fmt(loan.remainingAmount)} VND</p>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Số tiền trả (VND)</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[500_000, 1_000_000, 2_500_000, 5_000_000].map((v) => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${amount === v ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"}`}
              >
                {fmt(v)}
              </button>
            ))}
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Ghi chú</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Thanh toán kỳ tháng 2"
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-3 bg-surface-container-low text-on-surface-variant rounded-xl text-sm font-bold hover:bg-surface-container transition-colors">
            Hủy
          </button>
          <button
            onClick={() => { onRepay(loan.id, amount, note || "Trả nợ"); onClose(); }}
            className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all"
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

// Kept for reference (mock); real UI is implemented in FinanceLoansClientImpl.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function FinanceLoansClientMock() {
  const [loans, setLoans] = useState<Loan[]>(INITIAL_LOANS);
  const [history, setHistory] = useState<RepaymentRecord[]>(INITIAL_HISTORY);
  const [showAddModal, setShowAddModal] = useState(false);
  const [repayLoan, setRepayLoan] = useState<Loan | null>(null);
  const [search, setSearch] = useState("");

  const activeLoans = loans.filter((l) => l.status === "ACTIVE");
  const totalRemaining = activeLoans.reduce((s, l) => s + l.remainingAmount, 0);
  const totalPaid = history.reduce((s, r) => s + r.amount, 0);

  // The two main featured cards + rest in compact list
  const [featured1, featured2, ...closedLoans] = loans;

  const handleAddLoan = (l: Loan) => setLoans((prev) => [l, ...prev]);

  const handleRepay = (loanId: number, amount: number, note: string) => {
    setLoans((prev) =>
      prev.map((l) => {
        if (l.id !== loanId) return l;
        const newRemaining = Math.max(l.remainingAmount - amount, 0);
        return {
          ...l,
          remainingAmount: newRemaining,
          status: newRemaining === 0 ? "CLOSED" : l.status,
        };
      })
    );
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return;
    const now = new Date().toLocaleDateString("vi-VN");
    setHistory((prev) => [{ id: Date.now(), date: now, loanName: loan.name, amount, note }, ...prev]);
  };

  const handleDeleteLoan = (id: number) => setLoans((prev) => prev.filter((l) => l.id !== id));

  const getPct = (l: Loan) =>
    Math.round(((l.principalAmount - l.remainingAmount) / l.principalAmount) * 100);

  const filteredHistory = history.filter(
    (r) =>
      r.loanName.toLowerCase().includes(search.toLowerCase()) ||
      r.note.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 max-w-7xl">
      {/* Modals */}
      {showAddModal && <AddLoanModal onClose={() => setShowAddModal(false)} onAdd={handleAddLoan} />}
      {repayLoan && (
        <RepayModal
          loan={repayLoan}
          onClose={() => setRepayLoan(null)}
          onRepay={handleRepay}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-on-surface">Quản lý khoản nợ</h1>
          <p className="text-on-surface-variant text-sm mt-0.5">Theo dõi dư nợ và tiến độ trả nợ</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all"
        >
          <Plus className="size-4" />
          Thêm khoản nợ
        </button>
      </div>

      {/* KPI Cards - Super Optimized for Mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white p-3.5 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] shadow-card flex items-start justify-between border-l-4 border-[#F0C05A]">
          <div className="min-w-0">
            <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-0.5 sm:mb-2 opacity-60 truncate">Dư nợ còn lại</p>
            <h3 className="text-base sm:text-2xl font-black text-on-surface truncate">
              {fmt(totalRemaining)} <span className="text-[8px] sm:text-[10px] font-semibold opacity-40">VND</span>
            </h3>
          </div>
          <div className="bg-[#F0C05A]/20 p-2 sm:p-3 rounded-lg sm:rounded-2xl shrink-0">
            <AlertTriangle className="size-4 sm:size-6 text-[#7a5900]" />
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] shadow-card flex items-start justify-between border-l-4 border-primary">
          <div className="min-w-0">
            <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-0.5 sm:mb-2 opacity-60 truncate">Khoản nợ chạy</p>
            <h3 className="text-base sm:text-2xl font-black text-on-surface truncate">
              {String(activeLoans.length).padStart(2, "0")} <span className="text-[8px] sm:text-[10px] font-semibold opacity-40 uppercase tracking-widest">Mục</span>
            </h3>
          </div>
          <div className="bg-primary/10 p-2 sm:p-3 rounded-lg sm:rounded-2xl shrink-0">
            <Clock3 className="size-4 sm:size-6 text-primary" />
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] shadow-card flex items-start justify-between border-l-4 border-emerald-400 col-span-2 lg:col-span-1">
          <div className="min-w-0">
            <p className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-0.5 sm:mb-2 opacity-60 truncate">Tổng đã trả</p>
            <h3 className="text-base sm:text-2xl font-black text-on-surface truncate">
              {fmt(totalPaid)} <span className="text-[8px] sm:text-[10px] font-semibold opacity-40 text-on-surface-variant">VND</span>
            </h3>
          </div>
          <div className="bg-primary/10 p-2 sm:p-3 rounded-lg sm:rounded-2xl shrink-0">
            <CheckCircle2 className="size-4 sm:size-6 text-primary" />
          </div>
        </div>
      </div>

      {/* Loan Detail Grid */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-6">Danh sách khoản vay chi tiết</p>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Featured Card 1 — Large */}
          {featured1 && (
            <div className="lg:col-span-8 bg-white rounded-2xl overflow-hidden shadow-card group hover:-translate-y-1 transition-all duration-300">
              {/* Top accent bar */}
              <div className="h-1.5 sm:h-2 w-full bg-gradient-to-r from-primary to-mint-400" />
              <div className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6 sm:mb-8">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${featured1.iconBg} flex items-center justify-center`}>
                      <featured1.icon className={`size-5 sm:size-6 ${featured1.iconColor}`} />
                    </div>
                    <div>
                      <h4 className="text-lg sm:text-xl font-bold text-on-surface">{featured1.name}</h4>
                      <p className="text-[10px] sm:text-xs text-on-surface-variant font-medium">Bắt đầu: {featured1.startDate}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${featured1.status === "ACTIVE" ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant"}`}>
                      {featured1.status === "ACTIVE" ? "Đang chạy" : "Đã đóng"}
                    </span>
                    {featured1.status === "ACTIVE" && (
                      <button
                        onClick={() => setRepayLoan(featured1)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-[10px] font-bold hover:bg-primary/20 transition-colors"
                      >
                        <ArrowDownLeft className="size-3" />
                        Trả nợ
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-bold text-on-surface-variant uppercase opacity-60 mb-0.5 sm:mb-1">Gốc ban đầu</p>
                    <p className="text-base sm:text-lg font-black text-on-surface">{fmt(featured1.principalAmount)} <span className="text-[10px] font-normal uppercase">VND</span></p>
                  </div>
                  <div>
                    <p className="text-[9px] sm:text-[10px] font-bold text-on-surface-variant uppercase opacity-60 mb-0.5 sm:mb-1">Dư nợ còn</p>
                    <p className="text-base sm:text-lg font-black text-primary">{fmt(featured1.remainingAmount)} <span className="text-[10px] font-normal uppercase">VND</span></p>
                  </div>
                  {featured1.interestRate && (
                    <div className="col-span-2 md:col-span-1">
                      <p className="text-[9px] sm:text-[10px] font-bold text-on-surface-variant uppercase opacity-60 mb-0.5 sm:mb-1">Lãi suất</p>
                      <p className="text-base sm:text-lg font-black text-[#7a5900]">{featured1.interestRate}</p>
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-[10px] sm:text-xs font-bold text-on-surface-variant uppercase tracking-widest">Tiến độ thanh toán</span>
                    <span className="text-sm sm:text-base font-black text-on-surface">{getPct(featured1)}%</span>
                  </div>
                  <div className="h-2 sm:h-2.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-mint-400 rounded-full shadow-sm transition-all duration-700"
                      style={{ width: `${getPct(featured1)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Featured Card 2 — Small */}
          {featured2 && (
            <div className="lg:col-span-4 bg-white rounded-2xl shadow-card group hover:-translate-y-1 transition-all duration-300">
              <div className="p-8 h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 rounded-xl ${featured2.iconBg} flex items-center justify-center`}>
                    <featured2.icon className={`size-5 ${featured2.iconColor}`} />
                  </div>
                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${featured2.status === "ACTIVE" ? "bg-primary/10 text-primary" : "bg-surface-container-high text-on-surface-variant"}`}>
                    {featured2.status === "ACTIVE" ? "Đang chạy" : "Đã đóng"}
                  </span>
                </div>
                <h4 className="text-lg font-bold text-on-surface mb-1">{featured2.name}</h4>
                <p className="text-xs text-on-surface-variant font-medium mb-6">Bắt đầu: {featured2.startDate}</p>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-xs text-on-surface-variant uppercase font-bold">Còn lại</span>
                    <span className="text-sm font-bold text-on-surface">{fmt(featured2.remainingAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-on-surface-variant uppercase font-bold">Gốc</span>
                    <span className="text-sm font-bold text-on-surface-variant">{fmt(featured2.principalAmount)}</span>
                  </div>
                </div>
                <div className="mt-auto space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase">Tiến độ {getPct(featured2)}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-mint-400 rounded-full transition-all duration-700" style={{ width: `${getPct(featured2)}%` }} />
                  </div>
                </div>
                {featured2.status === "ACTIVE" && (
                  <button
                    onClick={() => setRepayLoan(featured2)}
                    className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 bg-primary/10 text-primary rounded-xl text-sm font-bold hover:bg-primary/20 transition-colors"
                  >
                    <ArrowDownLeft className="size-4" />
                    Ghi nhận trả nợ
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Closed loans — compact row */}
          {closedLoans.map((loan) => {
            const pct = getPct(loan);
            return (
              <div
                key={loan.id}
                className={`lg:col-span-12 bg-surface-container-low rounded-xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 border-2 border-dashed border-outline-variant/30 ${
                  loan.status === "CLOSED" ? "opacity-75 grayscale hover:grayscale-0 transition-all duration-300" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full ${loan.iconBg} flex items-center justify-center`}>
                    <loan.icon className={`size-5 ${loan.iconColor}`} />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-on-surface">{loan.name}</h4>
                    <p className="text-xs text-on-surface-variant">Bắt đầu: {loan.startDate}</p>
                  </div>
                </div>
                <div className="flex-1 max-w-md w-full px-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase">
                      {loan.status === "CLOSED" ? "Hoàn thành 100%" : `Tiến độ ${pct}%`}
                    </span>
                    <span className="text-[10px] font-bold text-primary uppercase">
                      {fmt(loan.remainingAmount)} VND còn lại
                    </span>
                  </div>
                  <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {loan.status === "CLOSED" ? (
                    <div className="flex items-center gap-2">
                      <span className="bg-surface-container-highest text-on-surface-variant text-[10px] font-black px-4 py-2 rounded-lg uppercase border border-outline-variant/50">
                        Đã đóng
                      </span>
                      <div className="bg-primary/10 text-primary p-2 rounded-full">
                        <CheckCircle2 className="size-4" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setRepayLoan(loan)} className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-colors" title="Trả nợ">
                        <ArrowDownLeft className="size-4" />
                      </button>
                      <button onClick={() => handleDeleteLoan(loan.id)} className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-xl transition-colors" title="Xóa">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Repayment History Section */}
      <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 shadow-card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <h3 className="text-lg font-black text-on-surface flex items-center gap-2">
            <History className="size-5 text-primary" />
            Lịch sử thanh toán
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              className="flex-1 sm:w-48 bg-surface-container-low border-none rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
            <button className="p-2.5 bg-surface-container-low rounded-xl text-primary hover:bg-primary/10 transition-all">
              <MoreVertical className="size-5" />
            </button>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-y-3">
            <thead>
              <tr className="text-on-surface-variant/60">
                {["Ngày trả", "Khoản nợ", "Số tiền", "Ghi chú", "Thao tác"].map((h, i) => (
                  <th key={h} className={`px-4 pb-2 text-[10px] font-black uppercase tracking-widest ${i === 4 ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((r) => (
                <tr key={r.id} className="group hover:bg-surface-container-low/50 transition-colors duration-150">
                  <td className="px-4 py-4 rounded-l-xl text-sm font-semibold text-on-surface">{r.date}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="text-sm font-bold text-on-surface">{r.loanName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-black text-on-surface">{fmt(r.amount)} VND</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-on-surface-variant">{r.note}</td>
                  <td className="px-4 py-4 rounded-r-xl text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="p-2 hover:bg-surface-container-high rounded-xl transition-colors text-on-surface-variant hover:text-primary">
                        <Pencil className="size-3.5" />
                      </button>
                      <button className="p-2 hover:bg-error/10 rounded-xl transition-colors text-on-surface-variant hover:text-error">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-on-surface-variant text-sm">
                    Không tìm thấy lịch sử nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View - Super Optimized */}
        <div className="md:hidden space-y-2.5">
          {filteredHistory.map((r) => (
            <div key={r.id} className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/10">
              <div className="flex justify-between items-start">
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-0.5 opacity-60">{r.date}</p>
                  <p className="font-black text-on-surface text-sm leading-tight truncate">{r.loanName}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-black text-on-surface">{fmt(r.amount)} đ</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-outline-variant/10">
                <p className="text-[10px] text-on-surface-variant italic truncate opacity-70 flex-1">{r.note || "Không có ghi chú"}</p>
                <div className="flex items-center gap-1 ml-2">
                  <button className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"><Pencil className="size-3.5" /></button>
                  <button className="p-1.5 text-on-surface-variant hover:text-error transition-colors"><Trash2 className="size-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
          {filteredHistory.length === 0 && (
            <div className="py-12 text-center text-on-surface-variant text-sm">
              Không tìm thấy lịch sử nào.
            </div>
          )}
        </div>
    </main>
  );
}
