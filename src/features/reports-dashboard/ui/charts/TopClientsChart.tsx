"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { TopClientItem } from "@/features/reports-dashboard/model/jobsDashboardTypes";
import { formatMoneyVND } from "@/features/work-batches/model/moneyFormat";

type Props = {
  data: TopClientItem[];
};

export function TopClientsChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ left: 12, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.2} />
        <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} hide />
        <YAxis
          dataKey="clientName"
          type="category"
          tickLine={false}
          axisLine={false}
          width={140}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          formatter={(value) => formatMoneyVND(typeof value === "number" ? value : 0)}
          labelFormatter={() => ""}
        />
        <Bar dataKey="netRevenue" fill="#22c55e" radius={[8, 8, 0, 0]} barSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

