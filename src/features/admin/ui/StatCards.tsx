"use client";

import React from "react";
import { Wallet, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";

export type StatItem = {
  title: string;
  value: string;
  change: string;
  trend: string;
  color: string;
};

const cardConfigs = [
  {
    icon: Wallet,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    badgeBg: "bg-primary-fixed text-primary",
  },
  {
    icon: TrendingUp,
    iconBg: "bg-secondary-container/30",
    iconColor: "text-[#7a5900]",
    badgeBg: "bg-[#ffdea1] text-[#7a5900]",
  },
  {
    icon: TrendingDown,
    iconBg: "bg-tertiary-container/20",
    iconColor: "text-tertiary",
    badgeBg: "bg-tertiary-fixed text-tertiary",
  },
  {
    icon: PiggyBank,
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    badgeBg: "bg-primary-fixed text-primary",
  },
];

export function StatCards({ data }: { data: StatItem[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {data.map((stat, index) => {
        const cfg = cardConfigs[index] ?? cardConfigs[0];
        const Icon = cfg.icon;

        // Savings Progress card (index 3) has a progress bar instead of value
        if (index === 3) {
          // Parse completion rate percentage from value (e.g. "68.5%")
          const pctNum = parseFloat(stat.value) || 0;
          const barWidth = `${Math.min(pctNum, 100)}%`;

          return (
            <div
              key={index}
              className="bg-white p-6 rounded-[2rem] shadow-card border border-white/40 flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl ${cfg.iconBg} flex items-center justify-center ${cfg.iconColor}`}>
                  <Icon className="size-6" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-on-surface-variant">Tiến độ</p>
                  <p className="text-xs font-bold text-primary">{stat.value}</p>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-end mb-2">
                  <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">{stat.title}</p>
                  <span className="text-xs font-bold text-on-surface">{stat.change}</span>
                </div>
                <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-mint-400 rounded-full transition-all duration-1000"
                    style={{ width: barWidth }}
                  />
                </div>
              </div>
            </div>
          );
        }

        return (
          <div
            key={index}
            className="bg-white p-6 rounded-[2rem] shadow-card border border-white/40 flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl ${cfg.iconBg} flex items-center justify-center ${cfg.iconColor}`}>
                <Icon className="size-6" />
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${cfg.badgeBg}`}>
                {stat.change}
              </span>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">{stat.title}</p>
              <h3 className="text-2xl font-bold tracking-tight text-on-surface mt-1">{stat.value}</h3>
            </div>
          </div>
        );
      })}
    </div>
  );
}
