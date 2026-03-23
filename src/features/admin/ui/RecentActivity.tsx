"use client";

import React from "react";
import { CheckCircle, FileText, MessageSquare, RotateCw, Activity } from "lucide-react";

export type ActivityItem = {
  title: string;
  description: string;
  time: string;
  color: string;
};

export function RecentActivity({ data }: { data: ActivityItem[] }) {
  const getIcon = (color: string) => {
    switch (color) {
      case 'primary': return FileText;
      case 'moss': return CheckCircle;
      case 'amber': return MessageSquare;
      case 'blue': return RotateCw;
      default: return Activity;
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-card border border-moss-100">
      <h3 className="text-lg font-bold mb-6 text-moss-900">Hoạt động gần đây</h3>
      <div className="space-y-6">
        {data.length === 0 ? (
          <p className="text-sm text-moss-500 italic text-center py-4">Chưa có hoạt động nào</p>
        ) : data.map((activity, index) => {
          const Icon = getIcon(activity.color);
          return (
            <div key={index} className="flex gap-4 group">
              <div className="relative">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  activity.color === 'primary' ? 'bg-primary/10 text-primary' :
                  activity.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                  activity.color === 'amber' ? 'bg-amber-100 text-amber-600' :
                  'bg-moss-100 text-moss-500'
                }`}>
                  <Icon className="size-5" />
                </div>
                {index !== data.length - 1 && (
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-moss-100"></div>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-moss-900 transition-colors group-hover:text-primary">{activity.title}</p>
                <p className="text-xs text-moss-500 mt-1">{activity.description}</p>
                <p className="text-[10px] text-moss-400 mt-1">{activity.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
