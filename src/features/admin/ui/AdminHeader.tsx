"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bell, Settings, LogOut, User, ChevronDown } from "lucide-react";
import { logoutAction } from "@/features/auth/actions/logoutAction";
import Link from "next/link";

interface AdminHeaderProps {
  user: {
    fullName: string | null;
    username: string;
    email: string | null;
  };
}

interface HeaderNotification {
  id?: string | number;
  amount: number;
  content: string;
}

export function AdminHeader({ user }: AdminHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setHasUnread(true);
      if (detail) {
        setNotifications((prev) => {
          // Keep only the 5 most recent notifications
          const newArr = [detail, ...prev];
          return newArr.slice(0, 5);
        });
      }
    };
    window.addEventListener("trigger-red-dot", handler);
    return () => window.removeEventListener("trigger-red-dot", handler);
  }, []);

  const initials = (user.fullName || user.username)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between bg-white/80 backdrop-blur-md border-b border-moss-200 px-6">
      <div className="flex items-center gap-3">
        {/* Synced Logo Icon from Login */}
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-2 bg-primary rounded-lg flex items-center justify-center text-white shadow-lg group-hover:shadow-primary/30 transition-all"
          >
            <div className="relative">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z"></path>
                <path d="M12 22V12"></path>
                <path d="M21 7L12 12L3 7"></path>
              </svg>
            </div>
          </motion.div>
          
          <div className="relative overflow-hidden">
            <h1 className="text-2xl font-bold tracking-tight text-moss-900 relative py-1">
              <span className="relative z-10 [text-shadow:0_0_10px_rgba(29,185,84,0.4)]">
                Lumi<span className="text-primary">Task</span>
              </span>
            </h1>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent w-full h-full z-20 pointer-events-none"
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
              style={{ mixBlendMode: "overlay" }}
            />
          </div>
        </Link>
      </div>

      <div className="flex items-center gap-4 flex-1 justify-end max-w-4xl px-8">
        <div className="relative w-full max-w-md hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-moss-400 size-5" />
          <input
            className="w-full bg-moss-100 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            placeholder="Tìm kiếm nhanh..."
            type="text"
          />
        </div>
        
        <div className="flex items-center gap-2 relative" ref={notifDropdownRef}>
          <button 
            onClick={() => {
              setShowNotifDropdown(!showNotifDropdown);
              setHasUnread(false);
            }}
            className={`p-2 rounded-lg relative transition-colors ${showNotifDropdown ? "bg-moss-100 text-moss-900" : "text-moss-600 hover:bg-moss-100"}`}
          >
            <Bell className="size-5" />
            {hasUnread && (
              <span className="absolute top-2 right-2.5 w-3 h-3 bg-coral-500 rounded-full border-2 border-white animate-pulse"></span>
            )}
          </button>

          <AnimatePresence>
            {showNotifDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-3 w-80 bg-white rounded-3xl shadow-2xl border border-moss-100 overflow-hidden z-50 origin-top-right"
              >
                <div className="px-4 py-3 border-b border-moss-50 bg-moss-50/50 flex justify-between items-center">
                  <p className="text-sm font-bold text-moss-900">Thông báo mới</p>
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {notifications.length}
                  </span>
                </div>
                
                <div className="max-h-[320px] overflow-y-auto p-2">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-moss-400">
                      <Bell className="size-8 mx-auto mb-2 opacity-20" />
                      <p className="text-sm font-medium">Chưa có thông báo nào</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      {notifications.map((notif, index) => (
                        <div key={notif.id || index} className="p-3 hover:bg-moss-50 rounded-2xl transition-colors cursor-default relative overflow-hidden group">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover:scale-y-100 transition-transform origin-center rounded-r-full" />
                          <p className="text-sm font-bold text-moss-900 mb-1 flex justify-between items-start">
                            <span className="text-green-600">
                              +{new Intl.NumberFormat("vi-VN").format(notif.amount || 0)}đ
                            </span>
                          </p>
                          <p className="text-xs text-moss-600 font-medium">{notif.content}</p>
                          <p className="text-[10px] text-moss-400 mt-1.5 uppercase tracking-wider font-semibold">Vừa xong</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <Link href="/settings" className="p-2 text-moss-600 hover:bg-moss-100 rounded-lg transition-colors">
          <Settings className="size-5" />
        </Link>
        
        <div className="h-8 w-px bg-moss-200 mx-1"></div>
        
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 p-1.5 pr-3 hover:bg-moss-100 rounded-2xl transition-all active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold shadow-sm shrink-0">
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-bold text-moss-900 line-clamp-1">{user.fullName || user.username}</p>
              <p className="text-[10px] text-moss-400 uppercase font-bold tracking-widest mt-0.5">Quản trị viên</p>
            </div>
            <ChevronDown className={`size-4 text-moss-400 transition-transform ${showDropdown ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-full mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-moss-100 p-2 overflow-hidden z-50 origin-top-right"
              >
                <div className="px-4 py-3 border-b border-moss-50 mb-1">
                  <p className="text-sm font-bold text-moss-900">{user.fullName}</p>
                  <p className="text-xs text-moss-500 truncate">{user.email}</p>
                </div>
                
                <Link 
                  href="/settings" 
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-moss-600 hover:bg-moss-50 hover:text-primary transition-all"
                >
                  <User className="size-4" />
                  Hồ sơ cá nhân
                </Link>
                
                <Link 
                  href="/settings" 
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-moss-600 hover:bg-moss-50 hover:text-primary transition-all"
                >
                  <Settings className="size-4" />
                  Cài đặt hệ thống
                </Link>

                <div className="h-px bg-moss-50 my-1 mx-2" />

                <button 
                  onClick={() => logoutAction()}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-coral-500 hover:bg-coral-50 transition-all text-left"
                >
                  <LogOut className="size-4" />
                  Đăng xuất
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
