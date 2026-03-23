"use client";

import type { ReactNode } from "react";

type KpiCardVariant =
  | "gross"
  | "net"
  | "commission"
  | "unpaid"
  | "overdue"
  | "topReferrer";

type Props = {
  variant: KpiCardVariant;
  title: string;
  value: string;
  subtitle?: ReactNode;
  icon?: ReactNode;
};

function getVariantClasses(variant: KpiCardVariant) {
  switch (variant) {
    case "gross":
      return {
        container: "bg-primary-container border-primary-container/60 text-on-primary-container",
        iconBg: "bg-primary-container/90 text-on-primary-container",
        iconBorder: "border-primary-container/70",
      };
    case "net":
      return {
        container: "bg-primary-700 border-primary-700/70 text-white",
        iconBg: "bg-primary-600 text-white",
        iconBorder: "border-primary-600/70",
      };
    case "commission":
      return {
        container:
          "bg-secondary-container border-secondary-container/70 text-on-secondary-container",
        iconBg: "bg-secondary-container/90 text-on-secondary-container",
        iconBorder: "border-secondary-container/70",
      };
    case "unpaid":
      return {
        container: "bg-tertiary-container border-tertiary-container/70 text-on-tertiary-container",
        iconBg: "bg-tertiary-container/90 text-on-tertiary-container",
        iconBorder: "border-tertiary-container/70",
      };
    case "overdue":
      return {
        container: "bg-coral-700 border-coral-700/70 text-white",
        iconBg: "bg-coral-600 text-white",
        iconBorder: "border-coral-600/70",
      };
    case "topReferrer":
      return {
        container: "bg-primary-container border-primary-container/60 text-on-surface",
        iconBg: "bg-primary-container/90 text-primary",
        iconBorder: "border-primary-container/70",
      };
  }
}

export function KpiCard({ variant, title, value, subtitle, icon }: Props) {
  const c = getVariantClasses(variant);
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-6 min-h-[120px] shadow-card ${c.container}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-current/70">
            {title}
          </p>
          <h3 className="mt-2 text-2xl font-black leading-tight">{value}</h3>
        </div>
        {icon ? (
          <div
            className={`w-11 h-11 rounded-xl border ${c.iconBorder} flex items-center justify-center ${c.iconBg}`}
          >
            {icon}
          </div>
        ) : null}
      </div>

      {subtitle ? (
        <div className="mt-4 flex items-center gap-2 text-sm font-bold opacity-95">
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

