"use client";

import React from "react";
import { AlertCircle, Landmark, Clock, CheckCircle2 } from "lucide-react";

export type StatItem = {
  title: string;
  value: string;
  change: string;
  trend: string;
  color: string;
};

export function StatCards({ data }: { data: StatItem[] }) {
  const getIcon = (index: number) => {
    switch (index) {
      case 0: return AlertCircle;
      case 1: return Landmark;
      case 2: return Clock;
      case 3: return CheckCircle2;
      default: return AlertCircle;
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {data.map((stat, index) => {
        const Icon = getIcon(index);
        return (
          <div 
            key={index} 
            className="bg-white p-6 rounded-2xl shadow-card border border-moss-100 flex flex-col gap-4 transform transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg transition-colors ${
                stat.color === 'primary' ? 'bg-primary/10 text-primary' : 
                stat.color === 'blue' ? 'bg-blue-100 text-blue-600' : 
                'bg-amber-100 text-amber-600'
              }`}>
                <Icon className="size-5 group-hover:scale-110 transition-transform" />
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                stat.trend === 'up' ? 'text-primary bg-primary/5' : 
                stat.trend === 'down' ? 'text-red-500 bg-red-50' : 
                'text-primary bg-primary/5'
              }`}>
                {stat.change}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-moss-500">{stat.title}</p>
              <h3 className="text-2xl font-bold mt-1 text-moss-900">{stat.value}</h3>
            </div>
          </div>
        );
      })}
    </div>
  );
}
