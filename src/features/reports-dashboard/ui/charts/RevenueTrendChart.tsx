"use client";

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { RevenueTrendPoint } from "@/features/reports-dashboard/model/jobsDashboardTypes";
import { formatMoneyVND } from "@/features/work-batches/model/moneyFormat";

type Props = {
  data: RevenueTrendPoint[];
};

export function RevenueTrendChart({ data }: Props) {
  const formatMonth = (bucketLabel: string) => (bucketLabel.length >= 7 ? bucketLabel.slice(5) : bucketLabel);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
        <XAxis
          dataKey="bucketLabel"
          tickLine={false}
          axisLine={false}
          tickFormatter={formatMonth}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          yAxisId="money"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12 }}
          tickFormatter={(v) => formatMoneyVND(v)}
        />
        <Tooltip
          formatter={(value, name) => {
            const v = typeof value === "number" ? value : 0;
            const label = name === "gross" ? "Doanh thu" : name === "net" ? "Thực lãnh" : String(name);
            return [formatMoneyVND(v), label];
          }}
          labelFormatter={(label) => `Tháng ${formatMonth(label as string)}`}
        />
        <Legend />

        <Bar yAxisId="money" dataKey="gross" fill="#22c55e" radius={[8, 8, 0, 0]} name="Doanh thu" />
        <Line yAxisId="money" type="monotone" dataKey="net" stroke="#0ea5e9" strokeWidth={2.5} dot={false} name="Thực lãnh" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

