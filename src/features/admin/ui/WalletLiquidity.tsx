"use client";

import React from "react";
import { PlusCircle } from "lucide-react";

const wallets = [
  { name: "Tiền mặt", amount: "1.240.000₫", percent: 15, colorClass: "bg-[#F0C05A]" },
  { name: "Ngân hàng A (Thanh toán)", amount: "42.800.000₫", percent: 65, colorClass: "bg-gradient-to-r from-primary to-mint-400" },
  { name: "Ngân hàng B (Tiết kiệm)", amount: "98.540.000₫", percent: 85, colorClass: "bg-primary" },
];

export function WalletLiquidity() {
  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-card border border-white/40 flex flex-col">
      <h4 className="text-lg font-bold text-on-surface tracking-tight mb-8">Thanh khoản ví</h4>

      <div className="space-y-7 flex-1">
        {wallets.map((wallet, i) => (
          <div key={i}>
            <div className="flex justify-between text-xs font-bold text-on-surface mb-2">
              <span>{wallet.name}</span>
              <span>{wallet.amount}</span>
            </div>
            <div className="h-4 w-full bg-surface-container-low rounded-lg overflow-hidden">
              <div
                className={`h-full rounded-lg transition-all duration-1000 ${wallet.colorClass}`}
                style={{ width: `${wallet.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="pt-6 mt-6 border-t border-outline-variant/20">
        <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl cursor-pointer hover:bg-surface-container transition-colors">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-mint-400 flex items-center justify-center text-white shrink-0">
            <PlusCircle className="size-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-on-surface">Kết nối tài khoản mới</p>
            <p className="text-[10px] text-on-surface-variant">Đồng bộ ngân hàng của bạn</p>
          </div>
        </div>
      </div>
    </div>
  );
}
