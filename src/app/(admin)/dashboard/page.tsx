import React from "react";
import Link from "next/link";
import { StatCards } from "@/features/admin/ui/StatCards";
import { PerformanceChart } from "@/features/admin/ui/PerformanceChart";
import { RecentActivity } from "@/features/admin/ui/RecentActivity";
import { PriorityJobsTable } from "@/features/admin/ui/PriorityJobsTable";
import { SpendingCategories } from "@/features/admin/ui/SpendingCategories";
import { WalletLiquidity } from "@/features/admin/ui/WalletLiquidity";
import { Calendar, Plus } from "lucide-react";
import { getAdminDashboardData } from "@/features/admin/services/adminDashboardService";

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const { stats, activities, priorityJobs } = await getAdminDashboardData();

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 max-w-[1600px]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tighter text-on-surface">Tổng quan tài chính</h2>
          <p className="text-on-surface-variant mt-1">Quản lý và theo dõi tình hình tài chính của bạn.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-surface-container-highest text-on-surface-variant rounded-xl font-semibold text-sm hover:bg-surface-container-high transition-all flex items-center gap-2">
            <Calendar className="size-4" />
            30 ngày qua
          </button>
          <Link
            href="/jobs/list"
            className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Plus className="size-4" />
            Tạo mới
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <StatCards data={stats} />

      {/* Charts: Cash Flow + Spending Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <PerformanceChart />
        </div>
        <div>
          <SpendingCategories />
        </div>
      </div>

      {/* Bottom: Recent Transactions + Wallet Liquidity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <RecentActivity data={activities} />
        </div>
        <div>
          <WalletLiquidity />
        </div>
      </div>

      {/* Priority Jobs Table */}
      <PriorityJobsTable data={priorityJobs} />
    </main>
  );
}
