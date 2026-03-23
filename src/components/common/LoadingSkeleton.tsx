"use client";

import React from "react";
import { motion } from "framer-motion";
import { Loader2, Zap } from "lucide-react";

interface LoadingSkeletonProps {
  message?: string;
  icon?: React.ReactNode;
}

/**
 * Reusable Loading Skeleton component for center-page loading states.
 * Designed to fit perfectly within the Admin main content area.
 */
export function LoadingSkeleton({ 
  message = "Đang tải dữ liệu...", 
  icon = <Zap size={32} className="text-primary" />
}: LoadingSkeletonProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 animate-in fade-in duration-700">
      {/* Animated Icon Container */}
      <div className="relative">
        {/* Pulsing Outer Ring */}
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-primary/20 rounded-full blur-2xl" 
        />
        
        {/* Card and Spinner */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative bg-white/60 backdrop-blur-md p-8 rounded-[2rem] shadow-2xl shadow-moss-900/5 border border-white/50 flex flex-col items-center justify-center"
        >
          <div className="relative">
             {icon}
             <div className="absolute -inset-2">
                <Loader2 className="size-full animate-[spin_3s_linear_infinite] text-primary/30" />
             </div>
          </div>
        </motion.div>
      </div>

      {/* Narrative Text */}
      <div className="space-y-4 text-center">
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xs font-black text-moss-900 uppercase tracking-[0.3em] ml-1"
        >
          {message}
        </motion.p>
        
        {/* Shimmer Bar */}
        <div className="h-1 w-24 bg-moss-100 rounded-full mx-auto overflow-hidden">
          <motion.div 
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="h-full w-1/2 bg-gradient-to-r from-transparent via-primary to-transparent" 
          />
        </div>
      </div>
    </div>
  );
}
