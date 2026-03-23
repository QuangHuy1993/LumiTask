import { Metadata } from "next";

import { jobsDashboardService } from "@/features/reports-dashboard/services/jobsDashboardService";
import { JobsDashboardClient } from "@/features/reports-dashboard/ui/JobsDashboardClient";
import type { JobsDashboardFilters } from "@/features/reports-dashboard/model/jobsDashboardTypes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Báo cáo sơ bộ - LumiTask",
  description: "Tổng quan công việc và dữ liệu tài chính.",
};

export default async function JobsDashboardPage() {
  const defaultFilters: JobsDashboardFilters = {
    preset: "LAST_30_DAYS",
    batchId: null,
  };

  const data = await jobsDashboardService.getDashboardData(defaultFilters);

  return <JobsDashboardClient initialData={data} />;
}
