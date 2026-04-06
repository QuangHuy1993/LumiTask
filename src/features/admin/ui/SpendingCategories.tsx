"use client";

import React from "react";

const categories = [
  { name: "Nhà ở", color: "#1DB954", dashArray: "45 100", offset: "0" },
  { name: "Ăn uống", color: "#F0C05A", dashArray: "25 100", offset: "-45" },
  { name: "Di chuyển", color: "#FF6B6B", dashArray: "15 100", offset: "-70" },
  { name: "Tiện ích", color: "#47C77F", dashArray: "15 100", offset: "-85" },
];

export function SpendingCategories() {
  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-card border border-white/40 flex flex-col h-full">
      <h4 className="text-lg font-bold text-on-surface tracking-tight mb-1">Danh mục chi tiêu</h4>
      <p className="text-xs text-on-surface-variant mb-8">Phân bổ chi tiêu của bạn</p>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="relative w-44 h-44 mb-8">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18" cy="18" r="16" fill="none"
              stroke="#e1e6e0" strokeWidth="4"
            />
            {categories.map((cat, i) => (
              <circle
                key={i}
                cx="18" cy="18" r="16" fill="none"
                stroke={cat.color}
                strokeWidth="4"
                strokeDasharray={cat.dashArray}
                strokeDashoffset={cat.offset}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Tổng</span>
            <span className="text-xl font-black text-on-surface">4.8tr</span>
          </div>
        </div>

        <div className="w-full grid grid-cols-2 gap-3">
          {categories.map((cat, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
              <span className="text-xs font-medium text-on-surface-variant">{cat.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
