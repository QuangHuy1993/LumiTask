"use client";

import React, { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UserRole } from "@/lib/auth/session";
import { toast } from "sonner";
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
  UserCog,
  BookOpen,
  CalendarRange,
  ListOrdered,
  Layers,
  WalletCards,
  PieChart,
  PiggyBank,
  CalendarClock,
  Landmark,
  Download,
  X,
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
  {
    name: "Quản lý chi tiêu",
    icon: Wallet,
    href: "/expenses",
    isExpandable: true,
    subItems: [
      { name: "Tổng quan", icon: LayoutDashboard, href: "/expenses/dashboard" },
      { name: "Giao dịch thu/chi", icon: ListOrdered, href: "/expenses/entries" },
      { name: "Danh mục thu/chi", icon: Layers, href: "/expenses/categories" },
      { name: "Ví", icon: WalletCards, href: "/expenses/wallets" },
      { name: "Ngân sách", icon: PieChart, href: "/expenses/budgets" },
      { name: "Mục tiêu tiết kiệm", icon: PiggyBank, href: "/expenses/goals" },
      { name: "Định kỳ", icon: CalendarClock, href: "/expenses/recurring" },
      { name: "Khoản nợ", icon: Landmark, href: "/expenses/loans" },
    ],
  },
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
  { name: "Quản lý người dùng", icon: UserCog, href: "/users" },
  { name: "Cài đặt hệ thống", icon: Settings, href: "/settings" },
];

const LIMITED_ALLOWED_HREFS = ["/payment-gen", "/expenses", "/settings"];

interface AdminSidebarProps {
  isMobileOpen?: boolean;
  onClose?: () => void;
  role?: UserRole;
}

export function AdminSidebar({ isMobileOpen = false, onClose, role = "LIMITED" }: AdminSidebarProps) {
  const pathname = usePathname();
  const [openGroupHref, setOpenGroupHref] = useState<string | null>(() => {
    if (pathname.startsWith("/jobs")) return "/jobs";
    if (pathname.startsWith("/expenses")) return "/expenses";
    if (pathname.startsWith("/trading")) return "/trading";
    return null;
  });

  const visibleNavItems = useMemo(() => {
    if (role === "OWNER") return navItems;
    return navItems.filter((item) =>
      LIMITED_ALLOWED_HREFS.some((allowed) => item.href === allowed || item.href.startsWith(allowed + "/"))
    );
  }, [role]);

  const sidebarContent = (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col scrollbar-primary-thin">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-moss-400 px-4 mb-4">
          Quản trị hệ thống
        </p>
        <nav className="space-y-1">
          {visibleNavItems.map((item) => {
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
                  
                  <AnimatePresence initial={false}>
                    {openGroupHref === item.href && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="ml-9 border-l border-moss-100 pl-2 overflow-hidden"
                      >
                        <div className="space-y-1 pt-1">
                          {item.subItems?.map((sub) => {
                            const isSubActive =
                              pathname === sub.href || pathname.startsWith(`${sub.href}/`);
                            const SubIcon = sub.icon;
                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                onClick={() => {
                                  if (pathname !== sub.href) {
                                    window.dispatchEvent(new Event("trigger-page-transition"));
                                  }
                                  // Close mobile drawer on navigation
                                  onClose?.();
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
                      </motion.div>
                    )}
                  </AnimatePresence>
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
                  onClose?.();
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

      {/* Storage Widget */}
      <div className="mt-auto space-y-3">
        <div className="bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20">
          <div className="flex justify-between items-center mb-2">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Dung lượng lưu trữ</p>
            <span className="text-[10px] font-bold text-primary">75%</span>
          </div>
          <div className="h-1.5 w-full bg-moss-200 rounded-full overflow-hidden mb-1.5">
            <div
              className="h-full bg-gradient-to-r from-primary to-mint-400 transition-all duration-1000"
              style={{ width: "75%" }}
            />
          </div>
          <p className="text-[9px] text-on-surface-variant/70 font-medium text-center">7.5 GB / 10 GB</p>
        </div>

        <button
          onClick={() => toast.message("Chức năng đang được phát triển")}
          className="w-full bg-gradient-to-r from-primary to-mint-500 text-white py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <Download className="size-3.5" />
          Xuất báo cáo
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: sticky sidebar */}
      <aside className="w-64 bg-white border-r border-moss-200 hidden lg:flex flex-col h-full sticky top-0 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile: slide-in drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.aside
            initial={{ x: -24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -24, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 38 }}
            className="fixed top-0 left-0 h-full w-72 max-w-[85vw] bg-white border-r border-moss-200 flex flex-col z-40 shadow-2xl lg:hidden will-change-transform"
          >
            {/* Mobile drawer header */}
            <div className="flex items-center justify-between px-4 h-16 border-b border-moss-100 shrink-0">
              <span className="text-lg font-black text-moss-900 tracking-tight">
                Lumi<span className="text-primary">Task</span>
              </span>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-moss-500 hover:bg-moss-100 transition-colors"
                aria-label="Đóng menu"
              >
                <X className="size-5" />
              </button>
            </div>
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
