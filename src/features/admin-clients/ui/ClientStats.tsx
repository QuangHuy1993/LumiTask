"use client";

import React from "react";
import { Users, CheckCircle, UserPlus, Zap } from "lucide-react";
import { ClientStats as ClientStatsType } from "../model/clientSchema";

interface ClientStatsProps {
  stats: ClientStatsType;
}

export function ClientStats({ stats }: ClientStatsProps) {
  const statCards = [
    {
      label: "Tổng khách hàng",
      value: stats.total.toLocaleString(),
      change: "+12.5%",
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-50",
    },
    {
      label: "Đang hoạt động",
      value: stats.active.toLocaleString(),
      change: "+5.2%",
      icon: CheckCircle,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      label: "Khách mới (Tháng)",
      value: stats.monthNew.toLocaleString(),
      change: "+18%",
      icon: UserPlus,
      color: "text-purple-500",
      bgColor: "bg-purple-50",
    },
    {
      label: "Phiên tương tác",
      value: stats.online.toLocaleString(),
      change: "+24%",
      icon: Zap,
      color: "text-orange-500",
      bgColor: "bg-orange-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {statCards.map((card, index) => (
        <div 
          key={index} 
          className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between mb-4">
            <div className={`size-12 ${card.bgColor} ${card.color} rounded-2xl flex items-center justify-center`}>
              <card.icon className="size-6" />
            </div>
            <span className="text-primary text-[10px] font-black bg-primary/10 px-2 py-1 rounded-lg uppercase tracking-wider">
              {card.change}
            </span>
          </div>
          <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{card.label}</p>
          <h3 className="text-3xl font-black mt-1 text-slate-900 tracking-tight">{card.value}</h3>
        </div>
      ))}
    </div>
  );
}
