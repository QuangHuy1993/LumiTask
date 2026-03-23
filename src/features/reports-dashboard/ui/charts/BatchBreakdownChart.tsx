"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { TopBatchItem } from "@/features/reports-dashboard/model/jobsDashboardTypes";
import { formatMoneyVND } from "@/features/work-batches/model/moneyFormat";

type Props = {
  data: TopBatchItem[];
};

export function BatchBreakdownChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ left: 10, right: 10, bottom: 16, top: 10 }}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
        <XAxis
          dataKey="batchName"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
          interval={0}
          angle={-25}
          textAnchor="end"
        />
        <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value) => formatMoneyVND(typeof value === "number" ? value : 0)}
          labelFormatter={() => ""}
        />
        <Legend />
        <Bar dataKey="gross" fill="#22c55e" name="Doanh thu" radius={[8, 8, 0, 0]} />
        <Bar dataKey="net" fill="#0ea5e9" name="Thực lãnh" radius={[8, 8, 0, 0]} />
        <Bar dataKey="commission" fill="#f97316" name="Hoa hồng" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

