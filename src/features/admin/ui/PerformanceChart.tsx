"use client";

import React from "react";
import { motion } from "framer-motion";

export function PerformanceChart() {
  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-card border border-white/40 h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-on-surface tracking-tight">Dòng tiền</h3>
          <p className="text-xs text-on-surface-variant">Thu nhập và Chi tiêu trong 30 ngày qua</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-xs font-medium text-on-surface-variant">Thu nhập</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-tertiary" />
            <span className="text-xs font-medium text-on-surface-variant">Chi tiêu</span>
          </div>
        </div>
      </div>

      <div className="relative h-64 w-full">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="incomeGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1DB954" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#1DB954" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="expenseGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#FF6B6B" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#FF6B6B" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Income area */}
          <motion.path
            d="M0,80 Q25,20 50,40 T100,10 L100,100 L0,100 Z"
            fill="url(#incomeGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
          />
          <motion.path
            d="M0,80 Q25,20 50,40 T100,10"
            fill="none"
            stroke="#1DB954"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />

          {/* Expense area */}
          <motion.path
            d="M0,90 Q20,60 40,85 T100,70 L100,100 L0,100 Z"
            fill="url(#expenseGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          />
          <motion.path
            d="M0,90 Q20,60 40,85 T100,70"
            fill="none"
            stroke="#FF6B6B"
            strokeWidth="2"
            strokeDasharray="4 4"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut", delay: 0.2 }}
          />
        </svg>

        <div className="absolute bottom-[-28px] w-full flex justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter opacity-50 px-2">
          <span>Tuần 1</span>
          <span>Tuần 2</span>
          <span>Tuần 3</span>
          <span>Tuần 4</span>
        </div>
      </div>
    </div>
  );
}
