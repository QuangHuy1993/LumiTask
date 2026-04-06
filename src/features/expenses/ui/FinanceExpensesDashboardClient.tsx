"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Plus,
  Calendar,
  Utensils,
  Briefcase,
  Zap,
  ShoppingBag,
  Heart,
  CreditCard,
  ArrowRight,
  Car,
  Home,
} from "lucide-react";
import type { DashboardBundleDTO } from "@/features/expenses/model/financeDashboardTypes";
import { CategoryMonthEntriesDrawer } from "@/features/expenses/ui/CategoryMonthEntriesDrawer";

const fmt = (s: string) => new Intl.NumberFormat("vi-VN").format(Math.round(Number(s)));

function fmtDelta(pct: number | null): string {
  if (pct == null) return "—";
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct}% kỳ trước`;
}

function shortDayLabel(ymd: string): string {
  const parts = ymd.split("-");
  if (parts.length !== 3) return ymd;
  const [, m, d] = parts;
  return `${d}/${m}`;
}

function weekLabel(ymd: string): string {
  return ymd.slice(5).replace("-", "/");
}

const DEFAULT_CHART_COLORS = ["#1d4ed8", "#f0c05a", "#ae2f34", "#6366f1", "#0d9488", "#c026d3"];

function strokeForCategory(color: string | null, i: number): string {
  if (color && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color.trim())) return color.trim();
  return DEFAULT_CHART_COLORS[i % DEFAULT_CHART_COLORS.length]!;
}

function iconForCategory(name: string | null) {
  const n = (name ?? "").toLowerCase();
  if (n.includes("ăn") || n.includes("uống") || n.includes("cafe")) return Utensils;
  if (n.includes("thu") || n.includes("lương") || n.includes("dự án")) return Briefcase;
  if (n.includes("điện") || n.includes("nước") || n.includes("tiện")) return Zap;
  if (n.includes("sức khỏe") || n.includes("bảo hiểm")) return Heart;
  if (n.includes("xe") || n.includes("di chuyển")) return Car;
  if (n.includes("nhà") || n.includes("thuê")) return Home;
  return ShoppingBag;
}

function periodKeyFromIsoInTz(iso: string, tz: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit" }).formatToParts(d);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  if (!year || !month) return "";
  return `${year}-${month}`;
}

type Props = {
  bundle: DashboardBundleDTO;
  periodLabel: string;
  periodToggleHref: string;
};

export function FinanceExpensesDashboardClient({ bundle, periodLabel, periodToggleHref }: Props) {
  const { summary, timeseries, byCategory, byWallet, recentEntries } = bundle;
  const [categoryDetailOpen, setCategoryDetailOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<{ id: number; name: string; icon: string | null; color: string | null } | null>(null);

  const tz = summary.range.tz ?? "Asia/Ho_Chi_Minh";
  const periodKey = useMemo(() => periodKeyFromIsoInTz(summary.range.from, tz), [summary.range.from, tz]);

  const chartData = useMemo(() => {
    return timeseries.labels.map((label, i) => ({
      label: timeseries.granularity === "week" ? weekLabel(label) : shortDayLabel(label),
      fullLabel: label,
      income: Number(timeseries.income[i] ?? 0),
      expense: Number(timeseries.expense[i] ?? 0),
    }));
  }, [timeseries]);

  const donutSegments = useMemo(() => {
    let offset = 0;
    return byCategory.map((c, i) => {
      const p = Math.max(0, Math.min(100, c.pctOfExpense));
      const dash = `${p} ${100 - p}`;
      const seg = { dash, offset: -offset, stroke: strokeForCategory(c.color, i) };
      offset += p;
      return seg;
    });
  }, [byCategory]);

  const totalIncomeNum = Number(summary.incomeTotal);
  const netNum = Number(summary.net);
  const savingsPct =
    totalIncomeNum > 0 ? Math.min(100, Math.max(0, Math.round((netNum / totalIncomeNum) * 100))) : 0;

  const maxWalletFlow = Math.max(
    1,
    ...byWallet.map((w) => Number(w.income) + Number(w.expense)),
  );

  const KPI_CARDS = [
    {
      label: "Tổng số dư",
      value: `${fmt(summary.walletBalanceTotal ?? "0")} ${summary.range.currency}`,
      badge: null as string | null,
      badgeBg: "bg-primary-fixed",
      badgeColor: "text-primary",
      icon: Wallet,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      kind: "value" as const,
    },
    {
      label: "Thu nhập kỳ",
      value: `${fmt(summary.incomeTotal)} ${summary.range.currency}`,
      badge: fmtDelta(summary.deltaPct.income),
      badgeBg: "bg-[#ffdea1]",
      badgeColor: "text-[#7a5900]",
      icon: TrendingUp,
      iconBg: "bg-[#ffcd66]/30",
      iconColor: "text-[#7a5900]",
      kind: "value" as const,
    },
    {
      label: "Chi tiêu kỳ",
      value: `${fmt(summary.expenseTotal)} ${summary.range.currency}`,
      badge: fmtDelta(summary.deltaPct.expense),
      badgeBg: "bg-[#ffdad8]",
      badgeColor: "text-[#ae2f34]",
      icon: TrendingDown,
      iconBg: "bg-[#ae2f34]/10",
      iconColor: "text-[#ae2f34]",
      kind: "value" as const,
    },
    {
      label: "Tỷ lệ thu giữ lại",
      value: null,
      badge: null,
      badgeBg: "",
      badgeColor: "",
      icon: PiggyBank,
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      kind: "progress" as const,
    },
  ];

  const cashFlowSubtitle =
    timeseries.granularity === "week"
      ? "Thu và chi theo tuần (theo múi giờ đã chọn)"
      : "Thu nhập và chi tiêu theo ngày";

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-8 max-w-7xl">
      <CategoryMonthEntriesDrawer
        open={categoryDetailOpen}
        onClose={() => setCategoryDetailOpen(false)}
        periodKey={periodKey || new Date(summary.range.from).toISOString().slice(0, 7)}
        category={activeCategory ? { id: activeCategory.id, name: activeCategory.name, icon: activeCategory.icon, color: activeCategory.color } : null}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-on-surface">Tổng quan tài chính</h1>
          <p className="text-on-surface-variant text-sm mt-0.5">Quản lý tài chính cá nhân rõ ràng và chính xác.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={periodToggleHref}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-surface-container-highest text-on-surface-variant rounded-xl font-bold text-xs hover:bg-surface-container-high transition-all flex items-center justify-center gap-2"
          >
            <Calendar className="size-4" />
            {periodLabel}
          </Link>
          <Link
            href="/expenses/entries"
            className="flex-1 sm:flex-none px-4 py-2.5 bg-primary text-white rounded-xl font-bold text-xs shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="size-4" />
            Giao dịch mới
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        {KPI_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white p-3.5 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] shadow-card border border-white/40 flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-3 sm:mb-6">
                <div
                  className={`w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-2xl ${card.iconBg} flex items-center justify-center`}
                >
                  <Icon className={`size-4 sm:size-6 ${card.iconColor}`} />
                </div>
                {card.badge && (
                  <span
                    className={`hidden sm:inline-block text-[10px] font-black px-2.5 py-1 rounded-lg ${card.badgeBg} ${card.badgeColor} uppercase tracking-wider`}
                  >
                    {card.badge}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-0.5 sm:mb-1 opacity-60 truncate">
                  {card.label}
                </p>
                {card.kind === "value" && card.value ? (
                  <h3 className="text-base sm:text-xl font-black tracking-tight text-on-surface truncate">{card.value}</h3>
                ) : (
                  <>
                    <div className="flex justify-between items-end mb-1 sm:mb-2">
                      <span className="text-[8px] sm:text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                        Net / Thu
                      </span>
                      <span className="text-xs sm:text-sm font-black text-on-surface">{savingsPct}%</span>
                    </div>
                    <div className="h-1 sm:h-2.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all duration-700"
                        style={{ width: `${savingsPct}%` }}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] shadow-card border border-white/40 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
            <div>
              <h4 className="text-lg font-black text-on-surface tracking-tight">Dòng tiền</h4>
              <p className="text-[10px] sm:text-xs text-on-surface-variant font-medium">{cashFlowSubtitle}</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-primary" />
                <span className="text-[10px] sm:text-xs font-bold text-on-surface-variant">Thu</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-[#ae2f34]" />
                <span className="text-[10px] sm:text-xs font-bold text-on-surface-variant">Chi</span>
              </div>
            </div>
          </div>
          <div className="relative h-[220px] sm:h-[280px] w-full mt-2">
            {chartData.length === 0 ? (
              <p className="text-sm text-on-surface-variant text-center py-16">Chưa có dữ liệu trong kỳ.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-outline-variant/20" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmt(String(v))} width={48} />
                  <Tooltip
                    formatter={(v) => [fmt(String(v ?? 0)), ""]}
                    labelFormatter={(_, payload) =>
                      (payload[0]?.payload as { fullLabel?: string } | undefined)?.fullLabel ?? ""
                    }
                  />
                  <Area type="monotone" dataKey="income" stroke="#1d4ed8" fill="#1d4ed8" fillOpacity={0.12} strokeWidth={2} name="Thu" />
                  <Area type="monotone" dataKey="expense" stroke="#ae2f34" fill="#ae2f34" fillOpacity={0.1} strokeWidth={2} name="Chi" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-card border border-white/40 flex flex-col">
          <h4 className="text-lg font-bold text-on-surface tracking-tight mb-1">Danh mục chi tiêu</h4>
          <p className="text-xs text-on-surface-variant mb-6">Phân bổ chi trong kỳ</p>
          <div className="flex-1 flex flex-col items-center justify-center">
            {byCategory.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Chưa có chi tiêu phân loại.</p>
            ) : (
              <>
                <div className="relative w-40 h-40 mb-6">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle className="stroke-surface-container-high" cx="18" cy="18" r="16" fill="none" strokeWidth="4" />
                    {donutSegments.map((s, i) => (
                      <circle
                        key={i}
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        strokeWidth="4"
                        strokeDasharray={s.dash}
                        strokeDashoffset={s.offset}
                        stroke={s.stroke}
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Tổng chi</span>
                    <span className="text-lg font-black text-on-surface">{fmt(summary.expenseTotal)}</span>
                  </div>
                </div>
                <div className="w-full grid grid-cols-2 gap-3">
                  {byCategory.slice(0, 6).map((c, i) => (
                    <button
                      key={`${c.categoryId}-${c.name}`}
                      type="button"
                      className="flex items-center gap-2 min-w-0 text-left hover:bg-surface-container-low/40 rounded-xl px-2 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                      title={`Xem chi tiết giao dịch danh mục: ${c.name}`}
                      onClick={() => {
                        setActiveCategory({
                          id: c.categoryId,
                          name: c.name,
                          icon: c.icon ?? null,
                          color: c.color ?? null,
                        });
                        setCategoryDetailOpen(true);
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: strokeForCategory(c.color, i) }}
                      />
                      <span className="text-xs font-medium text-on-surface-variant truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-4 sm:p-8 rounded-[1.25rem] sm:rounded-[2rem] shadow-card border border-white/40">
          <div className="flex items-center justify-between mb-4 sm:mb-6 px-1">
            <h4 className="text-base sm:text-lg font-black text-on-surface tracking-tight">Giao dịch gần đây</h4>
            <Link
              href="/expenses/entries"
              className="text-primary text-[8px] sm:text-xs font-black uppercase tracking-widest hover:underline flex items-center gap-1"
            >
              Xem tất cả <ArrowRight className="size-3" />
            </Link>
          </div>
          <div className="space-y-2 sm:space-y-3">
            {recentEntries.length === 0 ? (
              <p className="text-sm text-on-surface-variant px-1">Chưa có giao dịch.</p>
            ) : (
              recentEntries.map((tx) => {
                const Icon = iconForCategory(tx.categoryName);
                const isExpense = tx.entryKind === "EXPENSE";
                const title = tx.note?.trim() || (isExpense ? "Chi tiêu" : "Thu nhập");
                const dateStr = new Intl.DateTimeFormat("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }).format(new Date(tx.occurredAt));
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-surface-container-lowest border border-outline-variant/10 hover:border-primary/20 hover:bg-white transition-all shadow-sm group"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                      <div
                        className={`w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-2xl shrink-0 flex items-center justify-center transition-all ${
                          isExpense ? "bg-[#ae2f34]/10" : "bg-primary/10"
                        }`}
                      >
                        <Icon className={`size-4 sm:size-6 ${isExpense ? "text-[#ae2f34]" : "text-primary"}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-on-surface line-clamp-1 leading-tight">{title}</p>
                        <p className="text-[8px] sm:text-[10px] text-on-surface-variant font-bold uppercase tracking-widest opacity-60 mt-0.5 sm:mt-1">
                          {tx.categoryName ?? "—"} • {tx.walletName} • {dateStr}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p
                        className={`text-sm sm:text-base font-black leading-none ${isExpense ? "text-[#ae2f34]" : "text-primary"}`}
                      >
                        {isExpense ? "-" : "+"}
                        {fmt(tx.amount)}
                      </p>
                      <p className="text-[8px] sm:text-[9px] font-black text-on-surface-variant uppercase opacity-40 mt-1">
                        {tx.currency}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-card border border-white/40 flex flex-col">
          <h4 className="text-lg font-bold text-on-surface tracking-tight mb-6">Dòng tiền theo ví (kỳ)</h4>
          <div className="space-y-6 flex-1">
            {byWallet.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Chưa có giao dịch theo ví.</p>
            ) : (
              byWallet.map((w, i) => {
                const flow = Number(w.income) + Number(w.expense);
                const pct = Math.round((flow / maxWalletFlow) * 100);
                const barClass =
                  i % 3 === 0 ? "bg-[#f0c05a]" : i % 3 === 1 ? "bg-gradient-to-r from-primary to-primary-container" : "bg-primary";
                return (
                  <div key={w.walletId}>
                    <div className="flex justify-between text-xs font-bold text-on-surface mb-2 gap-2">
                      <span className="truncate">{w.name}</span>
                      <span className="shrink-0 text-on-surface-variant">
                        +{fmt(w.income)} / −{fmt(w.expense)}
                      </span>
                    </div>
                    <div className="h-4 w-full bg-surface-container-low rounded-xl overflow-hidden">
                      <div className={`h-full ${barClass} rounded-xl transition-all duration-700`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-outline-variant/15">
            <Link
              href="/expenses/wallets"
              className="flex items-center gap-3 p-4 bg-surface-container-low rounded-2xl cursor-pointer hover:bg-surface-container transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white shrink-0">
                <CreditCard className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-on-surface">Quản lý ví</p>
                <p className="text-[10px] text-on-surface-variant">Thêm hoặc chỉnh ví</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-4 text-center">
        <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-[0.2em]">
          LumiTask Admin © 2026 • Tất cả quyền thuộc về chủ sở hữu
        </p>
      </footer>
    </main>
  );
}
