"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";

import type { FinanceEntryKind } from "@/features/expenses/model/financeEntryKind";
import {
  ArrowLeftRight,
  CalendarDays,
  CirclePlay,
  Edit,
  Loader2,
  Search,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import {
  createFinanceRecurringRuleAction,
  deleteFinanceRecurringRuleAction,
  loadFinanceRecurringPageDataAction,
  runDueFinanceRecurringRulesAction,
  runFinanceRecurringRuleAction,
  toggleFinanceRecurringRuleAction,
  updateFinanceRecurringRuleAction,
} from "@/features/expenses/actions/financeRecurringActions";
import type { FinanceRecurringListItemDTO } from "@/features/expenses/model/financeRecurringTypes";
import { ExpensesSubNav } from "@/features/expenses/ui/ExpensesSubNav";

import {
  FinanceRecurringFormModal,
  type RecurringCategoryOption,
  type RecurringWalletOption,
} from "./FinanceRecurringFormModal";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function amountColorClass(kind: FinanceEntryKind): string {
  if (kind === "INCOME") return "text-green-500";
  if (kind === "EXPENSE") return "text-red-500";
  return "text-slate-700";
}

function inactiveRowClass(isActive: boolean): string {
  if (isActive) return "";
  return "opacity-50 grayscale-[0.35]";
}

function entryKindLabel(kind: FinanceEntryKind): string {
  if (kind === "INCOME") return "Thu";
  if (kind === "EXPENSE") return "Chi";
  return "Chuyển ví";
}

function ruleIconTintClass(entryKind: FinanceEntryKind): string {
  if (entryKind === "EXPENSE") return "bg-red-100 text-red-500";
  if (entryKind === "INCOME") return "bg-green-100 text-green-500";
  return "bg-slate-100 text-slate-600";
}

function RuleIcon({
  entryKind,
  categoryIcon,
}: {
  entryKind: FinanceEntryKind;
  categoryIcon: string | null;
}) {
  const emoji = categoryIcon?.trim();
  if (emoji) {
    return (
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg text-lg leading-none ${ruleIconTintClass(entryKind)}`}
      >
        <span aria-hidden>{emoji}</span>
      </div>
    );
  }
  if (entryKind === "EXPENSE") {
    return (
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${ruleIconTintClass(entryKind)}`}
      >
        <Zap className="size-[1.125rem]" />
      </div>
    );
  }
  if (entryKind === "INCOME") {
    return (
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${ruleIconTintClass(entryKind)}`}
      >
        <Sparkles className="size-[1.125rem]" />
      </div>
    );
  }
  return (
    <div
      className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${ruleIconTintClass(entryKind)}`}
    >
      <ArrowLeftRight className="size-[1.125rem]" />
    </div>
  );
}

export type FinanceRecurringClientProps = {
  initialRules?: FinanceRecurringListItemDTO[];
  initialWallets?: RecurringWalletOption[];
  initialCategories?: RecurringCategoryOption[];
  /** true khi server không tải được — client gọi lại một lần sau mount */
  revalidateOnMount?: boolean;
};

export function FinanceRecurringClient({
  initialRules = [],
  initialWallets = [],
  initialCategories = [],
  revalidateOnMount = false,
}: FinanceRecurringClientProps = {}) {
  const [items, setItems] = useState<FinanceRecurringListItemDTO[]>(initialRules);
  const [loading, setLoading] = useState(revalidateOnMount);
  const [search, setSearch] = useState("");
  const [wallets, setWallets] = useState<RecurringWalletOption[]>(initialWallets);
  const [categories, setCategories] = useState<RecurringCategoryOption[]>(initialCategories);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"add" | "edit">("add");
  const [editTarget, setEditTarget] = useState<FinanceRecurringListItemDTO | undefined>();
  const [runningAll, setRunningAll] = useState(false);
  const [runningId, setRunningId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await loadFinanceRecurringPageDataAction();
    if (res.success) {
      setItems(res.rules);
      setWallets(res.wallets.map((w) => ({ id: w.id, name: w.name, currency: w.currency })));
      setCategories(
        res.categories.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          kind: c.kind,
        })),
      );
    } else {
      toast.error("Không tải được dữ liệu trang định kỳ");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!revalidateOnMount) return;
    void load();
  }, [revalidateOnMount, load]);

  const filtered = useMemo((): FinanceRecurringListItemDTO[] => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((r: FinanceRecurringListItemDTO) =>
      `${r.displayTitle} ${r.walletName} ${r.categoryName ?? ""} ${r.frequencyLabel}`
        .toLowerCase()
        .includes(term),
    );
  }, [items, search]);

  const activeCount = items.filter((r: FinanceRecurringListItemDTO) => r.isActive).length;
  const activeExpenseSum = items
    .filter((r: FinanceRecurringListItemDTO) => r.isActive && r.entryKind === "EXPENSE")
    .reduce((s: number, r: FinanceRecurringListItemDTO) => s + r.amountRaw, 0);

  const upcoming7 = useMemo((): FinanceRecurringListItemDTO[] => {
    const now = Date.now();
    const end = now + WEEK_MS;
    return items
      .filter((r: FinanceRecurringListItemDTO) => {
        if (!r.isActive) return false;
        const t = new Date(r.nextRunAt).getTime();
        return t >= now && t <= end;
      })
      .sort(
        (a: FinanceRecurringListItemDTO, b: FinanceRecurringListItemDTO) =>
          new Date(a.nextRunAt).getTime() - new Date(b.nextRunAt).getTime(),
      );
  }, [items]);

  const dueNowCount = useMemo(() => {
    const now = Date.now();
    return items.filter(
      (r: FinanceRecurringListItemDTO) => r.isActive && new Date(r.nextRunAt).getTime() <= now,
    ).length;
  }, [items]);

  const openAdd = () => {
    setFormMode("add");
    setEditTarget(undefined);
    setFormOpen(true);
  };

  const openEdit = (r: FinanceRecurringListItemDTO) => {
    setFormMode("edit");
    setEditTarget(r);
    setFormOpen(true);
  };

  const handleFormSubmit = async (payload: Record<string, unknown>) => {
    if (formMode === "add") {
      const res = await createFinanceRecurringRuleAction(payload);
      if (res.success) {
        toast.success("Đã tạo quy tắc");
        await load();
        return { ok: true };
      }
      return { ok: false, message: "message" in res ? res.message : "Lỗi tạo quy tắc" };
    }
    if (!editTarget) return { ok: false, message: "Thiếu quy tắc" };
    const res = await updateFinanceRecurringRuleAction(editTarget.id, payload);
    if (res.success) {
      toast.success("Đã cập nhật");
      await load();
      return { ok: true };
    }
    return { ok: false, message: "message" in res ? res.message : "Lỗi cập nhật" };
  };

  const handleToggle = async (r: FinanceRecurringListItemDTO) => {
    const res = await toggleFinanceRecurringRuleAction({ ruleId: r.id, isActive: !r.isActive });
    if (res.success) {
      toast.success(r.isActive ? "Đã tạm dừng" : "Đã bật quy tắc");
      await load();
    } else toast.error("Không đổi được trạng thái");
  };

  const handleDelete = async (r: FinanceRecurringListItemDTO) => {
    if (!window.confirm(`Xóa quy tắc "${r.displayTitle}"?`)) return;
    const res = await deleteFinanceRecurringRuleAction(r.id);
    if (res.success) {
      toast.success("Đã xóa");
      await load();
    } else toast.error("Không xóa được");
  };

  const handleRunOne = async (r: FinanceRecurringListItemDTO) => {
    setRunningId(r.id);
    const res = await runFinanceRecurringRuleAction({ ruleId: r.id });
    setRunningId(null);
    if (!res.success) {
      toast.error("message" in res ? (res.message ?? "Lỗi") : "Lỗi");
      return;
    }
    if (res.ran) {
      toast.success("Đã tạo giao dịch từ quy tắc");
      await load();
    } else {
      toast.message("Chưa đến hạn chạy");
    }
  };

  const handleRunAll = async () => {
    setRunningAll(true);
    const res = await runDueFinanceRecurringRulesAction();
    setRunningAll(false);
    if (!res.success) {
      toast.error("message" in res ? res.message : "Lỗi");
      return;
    }
    toast.success(`Đã tạo ${res.entriesCreated} giao dịch (${res.processedRules} lượt xử lý)`);
    await load();
  };

  return (
    <main className="mx-auto max-w-[1200px] flex-1 space-y-4 overflow-y-auto bg-slate-50 p-4 sm:space-y-6 sm:p-6 lg:p-8">
      <ExpensesSubNav />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-black tracking-tight text-on-surface sm:text-3xl lg:text-4xl">
            Giao dịch định kỳ
          </h1>
          <p className="text-sm font-medium text-on-surface-variant sm:text-base">
            Tự động hóa các dòng tiền lặp lại — chạy đến hạn để ghi vào sổ thu/chi.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => void handleRunAll()}
            disabled={runningAll || loading}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-800 transition-colors hover:bg-gray-200 disabled:opacity-50 sm:w-auto"
          >
            {runningAll ? <Loader2 className="size-5 animate-spin" /> : <CirclePlay className="size-5" />}
            Chạy tất cả đến hạn
          </button>
          <button
            type="button"
            onClick={openAdd}
            disabled={wallets.length === 0}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-400 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-green-500/25 transition-transform duration-200 hover:scale-105 hover:shadow-xl active:scale-95 disabled:opacity-50 sm:w-auto"
          >
            <Sparkles className="size-5" />
            Thêm quy tắc mới
          </button>
        </div>
      </div>

      {wallets.length === 0 && !loading && (
        <p className="text-sm font-bold text-error">
          Bạn cần có ít nhất một ví (mục Ví) trước khi tạo quy tắc định kỳ.
        </p>
      )}

      <div className="rounded-3xl bg-slate-100 p-2 shadow-sm transition-shadow hover:shadow-md">
        <div className="relative w-full rounded-2xl bg-slate-50 shadow-sm transition-shadow hover:shadow-md">
          <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Tìm kiếm quy tắc..."
            className="w-full rounded-2xl border-none bg-white py-3 pl-10 pr-4 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-green-400 focus:ring-offset-0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <div className="flex min-h-[5.5rem] flex-col justify-between rounded-2xl border border-slate-100 border-l-4 border-l-green-500 bg-green-50 p-4 shadow-card transition-all duration-200 md:hover:scale-[1.02] sm:p-5">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 sm:text-[10px]">
            Đang hoạt động
          </span>
          <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
            <span className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">{activeCount}</span>
            <span className="text-[10px] font-black text-green-600 sm:text-xs">/ {items.length}</span>
          </div>
        </div>

        <div className="flex min-h-[5.5rem] flex-col justify-between rounded-2xl border border-slate-100 bg-orange-50 p-4 shadow-card transition-all duration-200 md:hover:scale-[1.02] sm:p-5">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 sm:text-[10px]">
            Tổng chi (bật)
          </span>
          <div className="flex flex-wrap items-baseline gap-1">
            <span className="text-lg font-black tracking-tight text-orange-500 sm:text-2xl md:text-3xl">
              {fmt(activeExpenseSum)}
            </span>
            <span className="text-[10px] font-black text-slate-600 sm:text-xs">VND</span>
          </div>
        </div>

        <div className="flex min-h-[5.5rem] flex-col justify-between rounded-2xl border border-slate-100 bg-red-50 p-4 shadow-card transition-all duration-200 md:hover:scale-[1.02] sm:p-5">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 sm:text-[10px]">
            Đến hạn / 7 ngày
          </span>
          <div className="flex flex-wrap items-baseline gap-1 sm:gap-2">
            <span className="text-2xl font-black tracking-tight text-red-600 sm:text-3xl">{dueNowCount}</span>
            <span className="text-[10px] font-black text-slate-600 sm:text-xs">
              / {upcoming7.length}
            </span>
          </div>
        </div>

        <div className="relative flex min-h-[5.5rem] flex-col justify-between overflow-hidden rounded-2xl border border-green-400/30 bg-gradient-to-br from-green-500 to-green-400 p-4 text-white shadow-card transition-all duration-200 md:hover:scale-[1.02] sm:p-5 md:col-span-1">
          <div className="absolute -right-6 -top-6 opacity-[0.12]">
            <Sparkles className="size-16 sm:size-20" />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-white/90 sm:text-[10px]">
            Gợi ý
          </span>
          <p className="relative z-10 text-[10px] font-semibold leading-relaxed text-white/90 sm:text-xs">
            Bấm &quot;Chạy tất cả đến hạn&quot; để ghi các khoản đã tới ngày vào giao dịch thu/chi.
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-slate-100 p-1">
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <ul className="space-y-2 p-2 sm:p-3 lg:hidden">
                {filtered.map((r: FinanceRecurringListItemDTO) => (
                  <li
                    key={r.id}
                    className={`rounded-xl border border-slate-100 bg-white p-3 transition-all duration-200 hover:bg-green-50/40 ${inactiveRowClass(r.isActive)}`}
                  >
                    <div className="flex gap-2.5">
                      <RuleIcon entryKind={r.entryKind} categoryIcon={r.categoryIcon} />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div>
                          <p className="font-black leading-snug text-on-surface">{r.displayTitle}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-x-1 text-[11px] text-on-surface-variant">
                            <CalendarDays className="size-3 shrink-0" />
                            <span>{r.frequencyLabel}</span>
                            <span className="text-on-surface-variant/60">
                              · {entryKindLabel(r.entryKind)}
                            </span>
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                          <span className="font-bold text-on-surface">{r.walletName}</span>
                          <span className="rounded-full bg-surface-container-highest px-1.5 py-px text-[10px] font-black uppercase tracking-wide text-on-surface-variant">
                            {r.categoryName ?? "Không danh mục"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
                          <div className="min-w-0">
                            <p className={`text-base font-black leading-tight ${amountColorClass(r.entryKind)}`}>
                              {fmt(r.amountRaw)}{" "}
                              <span className="text-[11px] font-medium text-slate-400">{r.currency}</span>
                            </p>
                            <p
                              className={`mt-0.5 truncate text-[11px] font-semibold ${
                                r.isActive ? "text-on-surface-variant" : "text-error"
                              }`}
                            >
                              {r.isActive ? r.nextRunAtText : "Tạm dừng"}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center -mr-1">
                            <button
                              type="button"
                              onClick={() => void handleToggle(r)}
                              className="flex size-10 items-center justify-center rounded-full transition-transform duration-150 hover:bg-slate-100 active:scale-95"
                              aria-label="Bật/tắt quy tắc"
                            >
                              {r.isActive ? (
                                <ToggleRight className="size-6 text-green-500" />
                              ) : (
                                <ToggleLeft className="size-6 text-slate-400" />
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={runningId === r.id || !r.isActive}
                              onClick={() => void handleRunOne(r)}
                              className="flex size-10 items-center justify-center rounded-full text-primary transition-transform duration-150 hover:bg-primary/10 active:scale-95 disabled:opacity-40"
                              title="Chạy nếu đến hạn"
                            >
                              {runningId === r.id ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : (
                                <CirclePlay className="size-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(r)}
                              className="flex size-10 items-center justify-center rounded-full text-on-surface-variant transition-transform duration-150 hover:bg-slate-100 active:scale-95"
                              aria-label="Sửa"
                            >
                              <Edit className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(r)}
                              className="flex size-10 items-center justify-center rounded-full text-error transition-transform duration-150 hover:bg-error/10 active:scale-95"
                              aria-label="Xóa"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="py-12 text-center text-sm font-bold text-on-surface-variant/60">
                    {items.length === 0 ? "Chưa có quy tắc nào" : "Không khớp bộ lọc"}
                  </li>
                )}
              </ul>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-on-surface-variant">
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">
                        Quy tắc & Tần suất
                      </th>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">
                        Ví & Danh mục
                      </th>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">
                        Số tiền
                      </th>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest">
                        Chạy tiếp theo
                      </th>
                      <th className="px-6 py-4 text-right text-[11px] font-black uppercase tracking-widest">
                        Hành động
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filtered.map((r: FinanceRecurringListItemDTO) => (
                      <tr
                        key={r.id}
                        className={`transition-all duration-200 hover:bg-green-50/60 ${inactiveRowClass(r.isActive)}`}
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-4">
                            <RuleIcon entryKind={r.entryKind} categoryIcon={r.categoryIcon} />
                            <div>
                              <div className="mb-1 font-black leading-none text-on-surface">
                                {r.displayTitle}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-on-surface-variant">
                                <CalendarDays className="size-4" />
                                {r.frequencyLabel}
                                <span className="text-on-surface-variant/60">
                                  · {entryKindLabel(r.entryKind)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-on-surface">{r.walletName}</span>
                            <span className="mt-1 w-fit rounded-full bg-surface-container-highest px-2 py-0.5 text-[10px] font-black uppercase text-on-surface-variant">
                              {r.categoryName ?? "Không danh mục"}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`text-lg font-black tracking-tight ${amountColorClass(r.entryKind)}`}
                          >
                            {fmt(r.amountRaw)}{" "}
                            <span className="text-xs font-medium text-slate-400">{r.currency}</span>
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div
                            className={`text-sm font-semibold ${
                              r.isActive ? "text-on-surface-variant" : "text-error"
                            }`}
                          >
                            {r.isActive ? r.nextRunAtText : "Tạm dừng"}
                          </div>
                        </td>

                        <td className="px-6 py-5 text-right">
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => void handleToggle(r)}
                              className="rounded-full p-2 transition-transform duration-150 hover:bg-slate-100 active:scale-95"
                              aria-label="Bật/tắt quy tắc"
                            >
                              {r.isActive ? (
                                <ToggleRight className="size-6 text-green-500" />
                              ) : (
                                <ToggleLeft className="size-6 text-slate-400" />
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={runningId === r.id || !r.isActive}
                              onClick={() => void handleRunOne(r)}
                              className="rounded-full p-2 text-primary transition-transform duration-150 hover:bg-primary/10 active:scale-95 disabled:opacity-40"
                              title="Chạy nếu đến hạn"
                            >
                              {runningId === r.id ? (
                                <Loader2 className="size-5 animate-spin" />
                              ) : (
                                <CirclePlay className="size-5" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(r)}
                              className="rounded-full p-2 text-on-surface-variant transition-transform duration-150 hover:bg-slate-100 active:scale-95"
                              aria-label="Sửa"
                            >
                              <Edit className="size-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDelete(r)}
                              className="rounded-full p-2 text-error transition-transform duration-150 hover:bg-error/10 active:scale-95"
                              aria-label="Xóa"
                            >
                              <Trash2 className="size-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center">
                          <p className="text-sm font-bold text-on-surface-variant/60">
                            {items.length === 0 ? "Chưa có quy tắc nào" : "Không khớp bộ lọc"}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-3 md:gap-6">
        <div className="md:col-span-2">
          <h2 className="mb-3 text-lg font-black tracking-tight sm:text-xl">Lịch trong 7 ngày tới</h2>
          <div className="space-y-2 sm:space-y-3">
            {upcoming7.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Không có quy tắc nào trong 7 ngày tới.</p>
            ) : (
              upcoming7.map((u: FinanceRecurringListItemDTO) => (
                <div
                  key={u.id}
                  className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-white p-3 transition-colors duration-200 hover:bg-green-50 sm:flex-row sm:items-center sm:justify-between sm:p-4"
                >
                  <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-3">
                    <div className="mt-1 size-2 shrink-0 rounded-full bg-green-500 sm:mt-0" />
                    <div className="min-w-0">
                      <span className="block font-black sm:inline sm:shrink-0">{u.nextRunAtText}</span>
                      <span className="mt-0.5 block truncate text-sm text-on-surface-variant sm:mt-0 sm:inline">
                        {" "}
                        — {u.displayTitle}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 pl-4 text-sm font-bold sm:pl-0 sm:text-base ${amountColorClass(u.entryKind)}`}
                  >
                    {fmt(u.amountRaw)}{" "}
                    <span className="text-xs font-medium text-slate-400">{u.currency}</span>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="relative flex flex-col justify-center overflow-hidden rounded-2xl border border-green-400/20 bg-gradient-to-br from-green-500/95 to-green-400/95 p-5 text-center backdrop-blur-sm sm:p-6 lg:p-8">
          <div className="relative z-10">
            <Sparkles className="mx-auto mb-2 size-9 text-white opacity-[0.12] sm:size-10" />
            <h3 className="mb-2 text-base font-black text-white sm:text-lg">Định kỳ hoạt động thế nào?</h3>
            <p className="text-left text-sm leading-relaxed text-white/90 sm:text-center">
              Mỗi quy tắc có &quot;lần chạy tiếp theo&quot;. Khi thời điểm đó đã qua, bạn chạy quy tắc để tạo
              giao dịch thật trên ví và lùi lịch theo tần suất đã chọn.
            </p>
          </div>
          <div className="absolute -bottom-10 -right-10 size-40 rounded-full bg-white/10 blur-2xl" />
        </div>
      </div>

      {formOpen && (
        <FinanceRecurringFormModal
          mode={formMode}
          initial={editTarget}
          wallets={wallets}
          categories={categories}
          onClose={() => setFormOpen(false)}
          onSubmit={handleFormSubmit}
        />
      )}
    </main>
  );
}
