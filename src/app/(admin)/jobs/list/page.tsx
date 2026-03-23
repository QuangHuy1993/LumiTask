import { getJobsAction } from "@/features/jobs/actions/jobActions";
import { JobListContainer } from "@/features/jobs/ui/JobListContainer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Danh sách việc làm | LumiTask",
  description: "Quản lý toàn bộ việc làm, khách hàng và thu tiền.",
};

export default async function JobsListPage() {
  const res = await getJobsAction({ limit: 20 });

  const items = res.success ? res.items : [];
  const stats =
    res.success && res.stats
      ? res.stats
      : {
          totalJobs: 0,
          unpaidJobs: 0,
          depositPaidJobs: 0,
          completedJobs: 0,
          totalAmountText: "0 ₫",
          totalUnpaidText: "0 ₫",
        };

  return (
    <JobListContainer initialItems={items} initialStats={stats} />
  );
}

