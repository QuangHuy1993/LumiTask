import React from "react";
import Link from "next/link";
import { StatCards } from "@/features/admin/ui/StatCards";
import { PerformanceChart } from "@/features/admin/ui/PerformanceChart";
import { RecentActivity } from "@/features/admin/ui/RecentActivity";
import { PriorityJobsTable } from "@/features/admin/ui/PriorityJobsTable";
import { Calendar, Plus } from "lucide-react";
import { getAdminDashboardData } from "@/features/admin/services/adminDashboardService";

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const { stats, activities, priorityJobs } = await getAdminDashboardData();

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-moss-900">Tổng quan việc làm</h2>
          <p className="text-moss-500">Chào mừng trở lại! Đây là tóm tắt công việc của bạn.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/jobs" className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all">
            <Plus className="size-4" />
            <span>Tạo việc mới</span>
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      <StatCards data={stats} />

      {/* Main Grid: Chart & Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
          <PerformanceChart />
        </div>
        <div>
          <RecentActivity data={activities} />
        </div>
      </div>

      {/* Priority Jobs Table */}
      <PriorityJobsTable data={priorityJobs} />
    </main>
  );
}
