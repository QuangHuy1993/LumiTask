"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string }[] = [
  { href: "/expenses/transfers", label: "Chuyển ví" },
  { href: "/expenses/tags", label: "Nhãn" },
  { href: "/expenses/recurring", label: "Định kỳ" },
];

function isActiveTab(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ExpensesSubNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-20 -mx-6 lg:-mx-8 px-6 lg:px-8 py-3 bg-background-light/80 backdrop-blur-xl border-b border-outline-variant/10">
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        {TABS.map((t) => {
          const active = isActiveTab(pathname, t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                active
                  ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                  : "bg-white text-on-surface-variant hover:bg-surface-container-low"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

