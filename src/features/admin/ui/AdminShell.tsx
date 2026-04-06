"use client";

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UserRole } from "@/lib/auth/session";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";

interface AdminShellProps {
  children: React.ReactNode;
  user: {
    fullName: string | null;
    username: string;
    email: string | null;
    role: UserRole;
  };
}

export function AdminShell({ children, user }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on resize to lg+
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    <div className="h-screen bg-background-light text-moss-900 flex flex-col overflow-hidden">
      <AdminHeader user={user} onMenuClick={() => setSidebarOpen((v) => !v)} />
      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-label="Đóng menu"
            />
          )}
        </AnimatePresence>
        <AdminSidebar isMobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} role={user.role} />
        <main className="flex-1 overflow-y-auto p-0 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
