"use client";

import React from "react";
import { 
  UtensilsCrossed, 
  Briefcase, 
  Zap, 
  ShoppingBag, 
  HeartPulse,
  ArrowDownLeft,
  ArrowUpRight
} from "lucide-react";

export type ActivityItem = {
  title: string;
  description: string;
  time: string;
  color: string;
};

const iconMap: Record<string, React.ElementType> = {
  primary: Briefcase,
  moss: HeartPulse,
  amber: ShoppingBag,
  blue: Zap,
};

export function RecentActivity({ data }: { data: ActivityItem[] }) {
  const isIncome = (color: string) => color === "primary";

  const getIcon = (color: string): React.ElementType => {
    return iconMap[color] ?? UtensilsCrossed;
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-card border border-white/40">
      <div className="flex items-center justify-between mb-8">
        <h4 className="text-lg font-bold text-on-surface tracking-tight">Giao dịch gần đây</h4>
        <button className="text-primary text-xs font-bold hover:underline transition-all">
          Xem tất cả
        </button>
      </div>

      <div className="space-y-1">
        {data.length === 0 ? (
          <p className="text-sm text-on-surface-variant italic text-center py-8">
            Chưa có giao dịch nào
          </p>
        ) : (
          data.map((activity, index) => {
            const Icon = getIcon(activity.color);
            const income = isIncome(activity.color);
            return (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-2xl hover:bg-surface-container-low transition-colors group cursor-default"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-surface-container-highest flex items-center justify-center text-on-surface-variant group-hover:bg-white transition-all">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">{activity.title}</p>
                    <p className="text-[10px] text-on-surface-variant font-medium">
                      {activity.time} • {activity.description}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 text-sm font-bold ${income ? "text-primary" : "text-tertiary"}`}>
                  {income ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
                  {activity.description}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
