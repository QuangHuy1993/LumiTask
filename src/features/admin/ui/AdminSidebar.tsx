"use client";

import React, { useState } from "react";
import { 
  LayoutDashboard, 
  QrCode, 
  Briefcase, 
  Wallet, 
  ShoppingCart,
  Settings,
  ChevronDown,
  ChevronRight,
  Users,
  BookOpen,
  CalendarRange
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { name: "Tổng quan", icon: LayoutDashboard, href: "/dashboard" },
  { name: "Tạo mã thanh toán", icon: QrCode, href: "/payment-gen" },
  { 
    name: "Quản lý việc làm", 
    icon: Briefcase, 
    href: "/jobs",
    isExpandable: true,
    subItems: [
      { name: "Báo cáo sơ bộ", icon: LayoutDashboard, href: "/jobs/dashboard" },
      { name: "Quản lý giao dịch", icon: Wallet, href: "/jobs/transactions" },
      { name: "Danh sách việc làm", icon: Briefcase, href: "/jobs/list" },
      { name: "Quản lý đợt làm", icon: CalendarRange, href: "/jobs/work-batches" },
      { name: "Danh sách khách hàng", icon: Users, href: "/jobs/clients" },
      { name: "Danh mục môn học", icon: BookOpen, href: "/jobs/subjects" },
    ]
  },
  { name: "Quản lý chi tiêu", icon: Wallet, href: "/expenses" },
  { 
    name: "Quản lý mua bán", 
    icon: ShoppingCart, 
    href: "/trading",
    isExpandable: true,
    subItems: [
      { name: "Danh sách khách hàng", icon: Users, href: "/trading/contacts" },
      { name: "Dịch vụ & nhắc hạn", icon: ShoppingCart, href: "/trading/subscriptions" },
      { name: "Danh mục dịch vụ", icon: BookOpen, href: "/trading/categories" },
    ],
  },
  { name: "Cài đặt hệ thống", icon: Settings, href: "/settings" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [openGroupHref, setOpenGroupHref] = useState<string | null>(() => {
    if (pathname.startsWith("/jobs")) return "/jobs";
    if (pathname.startsWith("/trading")) return "/trading";
    return null;
  });

  return (
    <aside className="w-64 bg-white border-r border-moss-200 hidden lg:flex flex-col h-full sticky top-0 z-40">
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
        <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-moss-400 px-4 mb-4">
          Quản trị hệ thống
        </p>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.isExpandable && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            if (item.isExpandable) {
              return (
                <div key={item.name} className="space-y-1">
                  <button
                    onClick={() => {
                      setOpenGroupHref((prev) => (prev === item.href ? null : item.href));
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                      isActive 
                        ? "bg-primary/5 text-primary font-bold" 
                        : "text-moss-600 hover:bg-moss-50 hover:text-moss-900"
                    }`}
                  >
                    <Icon className={`size-5 transition-transform group-hover:scale-110 ${isActive ? "text-primary" : "text-moss-500"}`} />
                    <span className="flex-1 text-left">{item.name}</span>
                    {openGroupHref === item.href ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  </button>
                  
                  {openGroupHref === item.href && (
                    <div className="ml-9 space-y-1 border-l border-moss-100 pl-2">
                      {item.subItems?.map((sub) => {
                        const isSubActive = pathname === sub.href;
                        const SubIcon = sub.icon;
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => {
                              if (pathname !== sub.href) {
                                window.dispatchEvent(new Event("trigger-page-transition"));
                              }
                            }}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
                              isSubActive 
                                ? "text-primary font-semibold bg-primary/5" 
                                : "text-moss-500 hover:text-moss-900 hover:bg-moss-50"
                            }`}
                          >
                            <SubIcon className="size-4" />
                            <span>{sub.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (pathname !== item.href) {
                    window.dispatchEvent(new Event("trigger-page-transition"));
                  }
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                  isActive 
                    ? "bg-primary/10 text-primary font-bold shadow-sm" 
                    : "text-moss-600 hover:bg-moss-50 hover:text-moss-900"
                }`}
              >
                <Icon className={`size-5 transition-transform group-hover:scale-110 ${isActive ? "text-primary" : "text-moss-500"}`} />
                <span className="flex-1">{item.name}</span>
                {isActive && <div className="size-1.5 bg-primary rounded-full" />}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-4 bg-moss-50 rounded-2xl border border-moss-100">
        <p className="text-sm font-semibold mb-2 text-moss-900">Dung lượng lưu trữ</p>
        <div className="w-full bg-moss-200 h-1.5 rounded-full overflow-hidden">
          <div 
            className="bg-primary h-full transition-all duration-1000 ease-out" 
            style={{ width: "75%" }}
          ></div>
        </div>
        <p className="text-xs text-moss-500 mt-2 font-medium">7.5 GB / 10 GB (75%)</p>
      </div>
    </div>
    </aside>
  );
}
