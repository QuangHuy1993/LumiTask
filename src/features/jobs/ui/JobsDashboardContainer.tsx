"use client";

import React, { useState, useEffect } from "react";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { motion } from "framer-motion";
import {
  ReceiptText,
  FileText,
  LineChart,
  Wallet2,
  BadgeDollarSign,
  Users,
  AlertTriangle,
  Bell,
  ClipboardList,
  Leaf,
  Droplets,
  Sparkles,
} from "lucide-react";

export function JobsDashboardContainer() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Giả lập thời gian load data 1.5s
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center p-8">
        <LoadingSkeleton message="Đang tải báo cáo..." />
      </div>
    );
  }

  // Fade in animation when loaded
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="p-8 max-w-[1600px] mx-auto space-y-8"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-on-surface tracking-tight">Báo cáo sơ bộ</h2>
          <p className="text-on-surface-variant font-medium flex items-center gap-2">
            <span className="w-2 h-2 bg-primary rounded-full"></span>
            Tổng quan hiệu suất công việc và tài chính
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Period Dropdown */}
          <div className="flex items-center bg-surface-container-low rounded-xl p-1 shadow-sm">
            <button className="px-4 py-2 text-sm font-bold bg-surface-container-lowest text-primary rounded-lg shadow-sm">
              30 ngày
            </button>
            <button className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface">
              Tháng này
            </button>
            <button className="px-4 py-2 text-sm font-medium text-on-surface-variant hover:text-on-surface">
              Tuỳ chọn
            </button>
          </div>
          <div className="h-10 w-[1px] bg-outline-variant/20 mx-1"></div>
          {/* Action Buttons */}
          <button className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-high text-on-surface-variant font-bold text-sm rounded-xl hover:bg-surface-variant transition-all">
            <ReceiptText className="size-5" />
            Xem giao dịch
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary font-bold text-sm rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/20">
            <LineChart className="size-5" />
            Xem báo cáo chi tiết
          </button>
        </div>
      </div>

      {/* KPI Grid Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Gross Revenue */}
        <div className="group relative overflow-hidden bg-primary-container/10 p-6 rounded-2xl border border-primary-container/20 transition-all hover:scale-[1.02]">
          <div className="absolute -right-4 -top-4 text-primary-container/20 opacity-20 transform rotate-12 group-hover:rotate-0 transition-transform">
            <ReceiptText className="w-32 h-32" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-on-primary-container/60 mb-2">
            Doanh thu đợt
          </p>
          <h3 className="text-3xl font-black text-on-primary-container">
            1.284.000.000 <span className="text-sm font-medium">VND</span>
          </h3>
          <div className="mt-4 flex items-center gap-2 text-sm font-bold text-primary">
            <LineChart className="size-4" />
            <span>+12.5%</span>
            <span className="text-on-surface-variant/40 font-normal">so với tháng trước</span>
          </div>
        </div>

        {/* Card 2: Net Revenue */}
        <div className="group relative overflow-hidden bg-primary p-6 rounded-2xl shadow-xl shadow-primary/10 transition-all hover:scale-[1.02]">
          <div className="absolute -right-4 -top-4 text-on-primary/10 opacity-20 transform rotate-12 group-hover:rotate-0 transition-transform">
            <Wallet2 className="w-32 h-32" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-on-primary/70 mb-2">Thực lãnh</p>
          <h3 className="text-3xl font-black text-on-primary">
            942.500.000 <span className="text-sm font-medium opacity-80">VND</span>
          </h3>
          <div className="mt-4 flex items-center gap-2 text-sm font-bold text-primary-fixed">
            <BadgeDollarSign className="size-4" />
            <span>84% Mục tiêu</span>
          </div>
        </div>

        {/* Card 3: Commission Paid */}
        <div className="group relative overflow-hidden bg-secondary-container/30 p-6 rounded-2xl border border-secondary-container/50 transition-all hover:scale-[1.02]">
          <div className="absolute -right-4 -top-4 text-secondary/10 opacity-20 transform rotate-12 group-hover:rotate-0 transition-transform">
            <Users className="w-32 h-32" />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-on-secondary-container/70 mb-2">
            Hoa hồng chi ra
          </p>
          <h3 className="text-3xl font-black text-on-secondary-container">
            142.300.000 <span className="text-sm font-medium opacity-80">VND</span>
          </h3>
          <div className="mt-4 flex items-center gap-2 text-sm font-bold text-secondary">
            <Users className="size-4" />
            <span>42 Cộng tác viên</span>
          </div>
        </div>

        {/* Card 4: Unpaid Remaining */}
        <div className="group relative overflow-hidden bg-tertiary-container/10 p-6 rounded-2xl border border-tertiary-container/30 transition-all hover:scale-[1.02]">
          <p className="text-xs font-bold uppercase tracking-widest text-on-tertiary-container/70 mb-2">
            Còn thiếu
          </p>
          <h3 className="text-3xl font-black text-on-tertiary-container">
            199.200.000 <span className="text-sm font-medium opacity-80">VND</span>
          </h3>
          <div className="mt-4 flex items-center gap-2 text-sm font-bold text-tertiary">
            <AlertTriangle className="size-4" />
            <span>15 Hoá đơn chờ thanh toán</span>
          </div>
        </div>

        {/* Card 5: Overdue Jobs */}
        <div className="group relative overflow-hidden bg-tertiary p-6 rounded-2xl shadow-xl shadow-tertiary/10 transition-all hover:scale-[1.02]">
          <p className="text-xs font-bold uppercase tracking-widest text-on-tertiary/70 mb-2">Quá hạn</p>
          <h3 className="text-3xl font-black text-on-tertiary">
            08 <span className="text-sm font-medium opacity-80">Công việc</span>
          </h3>
          <div className="mt-4 flex items-center gap-2 text-sm font-bold text-tertiary-fixed">
            <Bell className="size-4" />
            <span>Cần xử lý ngay lập tức</span>
          </div>
        </div>

        {/* Card 6: Top Referrer */}
        <div className="group relative overflow-hidden bg-surface-container-low p-6 rounded-2xl border border-outline-variant/20 transition-all hover:scale-[1.02]">
          <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/70 mb-2">
            Nhận hoa hồng nhiều nhất
          </p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center text-primary">
              <Users className="size-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-on-surface">Nguyễn Nam Anh</h3>
              <p className="text-lg font-black text-primary">
                45.200.000 <span className="text-xs font-medium">VND</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Charts Grid: Row 1 */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Area Chart: Gross vs Net */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-8 rounded-2xl shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-black tracking-tight">Biến động Doanh thu & Thực lãnh</h4>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary-container"></span>
                <span className="text-xs font-bold text-on-surface-variant">Doanh thu</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary"></span>
                <span className="text-xs font-bold text-on-surface-variant">Thực lãnh</span>
              </div>
            </div>
          </div>
          {/* Mock Chart Visualization */}
          <div className="h-64 flex items-end gap-1 w-full pt-4 relative">
            <div className="absolute inset-0 flex flex-col justify-between py-4 pointer-events-none">
              <div className="border-t border-outline-variant/10 w-full h-0"></div>
              <div className="border-t border-outline-variant/10 w-full h-0"></div>
              <div className="border-t border-outline-variant/10 w-full h-0"></div>
              <div className="border-t border-outline-variant/10 w-full h-0"></div>
            </div>
            {/* Generating 12 bars to simulate a trend */}
            <div className="flex-1 h-[40%] bg-primary-container/20 rounded-t relative group">
              <div className="absolute bottom-0 w-full h-[70%] bg-primary rounded-t group-hover:brightness-110"></div>
            </div>
            <div className="flex-1 h-[55%] bg-primary-container/20 rounded-t relative group">
              <div className="absolute bottom-0 w-full h-[65%] bg-primary rounded-t group-hover:brightness-110"></div>
            </div>
            <div className="flex-1 h-[62%] bg-primary-container/20 rounded-t relative group">
              <div className="absolute bottom-0 w-full h-[80%] bg-primary rounded-t group-hover:brightness-110"></div>
            </div>
            <div className="flex-1 h-[78%] bg-primary-container/20 rounded-t relative group">
              <div className="absolute bottom-0 w-full h-[75%] bg-primary rounded-t group-hover:brightness-110"></div>
            </div>
            <div className="flex-1 h-[90%] bg-primary-container/20 rounded-t relative group">
              <div className="absolute bottom-0 w-full h-[85%] bg-primary rounded-t group-hover:brightness-110"></div>
            </div>
            <div className="flex-1 h-[85%] bg-primary-container/20 rounded-t relative group">
              <div className="absolute bottom-0 w-full h-[90%] bg-primary rounded-t group-hover:brightness-110"></div>
            </div>
            <div className="flex-1 h-[95%] bg-primary-container/20 rounded-t relative group">
              <div className="absolute bottom-0 w-full h-[80%] bg-primary rounded-t group-hover:brightness-110"></div>
            </div>
          </div>
          <div className="flex justify-between text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest px-2">
            <span>Tuần 01</span>
            <span>Tuần 02</span>
            <span>Tuần 03</span>
            <span>Tuần 04</span>
          </div>
        </div>

        {/* Radial Chart: Payment Status */}
        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm space-y-6 flex flex-col items-center">
          <h4 className="text-lg font-black tracking-tight self-start">Trạng thái thanh toán</h4>
          <div className="relative w-48 h-48 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
              <circle
                className="text-surface-container-low"
                cx="96"
                cy="96"
                fill="transparent"
                r="70"
                stroke="currentColor"
                strokeWidth="24"
              ></circle>
              <circle
                className="text-primary"
                cx="96"
                cy="96"
                fill="transparent"
                r="70"
                stroke="currentColor"
                strokeDasharray="440"
                strokeDashoffset="110"
                strokeWidth="24"
              ></circle>
              <circle
                className="text-tertiary"
                cx="96"
                cy="96"
                fill="transparent"
                r="70"
                stroke="currentColor"
                strokeDasharray="440"
                strokeDashoffset="380"
                strokeWidth="24"
              ></circle>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black">75%</span>
              <span className="text-[10px] uppercase font-bold text-on-surface-variant/60">
                Hoàn tất
              </span>
            </div>
          </div>
          <div className="w-full space-y-3">
            <div className="flex items-center justify-between text-sm font-bold">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span> Đã thanh toán
              </div>
              <span>75%</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span> Còn nợ
              </div>
              <span>15%</span>
            </div>
            <div className="flex items-center justify-between text-sm font-bold">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-secondary"></span> Chờ xử lý
              </div>
              <span>10%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Charts Grid: Row 2 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Composed Chart: Revenue vs Completed Jobs */}
        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm space-y-6">
          <h4 className="text-lg font-black tracking-tight">Doanh thu & Số việc hoàn thành</h4>
          <div className="h-64 flex items-end gap-3 w-full border-b border-outline-variant/20 pt-10">
            <div className="flex-1 flex flex-col gap-1 items-center justify-end h-full">
              <div className="w-full bg-primary-container rounded-t h-[40%]"></div>
              <span className="text-[10px] font-bold text-on-surface-variant">T2</span>
            </div>
            <div className="flex-1 flex flex-col gap-1 items-center justify-end h-full">
              <div className="w-full bg-primary-container rounded-t h-[70%]"></div>
              <span className="text-[10px] font-bold text-on-surface-variant">T3</span>
            </div>
            <div className="flex-1 flex flex-col gap-1 items-center justify-end h-full">
              <div className="w-full bg-primary-container rounded-t h-[55%]"></div>
              <span className="text-[10px] font-bold text-on-surface-variant">T4</span>
            </div>
            <div className="flex-1 flex flex-col gap-1 items-center justify-end h-full">
              <div className="w-full bg-primary-container rounded-t h-[90%]"></div>
              <span className="text-[10px] font-bold text-on-surface-variant">T5</span>
            </div>
            <div className="flex-1 flex flex-col gap-1 items-center justify-end h-full">
              <div className="w-full bg-primary-container rounded-t h-[80%]"></div>
              <span className="text-[10px] font-bold text-on-surface-variant">T6</span>
            </div>
          </div>
        </div>

        {/* Bar Chart: Grouped by Batch */}
        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm space-y-6">
          <h4 className="text-lg font-black tracking-tight">So sánh theo Đợt (Batches)</h4>
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span>Batch: Xuân 2024</span>
                <span className="text-primary">850tr</span>
              </div>
              <div className="w-full h-3 bg-surface-container-low rounded-full overflow-hidden flex">
                <div className="h-full bg-primary w-[70%]"></div>
                <div className="h-full bg-primary-container w-[15%]"></div>
                <div className="h-full bg-secondary w-[5%]"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span>Batch: Hè 2024</span>
                <span className="text-primary">420tr</span>
              </div>
              <div className="w-full h-3 bg-surface-container-low rounded-full overflow-hidden flex">
                <div className="h-full bg-primary w-[50%]"></div>
                <div className="h-full bg-primary-container w-[10%]"></div>
                <div className="h-full bg-secondary w-[10%]"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-bold">
                <span>Batch: Thu 2024</span>
                <span className="text-primary">150tr</span>
              </div>
              <div className="w-full h-3 bg-surface-container-low rounded-full overflow-hidden flex">
                <div className="h-full bg-primary w-[20%]"></div>
                <div className="h-full bg-primary-container w-[5%]"></div>
                <div className="h-full bg-secondary w-[2%]"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Charts Grid: Row 3 */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Horizontal Bar Chart: Top 5 clients */}
        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm space-y-6">
          <h4 className="text-lg font-black tracking-tight">Top 5 Khách hàng (Thực lãnh)</h4>
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <span className="w-32 text-xs font-bold truncate">Vinhomes Central</span>
              <div className="flex-1 h-6 bg-primary-container/20 rounded-lg overflow-hidden">
                <div className="h-full bg-primary w-[95%] flex items-center px-2">
                  <span className="text-[10px] font-bold text-on-primary">240M</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-32 text-xs font-bold truncate">NovaWorld Phan Thiet</span>
              <div className="flex-1 h-6 bg-primary-container/20 rounded-lg overflow-hidden">
                <div className="h-full bg-primary w-[80%] flex items-center px-2">
                  <span className="text-[10px] font-bold text-on-primary">195M</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-32 text-xs font-bold truncate">Masterise Homes</span>
              <div className="flex-1 h-6 bg-primary-container/20 rounded-lg overflow-hidden">
                <div className="h-full bg-primary w-[65%] flex items-center px-2">
                  <span className="text-[10px] font-bold text-on-primary">142M</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-32 text-xs font-bold truncate">EcoPark</span>
              <div className="flex-1 h-6 bg-primary-container/20 rounded-lg overflow-hidden">
                <div className="h-full bg-primary w-[45%] flex items-center px-2">
                  <span className="text-[10px] font-bold text-on-primary">98M</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="w-32 text-xs font-bold truncate">Sun Group</span>
              <div className="flex-1 h-6 bg-primary-container/20 rounded-lg overflow-hidden">
                <div className="h-full bg-primary w-[30%] flex items-center px-2">
                  <span className="text-[10px] font-bold text-on-primary">65M</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stacked Bar: Job Status */}
        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm space-y-6">
          <h4 className="text-lg font-black tracking-tight text-center">Tỷ lệ Trạng thái Công việc</h4>
          <div className="flex justify-center pt-8">
            <div className="w-full max-w-sm space-y-12">
              <div className="h-10 w-full flex rounded-2xl overflow-hidden shadow-lg shadow-on-surface/5">
                <div className="h-full bg-outline-variant w-[15%] group relative" title="NOT_STARTED"></div>
                <div className="h-full bg-secondary-container w-[25%] group relative" title="IN_PROGRESS"></div>
                <div className="h-full bg-primary w-[50%] group relative" title="COMPLETED"></div>
                <div className="h-full bg-tertiary-container w-[10%] group relative" title="CANCELLED"></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-outline-variant"></span>
                  <span className="text-xs font-bold">Chưa bắt đầu (15)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-secondary-container"></span>
                  <span className="text-xs font-bold">Đang làm (25)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary"></span>
                  <span className="text-xs font-bold">Hoàn thành (50)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-tertiary-container"></span>
                  <span className="text-xs font-bold">Đã huỷ (10)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Table Section */}
      <section className="bg-surface-container-lowest rounded-2xl shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-outline-variant/10 flex items-center justify-between">
          <h4 className="text-lg font-black tracking-tight">Việc sắp đến hạn</h4>
          <button className="text-sm font-bold text-primary hover:underline">Xem tất cả</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                  Công việc
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                  Khách hàng
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                  Hạn chót
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
                  Còn thiếu
                </th>
                <th className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 text-right">
                  Thanh toán
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {/* Row 1 */}
              <tr className="hover:bg-surface-container-low/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-tertiary-container/20 flex items-center justify-center text-tertiary">
                      <FileText className="size-5" />
                    </div>
                    <span className="font-bold text-sm">Thiết kế cảnh quan sảnh A</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-sm font-medium">Vincom Mega Mall</td>
                <td className="px-8 py-5">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-error">24 Th10, 2024</span>
                    <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase">Còn 2 ngày</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-sm font-black">
                  45.000.000 <span className="text-[10px] opacity-50">VND</span>
                </td>
                <td className="px-8 py-5 text-right">
                  <span className="px-3 py-1 bg-secondary-container/20 text-on-secondary-container text-[10px] font-black rounded-full uppercase">
                    Một phần
                  </span>
                </td>
              </tr>
              {/* Row 2 */}
              <tr className="hover:bg-surface-container-low/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
                      <Leaf className="size-5" />
                    </div>
                    <span className="font-bold text-sm">Cung cấp cây nội thất</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-sm font-medium">Vietcombank Tower</td>
                <td className="px-8 py-5 text-sm font-bold">28 Th10, 2024</td>
                <td className="px-8 py-5 text-sm font-black text-on-surface-variant/40">
                  0 <span className="text-[10px]">VND</span>
                </td>
                <td className="px-8 py-5 text-right">
                  <span className="px-3 py-1 bg-primary-container/20 text-on-primary-container text-[10px] font-black rounded-full uppercase">
                    Hoàn tất
                  </span>
                </td>
              </tr>
              {/* Row 3 */}
              <tr className="hover:bg-surface-container-low/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-tertiary-container/20 flex items-center justify-center text-tertiary">
                      <ClipboardList className="size-5" />
                    </div>
                    <span className="font-bold text-sm">Bảo trì sân vườn khu C</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-sm font-medium">Ciputra Hà Nội</td>
                <td className="px-8 py-5 text-sm font-bold">30 Th10, 2024</td>
                <td className="px-8 py-5 text-sm font-black">
                  12.200.000 <span className="text-[10px] opacity-50">VND</span>
                </td>
                <td className="px-8 py-5 text-right">
                  <span className="px-3 py-1 bg-tertiary-container/20 text-on-tertiary-container text-[10px] font-black rounded-full uppercase">
                    Chưa trả
                  </span>
                </td>
              </tr>
              {/* Row 4 */}
              <tr className="hover:bg-surface-container-low/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
                      <Droplets className="size-5" />
                    </div>
                    <span className="font-bold text-sm">Lắp đặt hệ thống tưới tự động</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-sm font-medium">Lotte Mall West Lake</td>
                <td className="px-8 py-5 text-sm font-bold text-error">Hôm nay</td>
                <td className="px-8 py-5 text-sm font-black">
                  8.500.000 <span className="text-[10px] opacity-50">VND</span>
                </td>
                <td className="px-8 py-5 text-right">
                  <span className="px-3 py-1 bg-secondary-container/20 text-on-secondary-container text-[10px] font-black rounded-full uppercase">
                    Tạm ứng
                  </span>
                </td>
              </tr>
              {/* Row 5 */}
              <tr className="hover:bg-surface-container-low/30 transition-colors group">
                <td className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-container/10 flex items-center justify-center text-primary">
                      <Sparkles className="size-5" />
                    </div>
                    <span className="font-bold text-sm">Cắt tỉa tạo dáng nghệ thuật</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-sm font-medium">Biệt thự Vinhome Riverside</td>
                <td className="px-8 py-5 text-sm font-bold">01 Th11, 2024</td>
                <td className="px-8 py-5 text-sm font-black">
                  2.400.000 <span className="text-[10px] opacity-50">VND</span>
                </td>
                <td className="px-8 py-5 text-right">
                  <span className="px-3 py-1 bg-primary-container/20 text-on-primary-container text-[10px] font-black rounded-full uppercase">
                    Hoàn tất
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="p-6 bg-surface-container-low/20 flex items-center justify-center">
          <button className="px-6 py-2 bg-surface-container-highest text-on-surface-variant text-xs font-black uppercase tracking-widest rounded-full hover:bg-surface-variant transition-colors">
            Tải thêm danh sách
          </button>
        </div>
      </section>
    </motion.div>
  );
}
