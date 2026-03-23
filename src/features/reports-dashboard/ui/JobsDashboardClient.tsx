"use client";

import React, { useState } from "react";
import {
  ReceiptText,
  LineChart,
  Wallet2,
  BadgeDollarSign,
  Users,
  AlertTriangle,
  Clock3,
  Percent,
} from "lucide-react";
import Link from "next/link";

import type { JobsDashboardFilters, JobsDashboardVM, JobsDashboardPreset } from "@/features/reports-dashboard/model/jobsDashboardTypes";
import { KpiCard } from "@/features/reports-dashboard/ui/KpiCard";
import { ChartCard } from "@/features/reports-dashboard/ui/ChartCard";
import { RevenueTrendChart } from "@/features/reports-dashboard/ui/charts/RevenueTrendChart";
import { PaymentStatusChart } from "@/features/reports-dashboard/ui/charts/PaymentStatusChart";
import { TopClientsChart } from "@/features/reports-dashboard/ui/charts/TopClientsChart";
import { JobStatusStackedChart } from "@/features/reports-dashboard/ui/charts/JobStatusStackedChart";
import { BatchBreakdownChart } from "@/features/reports-dashboard/ui/charts/BatchBreakdownChart";

type Props = {
  initialData: JobsDashboardVM;
};

const PRESET_LABELS: Record<JobsDashboardPreset, string> = {
  LAST_7_DAYS: "7 ngày",
  LAST_30_DAYS: "30 ngày",
  THIS_MONTH: "Tháng này",
  THIS_QUARTER: "Quý này",
  THIS_YEAR: "Năm này",
  CUSTOM: "Tuỳ chọn",
};

export function JobsDashboardClient({ initialData }: Props) {
  const [data, setData] = useState<JobsDashboardVM>(initialData);
  const [isLoading, setIsLoading] = useState(false);

  async function handleChangePreset(preset: JobsDashboardPreset) {
    if (preset === data.filtersResolved.preset) return;
    setIsLoading(true);
    try {
      const filters: JobsDashboardFilters = {
        preset,
        batchId: data.filtersResolved.batchId,
      };
      const res = await fetch("/api/jobs/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });
      if (!res.ok) {
        throw new Error("Failed to load dashboard data");
      }
      const next: JobsDashboardVM = await res.json();
      setData(next);
    } finally {
      setIsLoading(false);
    }
  }

  const currentPreset = data.filtersResolved.preset;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-on-surface tracking-tight">Báo cáo sơ bộ</h2>
          <p className="text-on-surface-variant font-medium flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full" />
            Tổng quan hiệu suất công việc và tài chính
          </p>
          <p className="text-xs text-on-surface-variant/70">
            Từ{" "}
            <span className="font-semibold">
              {new Date(data.filtersResolved.from).toLocaleDateString("vi-VN")}
            </span>{" "}
            đến{" "}
            <span className="font-semibold">
              {new Date(data.filtersResolved.to).toLocaleDateString("vi-VN")}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-surface-container-low rounded-xl p-1 shadow-sm">
            {(Object.keys(PRESET_LABELS) as JobsDashboardPreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => handleChangePreset(preset)}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  currentPreset === preset
                    ? "bg-surface-container-lowest text-primary font-bold shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {PRESET_LABELS[preset]}
              </button>
            ))}
          </div>
          <div className="h-10 w-[1px] bg-outline-variant/20 mx-1" />
          <Link
            href="/jobs/transactions"
            className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high text-on-surface-variant font-bold text-sm rounded-xl hover:bg-surface-variant transition-all"
          >
            <ReceiptText className="size-5" />
            Xem chi tiết giao dịch
          </Link>
          <Link
            href="/jobs/reports"
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold text-sm rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            <LineChart className="size-5" />
            Xem báo cáo chi tiết
          </Link>
        </div>
      </div>

      {/* Loading banner */}
      {isLoading && (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-2 text-xs font-medium text-on-surface-variant flex items-center gap-2">
          <span className="size-2 rounded-full bg-primary animate-pulse" />
          Đang tải dữ liệu theo kỳ mới...
        </div>
      )}

      {/* KPI cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KpiCard
          variant="gross"
          title="Doanh thu đợt"
          value={data.kpis.grossRevenue}
          icon={<BadgeDollarSign className="size-5" />}
        />

        <KpiCard
          variant="net"
          title="Thực lãnh"
          value={data.kpis.netRevenue}
          icon={<Wallet2 className="size-5" />}
          subtitle={
            <span className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" />
              Tổng {data.kpis.totalJobs} việc
            </span>
          }
        />

        <KpiCard
          variant="commission"
          title="Hoa hồng chi ra"
          value={data.kpis.commissionPaid}
          icon={<Percent className="size-5" />}
        />

        <KpiCard
          variant="unpaid"
          title="Còn thiếu"
          value={data.kpis.unpaidRemaining}
          icon={<AlertTriangle className="size-5" />}
          subtitle={<span>Cần theo dõi thu tiền</span>}
        />

        <KpiCard
          variant="overdue"
          title="Quá hạn"
          value={`${data.kpis.overdueJobs}`}
          icon={<Clock3 className="size-5" />}
          subtitle={<span>Công việc</span>}
        />

        {data.kpis.topReferrer ? (
          <KpiCard
            variant="topReferrer"
            title="Nhận hoa hồng nhiều nhất"
            value={data.kpis.topReferrer.name}
            icon={<Users className="size-5" />}
            subtitle={<span className="text-primary">{data.kpis.topReferrer.commission}</span>}
          />
        ) : (
          <KpiCard
            variant="topReferrer"
            title="Nhận hoa hồng nhiều nhất"
            value="Chưa có dữ liệu"
            icon={<Users className="size-5" />}
          />
        )}
      </section>

      {/* Charts Row 1 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ChartCard
          title="Biến động Doanh thu & Thực lãnh"
          className="lg:col-span-2"
        >
          <RevenueTrendChart data={data.series.revenueTrend} />
        </ChartCard>

        <ChartCard title="Trạng thái thanh toán">
          <PaymentStatusChart data={data.series.paymentStatusBreakdown} />
        </ChartCard>
      </section>

      {/* Charts Row 2 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ChartCard title="Top 5 Khách hàng (Thực lãnh)">
          <TopClientsChart data={data.topLists.topClients} />
        </ChartCard>

        <ChartCard title="So sánh theo Đợt (Batches)">
          <BatchBreakdownChart data={data.topLists.topBatches} />
        </ChartCard>
      </section>

      {/* Charts Row 3 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ChartCard title="Tỷ lệ Trạng thái Công việc">
          <JobStatusStackedChart data={data.series.jobStatusTrend} />
        </ChartCard>

        {/* Placeholder for future table “Việc sắp đến hạn” – sẽ query riêng từ jobService nếu cần */}
        <ChartCard title="Việc sắp đến hạn">
          <p className="text-sm text-on-surface-variant">
            Sẽ được kết nối với `jobService.getListPage` hoặc một query chuyên biệt để hiển thị top 10 việc gần deadline.
          </p>
        </ChartCard>
      </section>
    </div>
  );
}

