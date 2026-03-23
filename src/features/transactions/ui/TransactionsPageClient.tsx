"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Wallet2, ArrowLeftRight, MoreVertical, CalendarDays, User, Briefcase } from "lucide-react";

import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { TRANSACTIONS_MOCK, type TransactionMock, type TransactionStatus, type TransactionDirection } from "./transactionsMock";

function getDirectionLabel(direction: TransactionDirection) {
  switch (direction) {
    case "INCOMING":
      return "VÀO";
    case "OUTGOING":
      return "RA";
    default:
      return direction;
  }
}

function getStatusLabel(status: TransactionStatus) {
  switch (status) {
    case "COMPLETED":
      return "Hoàn tất";
    case "PENDING":
      return "Chờ";
    case "FAILED":
      return "Thất bại";
    case "CANCELLED":
      return "Hủy";
    default:
      return status;
  }
}

function getDirectionBadgeClass(direction: TransactionDirection) {
  return direction === "INCOMING"
    ? "bg-primary-fixed/20 text-primary-container border border-primary-fixed/30"
    : "bg-tertiary-container/20 text-tertiary border border-tertiary-fixed/30";
}

function getSourceBadgeClass(source: TransactionMock["source"]) {
  return source === "SEPAY"
    ? "bg-primary/10 text-primary border border-primary/10"
    : "bg-surface-container-highest text-on-surface-variant border border-outline-variant/30";
}

function getStatusBadgeClass(status: TransactionStatus) {
  switch (status) {
    case "COMPLETED":
      return "bg-primary-fixed text-on-primary-container";
    case "PENDING":
      return "bg-secondary-container text-on-secondary-container";
    case "FAILED":
      return "bg-tertiary-fixed text-on-tertiary-container";
    case "CANCELLED":
      return "bg-surface-container-highest text-on-surface-variant border border-outline-variant/40";
    default:
      return "bg-surface-container-highest text-on-surface-variant";
  }
}

function formatAmountVndPlaceholder(amountText: string) {
  return `${amountText} VND`;
}

export function TransactionsPageClient() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  // UI placeholders (không fetch data thật)
  const [dateRange, setDateRange] = useState("01/10/2023 - 31/10/2023");
  const [direction, setDirection] = useState("Tất cả");
  const [status, setStatus] = useState("Tất cả");
  const [source, setSource] = useState("Sepay");
  const [bankAccount, setBankAccount] = useState("Vietcombank - 1022...");
  const [clientSearch, setClientSearch] = useState("");
  const [jobSearch, setJobSearch] = useState("");

  const items = useMemo(() => TRANSACTIONS_MOCK, []);

  useEffect(() => {
    // Mô phỏng thời gian load trang để hiển thị LoadingSkeleton giống luồng redirect.
    const t = window.setTimeout(() => setIsLoading(false), 600);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-6">
      {isLoading ? (
        <LoadingSkeleton message="Đang tải giao dịch..." icon={<ArrowLeftRight className="size-6" />} />
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-2">
            <div className="space-y-1">
              <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-on-surface">
                Quản lý giao dịch
              </h1>
              <p className="text-on-surface-variant font-medium opacity-80">
                Tra cứu &amp; đối soát lịch sử giao dịch theo thời gian
              </p>
            </div>
            <a
              href="/jobs/reports"
              className="bg-surface-container-lowest text-primary border border-outline-variant/20 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-surface-container-low transition-colors shadow-sm"
            >
              <Wallet2 className="size-5" />
              Báo cáo chi tiết
            </a>
          </div>

          {/* Summary cards (giữ lại một số thẻ để không biến thành dashboard) */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-[0_20px_40px_-12px_rgba(21,25,22,0.08)] flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Tổng giao dịch
                </span>
                <RefreshCw className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-black text-on-surface">1,284</p>
                <p className="text-xs text-primary font-bold">+12% so với tháng trước</p>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-[0_20px_40px_-12px_rgba(21,25,22,0.08)] flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Tổng tiền vào
                </span>
                <span className="text-primary font-bold">V</span>
              </div>
              <div>
                <p className="text-2xl font-black text-on-surface">
                  {formatAmountVndPlaceholder("842,500,000")}
                </p>
                <p className="text-xs text-primary font-bold">↑ 8.4%</p>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-[0_20px_40px_-12px_rgba(21,25,22,0.08)] flex flex-col justify-between h-32 border-l-4 border-tertiary">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Tổng tiền ra
                </span>
                <span className="text-tertiary font-bold">R</span>
              </div>
              <div>
                <p className="text-2xl font-black text-on-surface">
                  {formatAmountVndPlaceholder("312,120,000")}
                </p>
                <p className="text-xs text-on-surface-variant">Đã sử dụng ngân sách: 64%</p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-primary to-primary-container p-5 rounded-2xl shadow-[0_20px_40px_-12px_rgba(0,110,45,0.15)] flex flex-col justify-between h-32">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-primary/80">
                  Chênh lệch
                </span>
                <Wallet2 className="size-5 text-on-primary/80" />
              </div>
              <div>
                <p className="text-2xl font-black text-on-primary">530,380,000 VND</p>
                <p className="text-xs text-on-primary/70">Ước tính lãi ròng</p>
              </div>
            </div>
          </section>

          {/* Filter Bar */}
          <section className="bg-surface-container-low p-6 rounded-2xl space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant px-1">
                  Khoảng ngày
                </label>
                <div className="relative">
                  <input
                    className="w-full bg-surface-container-highest border-none border-b-2 border-primary/20 focus:border-primary focus:ring-0 text-sm rounded-t px-4 py-2 text-on-surface font-medium"
                    type="text"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                  />
                  <CalendarDays className="absolute right-3 top-2.5 text-on-surface-variant size-5" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant px-1">
                  Hướng
                </label>
                <select
                  className="w-full bg-surface-container-highest border-none border-b-2 border-primary/20 focus:border-primary focus:ring-0 text-sm rounded-t px-4 py-2 text-on-surface font-medium"
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                >
                  <option value="Tất cả">Tất cả</option>
                  <option value="Tiền vào">Tiền vào</option>
                  <option value="Tiền ra">Tiền ra</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant px-1">
                  Trạng thái
                </label>
                <select
                  className="w-full bg-surface-container-highest border-none border-b-2 border-primary/20 focus:border-primary focus:ring-0 text-sm rounded-t px-4 py-2 text-on-surface font-medium"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Tất cả">Tất cả</option>
                  <option value="Hoàn tất">Hoàn tất</option>
                  <option value="Chờ">Chờ</option>
                  <option value="Thất bại">Thất bại</option>
                  <option value="Hủy">Hủy</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant px-1">
                  Nguồn
                </label>
                <select
                  className="w-full bg-surface-container-highest border-none border-b-2 border-primary/20 focus:border-primary focus:ring-0 text-sm rounded-t px-4 py-2 text-on-surface font-medium"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  <option value="Sepay">Sepay</option>
                  <option value="Thủ công">Thủ công</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant px-1">
                  Tài khoản
                </label>
                <select
                  className="w-full bg-surface-container-highest border-none border-b-2 border-primary/20 focus:border-primary focus:ring-0 text-sm rounded-t px-4 py-2 text-on-surface font-medium"
                  value={bankAccount}
                  onChange={(e) => setBankAccount(e.target.value)}
                >
                  <option value="Vietcombank - 1022...">Vietcombank - 1022...</option>
                  <option value="Techcombank - 1903...">Techcombank - 1903...</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-outline-variant/10 pt-4">
              <div className="relative">
                <User className="absolute left-3 top-2.5 text-on-surface-variant/60 size-4" />
                <input
                  className="w-full pl-10 bg-surface-container-highest border-none border-b-2 border-primary/20 focus:border-primary focus:ring-0 text-sm rounded-t px-4 py-2.5 text-on-surface"
                  placeholder="Tìm theo khách hàng..."
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                />
              </div>

              <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 text-on-surface-variant/60 size-4" />
                <input
                  className="w-full pl-10 bg-surface-container-highest border-none border-b-2 border-primary/20 focus:border-primary focus:ring-0 text-sm rounded-t px-4 py-2.5 text-on-surface"
                  placeholder="Tìm theo công việc..."
                  type="text"
                  value={jobSearch}
                  onChange={(e) => setJobSearch(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <button
                  className="bg-primary text-on-primary font-bold py-2.5 rounded-xl hover:bg-primary-container transition-colors shadow-lg active:scale-[0.98] w-full"
                  type="button"
                  onClick={() => {
                    // Không fetch data thật, nhưng mô phỏng trạng thái load khi bấm lọc.
                    setIsLoading(true);
                    window.setTimeout(() => setIsLoading(false), 500);
                  }}
                >
                  Lọc dữ liệu
                </button>
              </div>
            </div>
          </section>

          {/* Table */}
          <section className="bg-surface-container-lowest rounded-2xl shadow-[0_20px_40px_-12px_rgba(21,25,22,0.08)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-high/30">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Thời gian
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Số tiền (VND)
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant text-center">
                      Hướng
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Nội dung
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Việc làm / Khách hàng
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Tài khoản
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Nguồn
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      Trạng thái
                    </th>
                    <th className="px-6 py-4" />
                  </tr>
                </thead>

                <tbody className="divide-y divide-outline-variant/10">
                  {items.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-surface-container-low/50 transition-colors group cursor-pointer"
                      onClick={() => router.push(`/jobs/transactions/${tx.id}`)}
                    >
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-on-surface">{tx.dateText}</p>
                        <p className="text-[10px] text-on-surface-variant font-medium">{tx.timeText}</p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-sm font-black text-on-surface">{tx.amountText}</p>
                      </td>

                      <td className="px-6 py-5 text-center">
                        <span
                          className={`text-[10px] font-bold px-3 py-1 rounded-full ${getDirectionBadgeClass(tx.direction)}`}
                        >
                          {getDirectionLabel(tx.direction)}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <code className="text-xs font-mono bg-surface-container-low px-2 py-1 rounded text-on-surface-variant">
                          {tx.contentText}
                        </code>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-xs font-bold text-primary hover:underline block">
                          {tx.jobName}
                        </p>
                        <p className="text-[10px] text-on-surface-variant">{tx.clientName}</p>
                      </td>

                      <td className="px-6 py-5">
                        <p className="text-xs font-medium text-on-surface">{tx.bankAccountText}</p>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`text-[10px] font-bold px-3 py-1 rounded-full border ${getSourceBadgeClass(tx.source)}`}
                        >
                          {tx.source === "SEPAY" ? "Sepay" : "Thủ công"}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${getStatusBadgeClass(tx.status)}`}>
                          {getStatusLabel(tx.status)}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-right">
                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-surface-container-highest rounded-full transition-all"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="Tùy chọn"
                        >
                          <MoreVertical className="size-4 text-on-surface-variant" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 flex items-center justify-between bg-surface-container-low/20">
              <p className="text-xs text-on-surface-variant">
                Hiển thị <span className="font-bold">1 - 4</span> trên <span className="font-bold">1,284</span> kết quả
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high disabled:opacity-30"
                  type="button"
                  disabled
                >
                  ←
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-on-primary text-xs font-bold">
                  1
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant text-xs font-bold hover:bg-surface-container-high transition-colors">
                  2
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg text-on-surface-variant text-xs font-bold hover:bg-surface-container-high transition-colors">
                  3
                </button>
                <span className="text-on-surface-variant">...</span>
                <button
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant/20 text-on-surface-variant hover:bg-surface-container-high transition-colors"
                  type="button"
                >
                  →
                </button>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

