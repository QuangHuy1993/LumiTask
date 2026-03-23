import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export async function getAdminDashboardData() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalJobs,
    completedJobs,
    monthlyRevenueRef,
    pendingJobs,
    recentJobsDesc,
    priorityJobsAsc
  ] = await Promise.all([
    prisma.job.count({ where: { deletedAt: null } }),
    prisma.job.count({ where: { deletedAt: null, status: "COMPLETED" } }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        deletedAt: null,
        status: "COMPLETED",
        direction: "INCOMING",
        transactionDate: { gte: firstDayOfMonth },
      },
    }),
    prisma.job.count({ where: { deletedAt: null, status: { not: "COMPLETED" } } }),
    prisma.job.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { client: true },
    }),
    prisma.job.findMany({
      where: { deletedAt: null, status: { not: "COMPLETED" } },
      orderBy: { deadline: "asc" },
      take: 5,
      include: { client: true },
    }),
  ]);

  const monthlyRevenue = Number(monthlyRevenueRef._sum.amount || 0);

  // Stats
  const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;
  
  const stats = [
    {
      title: "Tổng việc làm",
      value: String(totalJobs),
      change: "Toàn thời gian",
      trend: "up",
      color: "primary",
    },
    {
      title: "Thu nhập tháng này",
      value: new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", notation: "compact" }).format(monthlyRevenue),
      change: "Tháng hiện tại",
      trend: "up",
      color: "blue",
    },
    {
      title: "Hợp đồng chờ",
      value: String(pendingJobs),
      change: "Chưa hoàn thành",
      trend: "down",
      color: "amber",
    },
    {
      title: "Tỷ lệ hoàn thành",
      value: `${completionRate.toFixed(1)}%`,
      change: "Tổng quan",
      trend: "neutral",
      color: "primary",
    },
  ];

  // Activities (Mock mapping from jobs)
  const activities = recentJobsDesc.map((job) => {
    let title = "Tạo việc mới";
    let color = "primary";
    if (job.status === "COMPLETED") {
      title = "Hoàn thành việc";
      color = "moss";
    }

    return {
      title: `${title}: ${job.name}`,
      description: `Client: ${job.client?.name ?? "Không rõ"}`,
      time: job.createdAt.toLocaleDateString("vi-VN"),
      color,
    };
  });

  // Priority Jobs
  const priorityJobs = priorityJobsAsc.map((job) => {
    let statusColor = "primary";
    if (job.status === "CANCELLED") statusColor = "red";
    else if (job.paymentStatus === "UNPAID") statusColor = "amber";

    // Format budget
    const budgetVal = Number(job.amount || 0);
    const budgetStr = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", notation: "compact" }).format(budgetVal);

    return {
      id: job.id,
      name: String(job.name),
      client: String(job.client?.name ?? "Không rõ"),
      deadline: job.deadline ? job.deadline.toLocaleDateString("vi-VN") : "Không có",
      status: job.status === "COMPLETED" ? "Hoàn thành" : job.paymentStatus === "UNPAID" ? "Chờ thanh toán" : "Đang làm",
      statusColor,
      budget: budgetStr,
    };
  });

  return { stats, activities, priorityJobs };
}
