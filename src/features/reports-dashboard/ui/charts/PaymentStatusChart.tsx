"use client";

import {
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { PaymentStatusBreakdownItem } from "@/features/reports-dashboard/model/jobsDashboardTypes";

const COLORS: Record<string, string> = {
  UNPAID: "#fb7185",
  DEPOSIT_PAID: "#facc15",
  COMPLETED: "#22c55e",
};

type Props = {
  data: PaymentStatusBreakdownItem[];
};

export function PaymentStatusChart({ data }: Props) {
  const totalCount = data.reduce((sum, d) => sum + d.count, 0);
  const safeTotal = totalCount > 0 ? totalCount : 1;

  const radialData: Array<PaymentStatusBreakdownItem & { value: number; percent: number }> =
    data.length > 0
      ? data.map((d) => ({
          ...d,
          value: d.count,
          percent: (d.count / safeTotal) * 100,
        }))
      : ([{ status: "UNPAID", count: 1 }] as PaymentStatusBreakdownItem[]).map((d) => ({
          ...d,
          value: d.count,
          percent: (d.count / safeTotal) * 100,
        }));

  const completedCount = data.find((d) => d.status === "COMPLETED")?.count ?? 0;
  const completedPct = Math.round((completedCount / safeTotal) * 100);

  return (
    <div className="relative w-full h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={radialData}
          innerRadius={58}
          outerRadius={92}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, "dataMax"]} tick={false} />
          <RadialBar dataKey="value" background>
            {radialData.map((entry, index) => (
              <Cell key={index} fill={COLORS[entry.status] ?? "#cbd5f5"} />
            ))}
          </RadialBar>
          <Tooltip
            formatter={(value, _name, props) => {
              const count = typeof value === "number" ? value : 0;
              const p = props?.payload as
                | (PaymentStatusBreakdownItem & { percent?: number })
                | undefined;
              const percent = typeof p?.percent === "number" ? p.percent : 0;
              return [`${count} (${percent.toFixed(1)}%)`, p?.status ?? ""];
            }}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70">
            Hoàn thành
          </p>
          <div className="mt-2 text-2xl font-black text-on-surface">
            {completedPct}%
          </div>
        </div>
      </div>
    </div>
  );
}

