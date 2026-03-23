"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { JobStatusTrendPoint } from "@/features/reports-dashboard/model/jobsDashboardTypes";

type Props = {
  data: JobStatusTrendPoint[];
};

export function JobStatusStackedChart({ data }: Props) {
  const formatMonth = (bucketLabel: string) =>
    bucketLabel.length >= 7 ? bucketLabel.slice(5) : bucketLabel;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 6, right: 6, top: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
        <XAxis
          dataKey="bucketLabel"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
          tickFormatter={(label) => formatMonth(String(label))}
        />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => (typeof value === "number" ? value : 0)} />
        <Legend />
        <Bar dataKey="notStarted" stackId="a" fill="#94a3b8" name="Chưa bắt đầu" />
        <Bar dataKey="inProgress" stackId="a" fill="#0ea5e9" name="Đang làm" />
        <Bar dataKey="completed" stackId="a" fill="#22c55e" name="Hoàn thành" />
        <Bar dataKey="cancelled" stackId="a" fill="#e5e7eb" name="Đã huỷ" />
      </BarChart>
    </ResponsiveContainer>
  );
}

