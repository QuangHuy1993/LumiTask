"use client";

import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  className?: string;
};

export function ChartCard({ title, children, className }: Props) {
  return (
    <div
      className={[
        "bg-surface-container-lowest border border-outline-variant/20 rounded-2xl shadow-sm p-6 space-y-4",
        className ?? "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-black tracking-tight">{title}</h4>
      </div>
      {children}
    </div>
  );
}

