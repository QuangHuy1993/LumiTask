"use client";

// Force re-compile to resolve onTabChange caching issues
import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { UserRole } from "@/lib/auth/session";

type SettingsTab = 'account' | 'billing' | 'sessions' | 'app';

interface SettingsNavigationProps {
  activeTab: SettingsTab;
  role: UserRole;
}

const navItems: { label: string; value: SettingsTab }[] = [
  { label: "Tài khoản & bảo mật", value: 'account' },
  { label: "Ngân hàng & thanh toán", value: 'billing' },
  { label: "Phiên đăng nhập", value: 'sessions' },
  { label: "Cài đặt ứng dụng", value: 'app' },
];

export function SettingsNavigation({ activeTab, role }: SettingsNavigationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const visibleItems = React.useMemo(() => {
    if (role === "OWNER") return navItems;
    return navItems.filter((i) => i.value !== "app");
  }, [role]);

  const handleTabChange = (tab: SettingsTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`?${params.toString()}`, { scroll: false });
  };

  return (
    <nav className="w-full md:w-64 space-y-2">
      {visibleItems.map((item) => (
        <button
          key={item.value}
          onClick={() => handleTabChange(item.value)}
          className={`w-full text-left px-4 py-3 rounded-xl transition-all font-medium ${
            activeTab === item.value
              ? "bg-white text-primary shadow-sm border border-primary/10"
              : "text-moss-500 hover:bg-white hover:shadow-sm"
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
