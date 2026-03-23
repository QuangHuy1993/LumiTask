"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

const quotes = [
  "Những điều lớn lao được thực hiện bởi một loạt những điều nhỏ nhặt kết hợp lại.",
  "Công việc tuyệt vời nhất được thực hiện với niềm đam mê.",
  "Sáng tạo là sự kết hợp giữa suy nghĩ thấu đáo và hành động quyết liệt.",
  "Hiệu suất là kết quả của sự cam kết đổi mới và mục tiêu tập trung.",
  "Mọi thành tựu lớn đều bắt đầu bằng quyết định cố gắng.",
];

export const PageTransition = ({ stayVisible = false }: { stayVisible?: boolean }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pathnameRef = useRef(pathname);
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [isManualTrigger, setIsManualTrigger] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startUrlRef = useRef("");
  const shouldAutoHide = !stayVisible;

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  // Constants for storage
  const STORAGE_KEY = "lumi_page_transition_manual";
  const TIME_KEY = "lumi_page_transition_time";

  const startTransition = useCallback((manual = false) => {
    setProgress(0);
    setIsVisible(true);
    setIsManualTrigger(manual);
    setQuoteIdx(Math.floor(Math.random() * quotes.length));

    if (manual) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      sessionStorage.setItem(TIME_KEY, Date.now().toString());
      startUrlRef.current = `${pathnameRef.current}?${searchParams?.toString() || ""}`;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (!manual && shouldAutoHide) {
            setTimeout(() => setIsVisible(false), 200);
          }
          return 100;
        }
        
        // Neu manual, giu o 90% cho den khi load xong render
        if (manual && prev >= 90) return 90;

        const useSlowStep = manual || pathnameRef.current === "/login";
        const step = useSlowStep 
          ? (Math.random() * 3 + 2) // 2-5%
          : (Math.random() * 12 + 8); 
          
        const next = prev + step;
        return (manual && next > 90) ? 90 : (next > 100 ? 100 : next);
      });
    }, 50);

    intervalRef.current = interval;
    return interval;
  }, [searchParams]);

  // Detect pathname or searchParams changes to hide manual transitions
  useEffect(() => {
    if (isManualTrigger) {
      const currentUrl = `${pathname}?${searchParams?.toString() || ""}`;
      
      // Neu URL thuc su thay doi hoac da qua thoi gian timeout (fallback)
      if (currentUrl !== startUrlRef.current) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setProgress(100);
        
        const timer = setTimeout(() => {
          if (shouldAutoHide) setIsVisible(false);
          setIsManualTrigger(false);
          sessionStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(TIME_KEY);
        }, 300); // Cho 300ms de hieu ung smooth sau khi page load xong
        
        return () => clearTimeout(timer);
      } else {
        // Fallback: neu sau 10s URL khong doi (loi hoac mang qua cham), an loading
        const safetyTimer = setTimeout(() => {
          if (shouldAutoHide) setIsVisible(false);
          setIsManualTrigger(false);
          sessionStorage.removeItem(STORAGE_KEY);
          sessionStorage.removeItem(TIME_KEY);
        }, 10000);
        return () => clearTimeout(safetyTimer);
      }
    }
  }, [pathname, searchParams, isManualTrigger]);

  useEffect(() => {
    // Check if we are coming from a manual trigger in a previous mount
    const wasManual = sessionStorage.getItem(STORAGE_KEY) === "true";
    const startTime = parseInt(sessionStorage.getItem(TIME_KEY) || "0");
    const now = Date.now();
    
    // Nếu > 5s coi như stale
    const isStale = now - startTime > 5000;

    if (wasManual && !isStale) {
      // Truong hop PageTransition mount lai tren page moi, 
      // tuc la transition da xong nhung Component bi unmount-remount.
      setIsManualTrigger(true);
      setIsVisible(true);
      setProgress(100); 
      setQuoteIdx(Math.floor(Math.random() * quotes.length));
      
      const timer = setTimeout(() => {
        if (shouldAutoHide) setIsVisible(false);
        setIsManualTrigger(false);
        sessionStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(TIME_KEY);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      startTransition(false);
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(TIME_KEY);
    }

    const handleTrigger = () => {
      // Use setTimeout to escape React 18's concurrent transition batching
      // This ensures the loading overlay shows IMMEDIATELY without waiting for the slow DB queries
      setTimeout(() => startTransition(true), 0);
    };

    const handleGlobalClick = (e: MouseEvent) => {
      const target = (e.target as Element).closest('a');
      if (target && target.href) {
        try {
          const url = new URL(target.href);
          const isInternal = url.origin === window.location.origin;
          const isNewTab = target.target === "_blank";
          const isSamePage = url.pathname === window.location.pathname;
          
          // Ignore anchor links on the same page, or external, or target blank
          if (isInternal && !isNewTab && !isSamePage) {
            setTimeout(() => startTransition(true), 0);
          }
        } catch {
          // invalid url, ignore
        }
      }
    };

    window.addEventListener("trigger-page-transition", handleTrigger);
    document.documentElement.addEventListener("click", handleGlobalClick, { capture: true });
    
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("trigger-page-transition", handleTrigger);
      document.documentElement.removeEventListener("click", handleGlobalClick, { capture: true });
    };
  }, [startTransition]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
           initial={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           transition={{ duration: 0.5 }}
           className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background-light overflow-hidden font-sans"
        >
          {/* Subtle Lighting Blobs Background */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            <motion.div 
              animate={{
                x: [0, 30, -20, 0],
                y: [0, -50, 20, 0],
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-mint-500/10 blur-[120px]"
            />
            <motion.div 
              animate={{
                x: [0, -40, 30, 0],
                y: [0, 60, -30, 0],
              }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: -5 }}
              className="absolute top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-mint-300/10 blur-[120px]"
            />
            <motion.div 
              animate={{
                x: [0, 50, -40, 0],
                y: [0, -20, 40, 0],
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: -10 }}
              className="absolute -bottom-[10%] left-[20%] w-[45%] h-[45%] rounded-full bg-primary/10 blur-[120px]"
            />
          </div>

          {/* Main Content Container */}
          <div className="relative z-10 flex flex-col items-center justify-center px-6 w-full max-w-sm">
            {/* Logo & Brand Branding */}
            <div className="flex flex-col items-center gap-6 mb-12">
              <div className="relative">
                {/* Breathing Glow Effect */}
                <motion.div 
                  animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 bg-primary/30 rounded-full blur-2xl"
                />
                <div className="relative bg-white p-5 rounded-2xl shadow-xl border border-moss-100 flex items-center justify-center">
                   {/* Logo Placeholder or Text matching login */}
                   <div className="size-16 flex items-center justify-center bg-primary rounded-xl text-white shadow-lg">
                      <svg
                        className="w-10 h-10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z"></path>
                        <path d="M12 22V12"></path>
                        <path d="M21 7L12 12L3 7"></path>
                      </svg>
                    </div>
                </div>
              </div>
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="text-5xl md:text-6xl font-black tracking-tighter relative py-2"
              >
                <span className="relative z-10 bg-gradient-to-br from-mint-600 via-primary to-moss-800 bg-clip-text text-transparent drop-shadow-sm">
                  LumiTask
                </span>
                {/* Premium Accent Underline */}
                <motion.div
                  className="absolute bottom-3 left-0 right-0 h-[6px] bg-gradient-to-r from-mint-400/30 to-primary/30 rounded-full z-0"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "100%", opacity: 1 }}
                  transition={{ delay: 0.6, duration: 1, ease: "circOut" }}
                />
                {/* Subtle Glow Behind Text */}
                <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full z-0" />
                {/* Premium Shimmer Sweep */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/70 to-transparent w-full h-full z-20 pointer-events-none"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                  style={{ mixBlendMode: "overlay" }}
                />
              </motion.h1>
            </div>

            {/* Loading State Content */}
            <div className="w-full flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-end">
                  <p className="text-moss-800 font-medium text-sm">Chuẩn bị không gian làm việc...</p>
                  <p className="text-primary font-bold text-xs">{Math.round(progress)}%</p>
                </div>
                {/* Progress Bar */}
                <div className="h-2 w-full bg-moss-100 rounded-full overflow-hidden p-[1px]">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-primary rounded-full relative overflow-hidden"
                  >
                    <div className="absolute inset-0 opacity-30 bg-gradient-to-r from-transparent via-white to-transparent animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>
                  </motion.div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex items-center gap-2 text-primary">
                  <motion.div
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                  >
                    <Zap size={16} fill="currentColor" />
                  </motion.div>
                  <p className="text-xs uppercase tracking-[0.15em] font-bold">ĐANG ĐỒNG BỘ HÓA HIỆU SUẤT</p>
                </div>
                <p className="text-moss-400 text-sm italic min-h-[40px]">
                  &ldquo;{quotes[quoteIdx]}&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Footer Tagline */}
          <div className="fixed bottom-8 w-full text-center">
            <p className="text-moss-400 text-xs font-medium uppercase tracking-[0.2em]">
              Precision & Performance
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
