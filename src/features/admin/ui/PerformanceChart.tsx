"use client";

import React from "react";
import { motion } from "framer-motion";

export function PerformanceChart() {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-card border border-moss-100 h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-moss-900 tracking-tight">Hiệu suất công việc</h3>
          <p className="text-sm text-moss-500">Theo dõi doanh thu trong 6 tháng qua</p>
        </div>
        <select className="bg-moss-50 border-none rounded-lg text-sm focus:ring-primary/20 cursor-pointer py-2 px-3 outline-none">
          <option>Năm 2024</option>
          <option>Năm 2023</option>
        </select>
      </div>
      
      <div className="relative h-64 w-full group">
        <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 800 200">
          <defs>
            <linearGradient id="chartGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1DB954" stopOpacity="0.2"></stop>
              <stop offset="100%" stopColor="#1DB954" stopOpacity="0"></stop>
            </linearGradient>
          </defs>
          <motion.path 
            d="M0,180 Q100,160 150,140 T300,100 T450,120 T600,60 T800,40 V200 H0 Z" 
            fill="url(#chartGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          />
          <motion.path 
            d="M0,180 Q100,160 150,140 T300,100 T450,120 T600,60 T800,40" 
            fill="none" 
            stroke="#1DB954" 
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </svg>
        
        <div className="flex justify-between mt-4 text-xs font-medium text-moss-400">
          <span>Th1</span>
          <span>Th2</span>
          <span>Th3</span>
          <span>Th4</span>
          <span>Th5</span>
          <span>Th6</span>
        </div>
      </div>
    </div>
  );
}
