"use client";

import React, { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Info,
  Loader2,
  Pencil,
  Plus,
  TrendingDown,
  TrendingUp,
  Trash2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

import { listFinanceCategoriesAction } from "@/features/expenses/actions/financeCategoryActions";
import {
  deleteFinanceBudgetPeriodAction,
  getFinanceBudgetPeriodDetailByKeyAction,
  listFinanceBudgetPeriodsAction,
} from "@/features/expenses/actions/financeBudgetActions";
import type {
  FinanceBudgetPeriodDetailDTO,
  FinanceBudgetPeriodListItemDTO,
} from "@/features/expenses/model/financeBudgetTypes";
import type { FinanceCategoryListItemDTO } from "@/features/expenses/model/financeCategoryTypes";

import { BudgetMonthYearPicker } from "./BudgetMonthYearPicker";
import { FinanceBudgetPeriodEditorModal } from "./FinanceBudgetPeriodEditorModal";
import { CategoryMonthEntriesDrawer } from "./CategoryMonthEntriesDrawer";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

function currentPeriodKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function periodKeyLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return `Tháng ${m}/${y}`;
}

type BudgetStatus = "safe" | "warning" | "exceeded";

function getStatus(spent: number, limit: number): BudgetStatus {
  if (limit <= 0) return "safe";
  const pct = spent / limit;
  if (pct >= 1) return "exceeded";
  if (pct >= 0.8) return "warning";
  return "safe";
}

function StatusIcon({ status }: { status: BudgetStatus }) {
  if (status === "exceeded") return <AlertCircle className="size-5 text-error" />;
  if (status === "warning") return <AlertTriangle className="size-5 text-[#7a5900]" />;
  return <TrendingUp className="size-5 text-on-surface-variant/30 group-hover:text-primary transition-colors" />;
}

function ProgressBar({ pct, status }: { pct: number; status: BudgetStatus }) {
  const barClass =
    status === "exceeded"
      ? "bg-error"
      : status === "warning"
      ? "bg-[#F0C05A]"
      : "bg-primary";
  return (
    <div className="h-2 w-full bg-surface-container-low rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${barClass}`}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
    </div>
  );
}

/** Gộp danh mục API với dòng detail để dropdown vẫn có danh mục đã ẩn */
function mergeCategoriesForEditor(
  base: FinanceCategoryListItemDTO[],
  detail: FinanceBudgetPeriodDetailDTO | null,
): FinanceCategoryListItemDTO[] {
  const byId = new Map(base.map((c) => [c.id, c]));
  if (detail) {
    for (const line of detail.lines) {
      if (!byId.has(line.categoryId)) {
        byId.set(line.categoryId, {
          id: line.categoryId,
          kind: "EXPENSE",
          name: line.categoryHidden ? `${line.categoryName} (đã ẩn)` : line.categoryName,
          slug: `legacy-${line.categoryId}`,
          color: line.categoryColor,
          icon: line.categoryIcon,
          sortOrder: 0,
          isActive: false,
        });
      }
    }
  }
  return Array.from(byId.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export function FinanceBudgetsClient() {
  const [periodKey, setPeriodKey] = useState(currentPeriodKey);
  const [detail, setDetail] = useState<FinanceBudgetPeriodDetailDTO | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(true);
  const [periodList, setPeriodList] = useState<FinanceBudgetPeriodListItemDTO[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<FinanceCategoryListItemDTO[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [categoryDetailOpen, setCategoryDetailOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<{
    id: number;
    name: string;
    icon: string | null;
    color: string | null;
    spent: number;
    limit: number;
  } | null>(null);
  const [pendingDelete, startDelete] = useTransition();

  const year = Number(periodKey.slice(0, 4));

  const refreshList = useCallback(async () => {
    const res = await listFinanceBudgetPeriodsAction({ year });
    if (res.success) setPeriodList(res.items);
    else toast.error("Không tải được danh sách kỳ");
  }, [year]);

  const refreshDetail = useCallback(async () => {
    setDetailLoading(true);
    try {
      const res = await getFinanceBudgetPeriodDetailByKeyAction(periodKey);
      if (res.success) setDetail(res.detail);
      else toast.error("Không tải được ngân sách");
    } finally {
      setDetailLoading(false);
    }
  }, [periodKey]);

  /** Chỉ refetch khi đổi năm (periodKey đổi tháng trong cùng năm không gọi lại list — list không aggregate spend). */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListLoading(true);
      const res = await listFinanceBudgetPeriodsAction({ year });
      if (!cancelled && res.success) setPeriodList(res.items);
      if (!cancelled) setListLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [year]);

  useEffect(() => {
    refreshDetail();
  }, [refreshDetail]);

  const loadExpenseCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const res = await listFinanceCategoriesAction({
        limit: 200,
        kind: "EXPENSE",
        isActive: "ALL",
      });
      if (res.success) {
        setExpenseCategories(res.items);
        return true;
      }
      if (res.error === "UNAUTHENTICATED") {
        toast.error("Bạn cần đăng nhập lại để tải danh mục.");
      } else {
        toast.error("Không tải được danh mục chi", {
          description: res.error === "VALIDATION_ERROR" ? "Dữ liệu lọc không hợp lệ." : "Thử lại sau.",
        });
      }
      return false;
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  /** Danh mục chi chỉ tải khi mở modal — giảm POST khi chỉ xem ngân sách. */
  useEffect(() => {
    if (!editorOpen) return;
    if (expenseCategories.length > 0) return;
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await loadExpenseCategories();
    })();
    return () => {
      cancelled = true;
    };
  }, [editorOpen, expenseCategories.length, loadExpenseCategories]);

  const mergedCategories = useMemo(
    () => mergeCategoriesForEditor(expenseCategories, detail),
    [expenseCategories, detail],
  );

  const activeCategoriesForNewLine = useMemo(
    () => expenseCategories.filter((c) => c.isActive),
    [expenseCategories],
  );

  const totalLimitFromLines = useMemo(() => {
    if (!detail?.lines.length) return 0;
    return detail.lines.reduce((s, l) => s + l.limitAmount, 0);
  }, [detail]);

  const overallCap = detail?.overallLimitAmount ?? null;
  const totalSpent = detail?.totalSpentInPeriod ?? 0;
  const displayTotalLimit =
    overallCap !== null && overallCap > 0 ? overallCap : totalLimitFromLines;

  const unallocated =
    overallCap !== null && overallCap > 0
      ? Math.max(0, overallCap - totalLimitFromLines)
      : 0;
  const categoryLimitsExceedOverall =
    overallCap !== null && overallCap > 0 && totalLimitFromLines > overallCap;

  const handleDeletePeriod = () => {
    if (!detail) return;
    if (!window.confirm(`Xóa ngân sách ${detail.periodKey}? Hành động không hoàn tác.`)) return;
    startDelete(async () => {
      const res = await deleteFinanceBudgetPeriodAction(detail.id);
      if (!res.success) {
        toast.error("Không xóa được");
        return;
      }
      toast.success("Đã xóa ngân sách");
      setDetail(null);
      await refreshList();
    });
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 space-y-6 sm:space-y-8 max-w-[1400px]">
      <FinanceBudgetPeriodEditorModal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        periodKey={periodKey}
        existingDetail={detail}
        expenseCategories={mergedCategories}
        activeCategoriesForNewLine={activeCategoriesForNewLine}
        rawExpenseCategoryCount={expenseCategories.length}
        categoriesLoading={categoriesLoading}
        onSaved={(result) => {
          if (result.detail) {
            setDetail(result.detail);
          } else {
            void refreshDetail();
          }
          void refreshList();
        }}
      />

      <CategoryMonthEntriesDrawer
        open={categoryDetailOpen}
        onClose={() => setCategoryDetailOpen(false)}
        periodKey={periodKey}
        category={
          activeCategory
            ? { id: activeCategory.id, name: activeCategory.name, icon: activeCategory.icon, color: activeCategory.color }
            : null
        }
        headerStats={
          activeCategory
            ? { spent: activeCategory.spent, limit: activeCategory.limit }
            : undefined
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-on-surface">Quản lý ngân sách</h1>
          <p className="text-on-surface-variant text-sm mt-0.5">{periodKeyLabel(periodKey)}</p>
          <p className="text-[11px] sm:text-xs text-on-surface-variant mt-1.5 max-w-xl leading-relaxed">
            Ngân sách đặt hạn mức cho từng danh mục <span className="font-semibold text-on-surface">Chi</span> (chi
            tiêu); danh mục Thu không dùng ở đây.{" "}
            <Link href="/expenses/categories" className="text-primary font-semibold underline">
              Danh mục thu chi
            </Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 self-stretch sm:self-auto w-full sm:w-auto">
        <div className="flex flex-col items-stretch sm:items-end gap-1 flex-1 min-w-0 sm:flex-none sm:max-w-md">
          <BudgetMonthYearPicker
            value={periodKey}
            onChange={setPeriodKey}
            label={periodKeyLabel(periodKey)}
          />
          </div>
        <button
          type="button"
          className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-outline-variant/20 bg-white transition-all hover:bg-surface-container-low"
          title="Thông báo ngân sách — sắp có"
          aria-label="Thông báo ngân sách (đang phát triển)"
          onClick={() =>
            toast.message("Thông báo ngân sách sắp có", {
              description:
                "Sẽ nhắc kỳ chưa lập, gần vượt hạn mức và phần chưa gán danh mục. Theo dõi cập nhật sau.",
            })
          }
        >
            <Bell className="size-5 text-on-surface-variant" />
          </button>
        </div>
      </div>

      {detail?.hasUnmatchedCurrencyExpenses ? (
        <div className="rounded-xl border border-[#F0C05A]/40 bg-[#F0C05A]/10 px-4 py-3 text-sm text-[#7a5900]">
          Có giao dịch chi khác VND trong tháng — tổng &quot;Đã chi&quot; chỉ gồm các khoản VND. Quy đổi đa tiền tệ sẽ bổ sung sau.
        </div>
      ) : null}

      {detailLoading ? (
        <div className="flex items-center justify-center py-24 text-on-surface-variant gap-2">
          <Loader2 className="size-8 animate-spin" />
          <span>Đang tải...</span>
        </div>
      ) : !detail ? (
        <section className="rounded-[2rem] border border-dashed border-outline-variant/40 bg-surface-container-low/30 p-10 text-center max-w-xl mx-auto">
          <p className="text-on-surface font-bold text-lg mb-2">Chưa có ngân sách cho {periodKeyLabel(periodKey)}</p>
          <p className="text-sm text-on-surface-variant mb-6">
            Lập hạn mức theo danh mục chi — chọn danh mục tại{" "}
            <Link href="/expenses/categories" className="text-primary font-bold underline">
              Danh mục thu chi
            </Link>
            .
          </p>
          <button
            type="button"
            onClick={() => setEditorOpen(true)}
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-105"
          >
            <Plus className="size-4" />
            Lập ngân sách
          </button>
        </section>
      ) : (
        <>
      <div className="grid grid-cols-12 gap-3 sm:gap-6">
        <section className="col-span-12 lg:col-span-8 bg-white p-4 sm:p-8 rounded-[1.25rem] sm:rounded-[2rem] shadow-card relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-10 gap-4">
                <div className="min-w-0">
              <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-on-surface-variant mb-1 block">
                    {overallCap !== null && overallCap > 0 ? "Hạn mức tổng tháng" : "Tổng hạn mức (theo danh mục)"}
                  </span>
                  <div className="flex flex-col sm:flex-row sm:items-baseline flex-wrap gap-x-2 gap-y-1">
                    <span className="text-4xl sm:text-5xl font-black text-on-surface tracking-tight tabular-nums break-words">
                      {fmt(displayTotalLimit)}
                    </span>
                    <span className="text-sm sm:text-base font-medium text-on-surface-variant shrink-0">VND</span>
                  </div>
                </div>
                <div className="mt-0 text-left md:text-right min-w-0">
                  <span className="text-xs sm:text-sm font-semibold text-primary tabular-nums">
                    Đã chi{" "}
                    {displayTotalLimit > 0
                      ? ((totalSpent / displayTotalLimit) * 100).toFixed(1)
                      : "0"}
                    %
              </span>
                  <div className="text-xl sm:text-2xl font-bold text-on-surface tabular-nums">
                    {fmt(totalSpent)}{" "}
                    <span className="text-sm font-medium text-on-surface-variant">VND</span>
            </div>
            </div>
          </div>
          <div className="relative z-10">
            <div className="h-3 sm:h-4 w-full bg-surface-container-high rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-primary to-mint-400 rounded-full shadow-[0_0_12px_rgba(29,185,84,0.25)] transition-all duration-700"
                    style={{
                      width: `${Math.min(
                        displayTotalLimit > 0 ? (totalSpent / displayTotalLimit) * 100 : 0,
                        100,
                      )}%`,
                    }}
              />
            </div>
                <div className="flex flex-wrap justify-between gap-x-3 gap-y-2 text-[9px] sm:text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                  <span className="tabular-nums">Kỳ: {detail.periodKey}</span>
                  <span className="tabular-nums">
                    Còn lại: {fmt(Math.max(0, displayTotalLimit - totalSpent))}{" "}
                    <span className="font-medium normal-case text-on-surface-variant">VND</span>
                  </span>
                </div>
                {overallCap !== null && overallCap > 0 ? (
                  <div className="mt-4 space-y-2 border-t border-outline-variant/15 pt-4">
                    {unallocated > 0 ? (
                      <p className="text-xs sm:text-sm text-on-surface-variant">
                        Chưa gán vào danh mục:{" "}
                        <span className="font-bold tabular-nums text-on-surface">
                          {fmt(unallocated)} đ
                        </span>
                      </p>
                    ) : null}
                    {categoryLimitsExceedOverall ? (
                      <p
                        className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-xs sm:text-sm font-semibold text-error"
                        role="status"
                      >
                        Tổng hạn mức danh mục vượt hạn mức tổng
                      </p>
                    ) : null}
            </div>
                ) : null}
          </div>
        </section>

            <section className="col-span-12 lg:col-span-4 bg-primary/5 p-4 sm:p-8 rounded-[1.25rem] sm:rounded-[2rem] border border-primary/10 flex flex-col justify-between gap-4">
          <div>
                <h4 className="text-lg sm:text-xl font-bold text-on-primary-container tracking-tight mb-2">
                  Thao tác
                </h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Chỉnh sửa hạn mức hoặc xóa kế hoạch tháng này.
            </p>
          </div>
              <div className="grid grid-cols-1 gap-2">
            <button
                  type="button"
                  onClick={() => setEditorOpen(true)}
              className="w-full bg-primary text-white py-3.5 sm:py-4 rounded-xl font-bold text-sm shadow-lg hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                  <Pencil className="size-4" />
                  Sửa ngân sách
            </button>
                <button
                  type="button"
                  disabled={pendingDelete}
                  onClick={handleDeletePeriod}
                  className="w-full bg-white text-error py-3 rounded-xl font-bold text-sm border border-error/30 hover:bg-error/5 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {pendingDelete ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  Xóa kỳ này
            </button>
          </div>
        </section>

        <div className="col-span-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 mt-4 gap-4">
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-on-surface">Chi tiết danh mục</h3>
            <div className="flex gap-2 self-end sm:self-auto">
                  <span className="text-xs text-on-surface-variant flex items-center gap-1">
                    <Info className="size-4" />
                    So sánh với thực chi VND trong tháng
                  </span>
            </div>
          </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {detail.lines.map((cat) => {
                  const pct = cat.limitAmount > 0 ? (cat.spentAmount / cat.limitAmount) * 100 : 0;
              const status = getStatus(cat.spentAmount, cat.limitAmount);
              const remaining = cat.limitAmount - cat.spentAmount;
              const isExceeded = status === "exceeded";
              const isWarning = status === "warning";
                  const icon = cat.categoryIcon ?? "📁";

              return (
                <div
                  key={cat.id}
                  role="button"
                  tabIndex={0}
                  className="bg-white p-3.5 rounded-xl hover:-translate-y-1 transition-all duration-300 shadow-card hover:shadow-lg group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  title={`Xem chi tiết giao dịch danh mục: ${cat.categoryName}`}
                  onClick={() => {
                    setActiveCategory({
                      id: cat.categoryId,
                      name: cat.categoryName,
                      icon: cat.categoryIcon ?? null,
                      color: cat.categoryColor ?? null,
                      spent: cat.spentAmount,
                      limit: cat.limitAmount,
                    });
                    setCategoryDetailOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    setActiveCategory({
                      id: cat.categoryId,
                      name: cat.categoryName,
                      icon: cat.categoryIcon ?? null,
                      color: cat.categoryColor ?? null,
                      spent: cat.spentAmount,
                      limit: cat.limitAmount,
                    });
                    setCategoryDetailOpen(true);
                  }}
                >
                      <div className="flex justify-between items-start mb-6 gap-2">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-primary/10"
                          style={
                            cat.categoryColor
                              ? { backgroundColor: `${cat.categoryColor}22`, color: cat.categoryColor }
                              : undefined
                          }
                        >
                          {icon}
                    </div>
                        <div className="text-right min-w-0 flex-1">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest block truncate">
                            {cat.categoryName}
                            {cat.categoryHidden ? (
                              <span className="ml-1 text-[9px] normal-case text-error">Đã ẩn</span>
                            ) : null}
                      </span>
                      <span className="text-sm font-bold text-on-surface leading-none">
                        {fmt(cat.limitAmount)} <span className="text-[10px] font-normal">đ</span>
                      </span>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex justify-between text-[10px] mb-1.5">
                      <span className="text-on-surface-variant">Đã chi {fmt(cat.spentAmount)}</span>
                      <span
                        className={`font-bold ${
                          isExceeded ? "text-error" : isWarning ? "text-[#7a5900]" : "text-primary"
                        }`}
                      >
                        {Math.round(pct)}%
                      </span>
                    </div>
                    <ProgressBar pct={pct} status={status} />
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-on-surface-variant">
                      {isExceeded ? (
                        <>
                          Vượt mức:{" "}
                          <span className="font-bold text-error">
                            -{fmt(Math.abs(remaining))} đ
                          </span>
                        </>
                      ) : (
                        <>
                          Còn lại:{" "}
                              <span
                                className={`font-bold ${isWarning ? "text-[#7a5900]" : "text-on-surface"}`}
                              >
                            {fmt(remaining)} đ
                          </span>
                        </>
                      )}
                    </span>
                    <StatusIcon status={status} />
                  </div>
                </div>
              );
            })}

            <button
                  type="button"
                  onClick={() => setEditorOpen(true)}
              className="border-2 border-dashed border-outline-variant/30 p-6 rounded-2xl flex flex-col items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-all cursor-pointer bg-surface-container-low/30 group min-h-[180px]"
            >
              <Plus className="size-10 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="font-bold text-sm">Thêm / sửa hạn mức</span>
            </button>
          </div>
        </div>

            <section className="col-span-12 mt-4">
              <div className="rounded-2xl border border-outline-variant/15 bg-surface-container-low p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                  <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-mint-400/20 sm:size-14">
                      <TrendingDown className="size-6 text-primary sm:size-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <h5 className="text-sm font-bold text-on-surface sm:text-base">
                          Danh sách kỳ đã lập
                        </h5>
                        {!listLoading && periodList.length > 0 ? (
                          <span className="text-[11px] font-semibold tabular-nums text-on-surface-variant sm:text-xs">
                            {periodList.length} kỳ trong {year}
                          </span>
                        ) : null}
            </div>
                      <div className="mt-2.5 min-h-[1.5rem]">
                        {listLoading ? (
                          <p className="flex items-center gap-2 text-xs text-on-surface-variant sm:text-sm">
                            <Loader2 className="size-3.5 shrink-0 animate-spin sm:size-4" />
                            Đang tải...
                          </p>
                        ) : periodList.length === 0 ? (
                          <p className="text-xs leading-relaxed text-on-surface-variant sm:text-sm">
                            Chưa có kỳ nào trong năm {year}.
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            {periodList.map((p) => {
                              const isCurrent = p.periodKey === periodKey;
                              return (
                                <span
                                  key={p.periodKey}
                                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold tabular-nums sm:px-3 sm:text-xs ${
                                    isCurrent
                                      ? "border-primary/40 bg-primary/10 text-primary"
                                      : "border-outline-variant/25 bg-white/80 text-on-surface"
                                  }`}
                                >
                                  {periodKeyLabel(p.periodKey)}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
            </div>
          </div>
                  <Link
                    href="/expenses/entries"
                    className="group flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-outline-variant/20 bg-white px-4 py-3 text-sm font-bold text-primary shadow-sm transition-all hover:border-primary/30 hover:bg-primary/5 hover:gap-3 lg:inline-flex lg:w-auto lg:self-center lg:py-2.5 lg:pl-5 lg:pr-4"
                  >
                    Xem giao dịch thu chi
                    <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1 sm:size-5" />
                  </Link>
                </div>
          </div>
        </section>
      </div>
        </>
      )}

      {!detailLoading && detail && detail.lines.length === 0 ? (
        <p className="text-sm text-on-surface-variant text-center">
          Kỳ đã tạo nhưng chưa có hạn mức theo danh mục — bấm &quot;Sửa ngân sách&quot; để thêm dòng.
        </p>
      ) : null}
    </main>
  );
}
