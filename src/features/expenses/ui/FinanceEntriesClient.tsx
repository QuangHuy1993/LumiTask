"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  ArrowLeftRight,
  Search,
  ChevronDown,
  Eye,
  Pencil,
  Trash2,
  ArrowUpDown,
  CheckCircle2,
  Clock3,
  BanIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { ExpensesSubNav } from "@/features/expenses/ui/ExpensesSubNav";
import { EntriesMonthCalendar } from "@/features/expenses/ui/EntriesMonthCalendar";
import {
  getTodayIsoDateKeyLocal,
  toDateLocalFromIsoDateKey,
  toDdMmYyyyFromIsoDateKey,
} from "@/features/expenses/utils/entryCalendarDates";

import { FinanceEntryFormModal } from "./FinanceEntryFormModal";
import { FinanceTransferModal } from "./FinanceTransferModal";
import { FinanceEntryDetailDrawer, FinanceDeleteConfirmModal, AmountText } from "./FinanceEntryDetailComponents";

import {
  getEntriesAction,
  getMonthOverviewAction,
  getMonthAndEntriesAction,
  createEntryAction,
  updateEntryAction,
  deleteEntryAction,
  createTransferAction
} from "../actions/financeEntryActions";
import { listWalletsAction } from "../actions/financeWalletActions";
import { listFinanceCategoriesAction } from "../actions/financeCategoryActions";
import type { EntryFormInput, EntryListItemDTO, TransferFormInput } from "../model/financeEntryTypes";
import type { FinanceEntryLifecycle } from "@prisma/client";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

function KindBadge({ kind }: { kind: string }) {
  if (kind === "INCOME") return <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">Thu nhập</span>;
  if (kind === "EXPENSE") return <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-error/10 text-error text-[10px] font-bold uppercase tracking-wider">Chi tiêu</span>;
  return <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-on-surface-variant/10 text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">Chuyển khoản</span>;
}

function LifecycleBadge({ status }: { status: string }) {
  if (status === "POSTED") return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary"><CheckCircle2 className="size-3" /> Đã thực hiện</span>;
  if (status === "PLANNED") return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7a5900]"><Clock3 className="size-3" /> Dự kiến</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-on-surface-variant"><BanIcon className="size-3" /> Đã hủy</span>;
}

type KindFilterValue = "ALL" | "INCOME" | "EXPENSE" | "TRANSFER";
type LifecycleFilterValue = "ALL" | FinanceEntryLifecycle;

const KIND_FILTER_OPTIONS: { label: string; value: KindFilterValue }[] = [
  { label: "Tất cả", value: "ALL" },
  { label: "Thu", value: "INCOME" },
  { label: "Chi", value: "EXPENSE" },
  { label: "Chuyển khoản", value: "TRANSFER" },
];

export function FinanceEntriesClient() {
  const todayKey = getTodayIsoDateKeyLocal();
  const [view, setView] = useState<"calendar" | "day">("calendar");
  const [selectedDayKey, setSelectedDayKey] = useState<string>(() => todayKey);
  const [dayLoadTrigger, setDayLoadTrigger] = useState(0);
  const [loadedDayKey, setLoadedDayKey] = useState<string | null>(null);
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // — Server Data —
  const [entries, setEntries] = useState<EntryListItemDTO[]>([]);
  const [dayNextCursorId, setDayNextCursorId] = useState<number | null>(null);
  const [dayStats, setDayStats] = useState<{ totalIncome: number; totalExpense: number; netBalance: number; entryCount: number } | null>(null);

  const [dayCounts, setDayCounts] = useState<Record<string, number>>({});

  const [, setIsLoading] = useState(false);
  const [isDayLoading, setIsDayLoading] = useState(false);
  const [wallets, setWallets] = useState<Array<{ id: number; name: string }>>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string; icon: string | null; kind: "INCOME" | "EXPENSE" }>>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilterValue>("ALL");
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilterValue>("ALL");
  const [walletFilter, setWalletFilter] = useState("Tất cả");

  const [openLifecycleDropdown, setOpenLifecycleDropdown] = useState(false);
  const [openWalletDropdown, setOpenWalletDropdown] = useState(false);
  const lifecycleDropdownRef = useRef<HTMLDivElement>(null);
  const walletDropdownRef = useRef<HTMLDivElement>(null);
  const lifecycleTriggerRef = useRef<HTMLButtonElement>(null);
  const walletTriggerRef = useRef<HTMLButtonElement>(null);
  const [lifecycleMenuStyle, setLifecycleMenuStyle] = useState<React.CSSProperties>({});
  const [walletMenuStyle, setWalletMenuStyle] = useState<React.CSSProperties>({});

  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [editEntry, setEditEntry] = useState<EntryListItemDTO | null>(null);
  const [detailEntry, setDetailEntry] = useState<EntryListItemDTO | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<EntryListItemDTO | null>(null);

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  // 1) Load wallets + categories (ít thay đổi)
  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setIsLoading(true);
      const [walletsRes, categoriesRes] = await Promise.all([
        listWalletsAction({ limit: 200 }),
        listFinanceCategoriesAction({ limit: 200, isActive: true }),
      ]);

      if (active) {
        if (walletsRes.success) {
          setWallets(walletsRes.items ?? []);
        }
        if (categoriesRes.success) {
          setCategories(categoriesRes.items ?? []);
        }
        if (!walletsRes.success) toast.error(walletsRes.error || "Không tải được danh sách ví");
        if (!categoriesRes.success) toast.error(categoriesRes.error || "Không tải được danh mục");
        setIsLoading(false);
      }
    };
    fetchData();
    return () => { active = false; };
  }, []);

  const periodKey = useMemo(() => {
    const m = calendarMonth.getMonth() + 1;
    const y = calendarMonth.getFullYear();
    return `${y}-${m.toString().padStart(2, "0")}`;
  }, [calendarMonth]);

  /** Một request: lịch tháng + danh sách ngày (sau khi thêm/sửa/xóa/chuyển khoản) */
  const refreshMonthAndDay = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setIsDayLoading(true);
    }
    const res = await getMonthAndEntriesAction({
      periodKey,
      limit: 50,
      sortKey: "NEWEST",
      dateFrom: selectedDayKey,
      dateTo: selectedDayKey,
    });
    if (!res.success) {
      toast.error(res.error || "Không tải được dữ liệu");
      if (!opts?.silent) {
        setIsDayLoading(false);
      }
      return;
    }
    setDayCounts(res.monthOverview.dayCounts);
    setDayStats({
      totalIncome: res.stats.totalIncome,
      totalExpense: res.stats.totalExpense,
      netBalance: res.stats.netBalance,
      entryCount: res.stats.entryCount,
    });
    setDayNextCursorId(res.nextCursorId);
    setEntries(res.items ?? []);
    setLoadedDayKey(selectedDayKey);
    if (!opts?.silent) {
      setIsDayLoading(false);
    }
  };

  const refreshDayEntries = async (opts?: { cursorId?: number; append?: boolean }) => {
    setIsDayLoading(true);
    const res = await getEntriesAction({
      limit: 50,
      dateFrom: selectedDayKey,
      dateTo: selectedDayKey,
      sortKey: "NEWEST",
      cursorId: opts?.cursorId,
    });

    if (!res.success) {
      toast.error(res.error || "Không tải được giao dịch ngày đã chọn");
      setIsDayLoading(false);
      return;
    }

    setDayStats({
      totalIncome: res.stats.totalIncome,
      totalExpense: res.stats.totalExpense,
      netBalance: res.stats.netBalance,
      entryCount: res.stats.entryCount,
    });

    setDayNextCursorId(res.nextCursorId);

    if (opts?.append) {
      setEntries((prev) => [...prev, ...(res.items ?? [])]);
      setLoadedDayKey(selectedDayKey);
      setIsDayLoading(false);
      return;
    }

    setEntries(res.items ?? []);
    setLoadedDayKey(selectedDayKey);
    setIsDayLoading(false);
  };

  // 2) Load month overview when month changes (lightweight: dayCounts + stats)
  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsLoading(true);
      const res = await getMonthOverviewAction({ periodKey });
      if (!active) return;
      if (res.success) {
        setDayCounts(res.data.dayCounts);
      } else {
        toast.error(res.error || "Không tải được tổng quan tháng");
      }
      setIsLoading(false);
    };
    run();
    return () => { active = false; };
  }, [periodKey]);

  // 3) Load entries for selected day only (paginated: 50)
  useEffect(() => {
    let active = true;
    const run = async () => {
      setIsDayLoading(true);
      const res = await getEntriesAction({
        limit: 50,
        dateFrom: selectedDayKey,
        dateTo: selectedDayKey,
        sortKey: "NEWEST",
      });
      if (!active) return;

      if (res.success) {
        setEntries(res.items ?? []);
        setDayNextCursorId(res.nextCursorId);
        setDayStats({
          totalIncome: res.stats.totalIncome,
          totalExpense: res.stats.totalExpense,
          netBalance: res.stats.netBalance,
          entryCount: res.stats.entryCount,
        });
        setLoadedDayKey(selectedDayKey);
      } else {
        toast.error(res.error || "Không tải được giao dịch ngày đã chọn");
      }
      setIsDayLoading(false);
    };
    run();
    return () => { active = false; };
  }, [selectedDayKey, dayLoadTrigger]);

  const walletOptions = ["Tất cả", ...wallets.map(w => w.name)];

  useEffect(() => {
    function handleMouseDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!lifecycleTriggerRef.current?.contains(target) && !lifecycleDropdownRef.current?.contains(target)) setOpenLifecycleDropdown(false);
      if (!walletTriggerRef.current?.contains(target) && !walletDropdownRef.current?.contains(target)) setOpenWalletDropdown(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  function calcMenuStyle(triggerRef: React.RefObject<HTMLButtonElement | null>): React.CSSProperties {
    if (!triggerRef.current) return {};
    const rect = triggerRef.current.getBoundingClientRect();
    const menuHeight = 200;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow > menuHeight ? rect.bottom + 6 : rect.top - menuHeight - 6;
    return { position: "fixed", top, left: rect.left, minWidth: rect.width, zIndex: 9999 };
  }

  // Lọc dữ liệu trên Client cho Ngày đã chọn
  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (kindFilter !== "ALL") {
        if (kindFilter === "TRANSFER" && !e.isTransfer) return false;
        if (kindFilter !== "TRANSFER" && e.entryKind !== kindFilter) return false;
      }
      if (lifecycleFilter !== "ALL" && e.lifecycleStatus !== lifecycleFilter) return false;
      if (walletFilter !== "Tất cả" && e.walletName !== walletFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!e.note?.toLowerCase().includes(term) && !e.categoryName?.toLowerCase().includes(term) && !e.walletName.toLowerCase().includes(term)) return false;
      }
      return true;
    });
  }, [entries, kindFilter, lifecycleFilter, walletFilter, searchTerm]);

  useEffect(() => { setPage(1); }, [selectedDayKey, kindFilter, lifecycleFilter, walletFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const isDayReady = loadedDayKey === selectedDayKey && !isDayLoading;

  const totalIncome = isDayReady ? (dayStats?.totalIncome ?? 0) : 0;
  const totalExpense = isDayReady ? (dayStats?.totalExpense ?? 0) : 0;
  const netBalance = isDayReady ? (dayStats?.netBalance ?? 0) : 0;
  const netPct = totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : 0;

  const topExpenseCategory = useMemo(() => {
    const totals: Record<string, { amount: number; icon: string }> = {};
    for (const e of entries) {
      if (e.entryKind !== "EXPENSE" || e.lifecycleStatus !== "POSTED") continue;
      if (e.occurredAt.slice(0,10) !== selectedDayKey) continue;
      if (!e.categoryName) continue;
      const prev = totals[e.categoryName];
      totals[e.categoryName] = { amount: (prev?.amount ?? 0) + e.amountRaw, icon: e.categoryIcon ?? "💰" };
    }
    const entries2 = Object.entries(totals);
    if (entries2.length === 0) return null;
    const [label, { amount, icon }] = entries2.sort((a, b) => b[1].amount - a[1].amount)[0];
    return { label, amount, icon };
  }, [entries, selectedDayKey]);

  const expenseByCategory = useMemo(() => {
    if (!isDayReady) return [];
    const totals: Record<string, { amount: number; icon: string | null }> = {};
    for (const e of entries) {
      if (e.entryKind !== "EXPENSE" || e.lifecycleStatus !== "POSTED") continue;
      const name = e.categoryName ?? "Không danh mục";
      const prev = totals[name];
      totals[name] = {
        amount: (prev?.amount ?? 0) + e.amountRaw,
        icon: prev?.icon ?? e.categoryIcon ?? null,
      };
    }
    return Object.entries(totals)
      .map(([name, v]) => ({ name, amount: v.amount, icon: v.icon }))
      .sort((a, b) => b.amount - a.amount);
  }, [entries, isDayReady]);

  // ACTIONS
  const handleAddEntry = async (data: EntryFormInput) => {
    const res = await createEntryAction(data);
    if (res.success) {
      await refreshMonthAndDay({ silent: true });
      toast.success("Tạo giao dịch thành công");
    } else {
      toast.error(res.error || "Lỗi khi tạo giao dịch");
    }
  };

  const handleEditEntry = async (data: EntryFormInput) => {
    if (!editEntry) return;
    const res = await updateEntryAction(editEntry.id, data);
    if (res.success) {
      await refreshMonthAndDay({ silent: true });
      toast.success("Sửa giao dịch thành công");
    } else {
      toast.error(res.error || "Lỗi khi sửa giao dịch");
    }
  };

  const handleDeleteEntry = async () => {
    if (!deleteEntry) return;
    const res = await deleteEntryAction(deleteEntry.id);
    if (res.success) {
      await refreshMonthAndDay({ silent: true });
      toast.success("Xoá giao dịch thành công");
    } else {
      toast.error(res.error || "Lỗi khi xóa giao dịch");
    }
  };
  
  const handleAddTransfer = async (data: TransferFormInput) => {
    const res = await createTransferAction(data);
    if (res.success) {
      await refreshMonthAndDay({ silent: true });
      toast.success("Chuyển khoản thành công");
    } else {
      toast.error(res.error || "Lỗi khi chuyển khoản");
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 w-full">
      <ExpensesSubNav />

      {showAddModal && (
        <FinanceEntryFormModal 
          mode="add" 
          defaultDateIso={selectedDayKey} 
          onClose={() => setShowAddModal(false)} 
          onSave={handleAddEntry} 
          wallets={wallets} 
          categories={categories}
        />
      )}
      {editEntry && (
        <FinanceEntryFormModal 
          mode="edit" 
          initial={editEntry} 
          onClose={() => setEditEntry(null)} 
          onSave={handleEditEntry} 
          wallets={wallets} 
          categories={categories}
        />
      )}
      {showTransferModal && (
        <FinanceTransferModal 
          defaultDateIso={selectedDayKey} 
          onClose={() => setShowTransferModal(false)} 
          onSave={handleAddTransfer} 
          wallets={wallets} 
        />
      )}
      {detailEntry && !deleteEntry && (
        <FinanceEntryDetailDrawer entry={detailEntry} onClose={() => setDetailEntry(null)} onEdit={() => { setEditEntry(detailEntry); setDetailEntry(null); }} onDelete={() => setDeleteEntry(detailEntry)} />
      )}
      {deleteEntry && (
        <FinanceDeleteConfirmModal entry={deleteEntry} onClose={() => setDeleteEntry(null)} onConfirm={handleDeleteEntry} />
      )}

      <EntriesMonthCalendar
        visibleMonth={calendarMonth}
        selectedDayKey={selectedDayKey}
        todayKey={todayKey}
        dayCounts={dayCounts}
        onPrevMonth={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
        onNextMonth={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
        onPickDay={(dayKey) => {
          setLoadedDayKey(null);
          setEntries([]);
          setDayStats(null);
          setDayNextCursorId(null);
          setSelectedDayKey(dayKey);
          setDayLoadTrigger((t) => t + 1);
          const picked = toDateLocalFromIsoDateKey(dayKey);
          setCalendarMonth(new Date(picked.getFullYear(), picked.getMonth(), 1));
          setView("day");
        }}
      />

      {view === "day" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-on-surface">
              {`Giao dịch ngày ${toDdMmYyyyFromIsoDateKey(selectedDayKey)}`}
            </h1>
            <p className="text-on-surface-variant text-sm mt-0.5">
              Xem thu nhập/chi tiêu trong ngày đã chọn
            </p>
            <button type="button" onClick={() => setView("calendar")} className="mt-2 inline-flex items-center gap-2 text-[11px] font-bold text-primary hover:underline">
              ← Lịch
            </button>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/expenses/tags" className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-on-surface-variant font-bold text-xs sm:text-sm hover:bg-surface-container-low rounded-xl transition-colors border border-outline-variant/20">
              <span className="whitespace-nowrap">Quản lý thẻ</span>
            </Link>
            <button onClick={() => setShowTransferModal(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 text-primary font-bold text-xs sm:text-sm hover:bg-primary/5 rounded-xl transition-colors border border-primary/20">
              <ArrowLeftRight className="size-4" />
              <span className="whitespace-nowrap">Chuyển khoản</span>
            </button>
            <button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 bg-primary text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all">
              <Plus className="size-4" />
              <span className="whitespace-nowrap">Thêm mới</span>
            </button>
          </div>
        </div>
      )}

      {view === "day" && (
        <>
        {!isDayReady ? (
          <div className="flex justify-center py-14">
            <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          <div className="group relative bg-white p-3.5 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] overflow-hidden shadow-card border border-outline-variant/5">
            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-primary/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
            <div className="relative flex flex-col gap-2 sm:gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[8px] sm:text-[10px] font-black text-primary uppercase tracking-widest opacity-60">Thu nhập</span>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center"><TrendingUp className="size-4 sm:size-5 text-primary" /></div>
              </div>
              <div>
                <p className="text-lg sm:text-3xl font-black text-on-surface tracking-tight">{fmt(totalIncome)} <span className="text-[8px] sm:text-xs font-medium opacity-40">VND</span></p>
                <p className="hidden sm:flex text-[10px] sm:text-xs text-primary font-bold mt-1 items-center gap-1"><TrendingUp className="size-3" /> +12%</p>
              </div>
            </div>
          </div>
          <div className="group relative bg-white p-3.5 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] overflow-hidden shadow-card border border-outline-variant/5">
            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-16 h-16 bg-error/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
            <div className="relative flex flex-col gap-2 sm:gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[8px] sm:text-[10px] font-black text-error uppercase tracking-widest opacity-60">Chi tiêu</span>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-error/10 flex items-center justify-center"><TrendingDown className="size-4 sm:size-5 text-error" /></div>
              </div>
              <div>
                <p className="text-lg sm:text-3xl font-black text-on-surface tracking-tight">{fmt(totalExpense)} <span className="text-[8px] sm:text-xs font-medium opacity-40">VND</span></p>
                <p className="hidden sm:flex text-[10px] sm:text-xs text-error font-bold mt-1 items-center gap-1"><TrendingDown className="size-3" /> -4.2%</p>
              </div>
            </div>
          </div>
          <div className="group relative bg-white p-3.5 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] overflow-hidden shadow-card border border-outline-variant/5 col-span-2 lg:col-span-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex flex-col gap-2 sm:gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[8px] sm:text-[10px] font-black text-on-surface-variant uppercase tracking-widest opacity-60">Số dư ròng</span>
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-surface-container-highest flex items-center justify-center"><Wallet className="size-4 sm:size-5 text-on-surface-variant" /></div>
              </div>
              <div>
                <div className="flex items-end gap-2">
                  <p className={`text-xl sm:text-3xl font-black tracking-tight ${netBalance >= 0 ? "text-primary" : "text-error"}`}>
                    {netBalance >= 0 ? "+" : "-"}{fmt(Math.abs(netBalance))}
                  </p>
                  <span className="text-[8px] sm:text-xs font-medium text-on-surface-variant opacity-40 mb-1">VND</span>
                </div>
                <div className="mt-1.5 sm:mt-2 h-1 sm:h-1.5 w-full bg-outline-variant/20 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${Math.min(netPct, 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {isDayReady && (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-3 px-1">
              <h2 className="text-sm sm:text-base font-black text-on-surface">Tổng chi theo danh mục</h2>
              {topExpenseCategory && (
                <p className="text-[10px] sm:text-xs font-bold text-on-surface-variant">
                  Cao nhất: <span className="text-error">{topExpenseCategory.label}</span> ({fmt(topExpenseCategory.amount)} VND)
                </p>
              )}
            </div>
            {expenseByCategory.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 shadow-card border border-outline-variant/10">
                <p className="text-sm font-bold text-on-surface-variant/60">Hôm nay chưa có khoản chi.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {expenseByCategory.map((c) => (
                  <div
                    key={c.name}
                    className="group relative bg-white p-3.5 sm:p-4 rounded-[1.25rem] sm:rounded-[1.5rem] overflow-hidden shadow-card border border-outline-variant/5"
                  >
                    <div className="absolute top-0 right-0 -mt-2 -mr-2 w-12 h-12 bg-error/5 rounded-full blur-lg group-hover:scale-150 transition-transform duration-700" />
                    <div className="relative flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center text-lg shrink-0">
                        {c.icon ?? "💸"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest leading-none mb-1 truncate">
                          {c.name}
                        </p>
                        <p className="text-sm sm:text-base font-black text-error tracking-tight">
                          {fmt(c.amount)}<span className="text-[8px] font-medium opacity-40 ml-1">VND</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-[2rem] p-2 shadow-card border border-outline-variant/10">
          <div className="flex flex-col lg:flex-row lg:items-center gap-2">
            <div className="relative w-full lg:flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant/50" />
              <input type="text" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Tìm kiếm..." className="w-full pl-10 pr-4 py-3 bg-white border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 outline-none placeholder:text-on-surface-variant/40" />
            </div>
            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-1 lg:pb-0">
              <div className="flex p-1 bg-surface-container-high rounded-2xl shrink-0">
                {KIND_FILTER_OPTIONS.map(({ label, value }) => (
                  <button key={value} onClick={() => { setKindFilter(value); setPage(1); }} className={`px-3 sm:px-4 py-2 text-[10px] sm:text-xs font-bold rounded-xl transition-all whitespace-nowrap ${kindFilter === value ? "bg-white shadow-sm text-primary" : "text-on-surface-variant hover:bg-white/50"}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="shrink-0">
                <button ref={lifecycleTriggerRef} type="button" onClick={() => { const next = !openLifecycleDropdown; if (next) setLifecycleMenuStyle(calcMenuStyle(lifecycleTriggerRef)); setOpenLifecycleDropdown(next); setOpenWalletDropdown(false); }} className="flex items-center gap-2 px-3 sm:px-4 py-3 bg-white rounded-2xl text-[10px] sm:text-xs font-bold text-on-surface-variant hover:bg-white/80 transition-all whitespace-nowrap">
                  Trạng thái: <span className="text-primary">{lifecycleFilter === "ALL" ? "Tất cả" : lifecycleFilter === "POSTED" ? "Xong" : "Dự kiến"}</span>
                  <ChevronDown className={`size-3.5 transition-transform ${openLifecycleDropdown ? "rotate-180" : ""}`} />
                </button>
                {openLifecycleDropdown && typeof document !== "undefined" && createPortal(
                  <div ref={lifecycleDropdownRef} style={lifecycleMenuStyle} className="bg-white rounded-2xl shadow-xl border border-outline-variant/10 py-1 min-w-[160px] max-h-[260px] overflow-y-auto no-scrollbar">
                    {(["ALL", "POSTED", "PLANNED", "VOIDED"] as LifecycleFilterValue[]).map((v) => (
                      <button key={v} type="button" onClick={() => { setLifecycleFilter(v); setPage(1); setOpenLifecycleDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-surface-container-low transition-colors ${lifecycleFilter === v ? "text-primary" : "text-on-surface-variant"}`}>
                        {v === "ALL" ? "Tất cả" : v === "POSTED" ? "Đã thực hiện" : v === "PLANNED" ? "Dự kiến" : "Đã hủy"}
                      </button>
                    ))}
                  </div>,
                  document.body
                )}
              </div>
              <div className="shrink-0">
                <button ref={walletTriggerRef} type="button" onClick={() => { const next = !openWalletDropdown; if (next) setWalletMenuStyle(calcMenuStyle(walletTriggerRef)); setOpenWalletDropdown(next); setOpenLifecycleDropdown(false); }} className="flex items-center gap-2 px-3 sm:px-4 py-3 bg-white rounded-2xl text-[10px] sm:text-xs font-bold text-on-surface-variant hover:bg-white/80 transition-all whitespace-nowrap">
                  Ví: <span className="text-primary">{walletFilter}</span>
                  <ChevronDown className={`size-3.5 transition-transform ${openWalletDropdown ? "rotate-180" : ""}`} />
                </button>
                {openWalletDropdown && typeof document !== "undefined" && createPortal(
                  <div ref={walletDropdownRef} style={walletMenuStyle} className="bg-white rounded-2xl shadow-xl border border-outline-variant/10 py-1 min-w-[140px] max-h-[260px] overflow-y-auto no-scrollbar">
                    {walletOptions.map((w) => (
                      <button key={w} type="button" onClick={() => { setWalletFilter(w); setPage(1); setOpenWalletDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-surface-container-low transition-colors ${walletFilter === w ? "text-primary" : "text-on-surface-variant"}`}>
                        {w}
                      </button>
                    ))}
                  </div>,
                  document.body
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-card overflow-hidden border border-outline-variant/10">
          {!isDayReady ? (
            <div className="flex justify-center p-20"><div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" /></div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center mb-4"><ArrowUpDown className="size-8 text-on-surface-variant/30" /></div>
              <h3 className="text-lg font-bold text-on-surface-variant/60 mb-2">Không thấy giao dịch</h3>
              <p className="text-sm text-on-surface-variant/40 mb-6">Thử đổi bộ lọc</p>
              <button onClick={() => { setView("day"); setShowAddModal(true); }} className="px-6 py-3 bg-primary text-white rounded-2xl font-bold text-sm shadow-lg">Thêm mới ngay</button>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/50">
                      {["Ngày", "Loại", "Danh mục", "Ví", "Số tiền", "Thao tác"].map((h, i) => (
                        <th key={h} className={`px-6 py-4 text-[10px] font-black text-on-surface-variant uppercase tracking-widest ${i === 4 ? "text-right" : i === 5 ? "text-center" : ""}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5">
                    {paginated.map((entry) => (
                      <tr key={entry.id} className={`group hover:bg-surface-container-low/30 transition-all duration-200 ${entry.lifecycleStatus === "VOIDED" ? "opacity-50" : ""}`}>
                        <td className="px-6 py-4"><span className="text-sm font-bold text-on-surface">{entry.occurredAtText ?? entry.occurredAt.slice(0,10)}</span></td>
                        <td className="px-4 py-4"><KindBadge kind={entry.entryKind} /></td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{entry.categoryIcon}</span>
                            <span className="text-sm font-medium text-on-surface">{entry.categoryName ?? (entry.isTransfer ? "Chuyển khoản" : "—")}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4"><span className="text-xs font-semibold px-2.5 py-1 bg-surface-container-high rounded-lg text-on-surface">{entry.walletName}</span></td>
                        <td className="px-4 py-4 text-right"><AmountText entry={entry} /></td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setDetailEntry(entry)} className="p-2 hover:bg-primary/10 rounded-xl text-on-surface-variant hover:text-primary transition-colors"><Eye className="size-4" /></button>
                            <button onClick={() => setEditEntry(entry)} className="p-2 hover:bg-primary/10 rounded-xl text-on-surface-variant hover:text-primary transition-colors"><Pencil className="size-4" /></button>
                            <button onClick={() => setDeleteEntry(entry)} className="p-2 hover:bg-error/10 rounded-xl text-on-surface-variant hover:text-error transition-colors"><Trash2 className="size-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="sm:hidden divide-y divide-outline-variant/5">
                {paginated.map((entry) => (
                  <div key={entry.id} onClick={() => setDetailEntry(entry)} className={`p-3 active:bg-surface-container-low transition-colors ${entry.lifecycleStatus === "VOIDED" ? "opacity-60" : ""}`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-surface-container-low flex items-center justify-center text-lg shrink-0">{entry.categoryIcon}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-on-surface truncate leading-tight">{entry.categoryName ?? (entry.isTransfer ? "Chuyển khoản" : "—")}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <KindBadge kind={entry.entryKind} />
                            <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">•</span>
                            <span className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-widest truncate">{entry.walletName}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <AmountText entry={entry} />
                        <div className="mt-0.5 flex justify-end"><LifecycleBadge status={entry.lifecycleStatus} /></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 sm:px-6 py-4 bg-surface-container-low/30 border-t border-outline-variant/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-[10px] sm:text-xs font-medium text-on-surface-variant">
                  {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}
                </p>
                <div className="flex items-center gap-2">
                  {dayNextCursorId && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await refreshDayEntries({ cursorId: dayNextCursorId, append: true });
                      }}
                      className="px-3 py-2 bg-white rounded-xl text-xs font-bold text-primary hover:bg-surface-container transition-colors shadow-sm"
                    >
                      Tải thêm
                    </button>
                  )}
                  <div className="flex gap-1">
                  <button onClick={(e) => { e.stopPropagation(); setPage((p) => Math.max(1, p - 1)); }} disabled={page === 1} className="px-3 py-2 bg-white rounded-xl text-xs font-bold text-on-surface-variant disabled:opacity-40 hover:bg-surface-container transition-colors shadow-sm">Trước</button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 2), page + 1).map((p) => (
                    <button key={p} onClick={(e) => { e.stopPropagation(); setPage(p); }} className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${p === page ? "bg-primary text-white shadow-md" : "bg-white text-on-surface-variant hover:bg-surface-container shadow-sm"}`}>{p}</button>
                  ))}
                  <button onClick={(e) => { e.stopPropagation(); setPage((p) => Math.min(totalPages, p + 1)); }} disabled={page === totalPages} className="px-3 py-2 bg-white rounded-xl text-xs font-bold text-on-surface-variant disabled:opacity-40 hover:bg-surface-container transition-colors shadow-sm">Sau</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </>
      )}
    </main>
  );
}
