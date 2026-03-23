"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronDown } from "lucide-react";

export interface FilterBank {
  id: number;
  bankId: string;
  accountNo: string;
}

interface Props {
  bankAccounts?: FilterBank[];
}

export function TransactionFilterBar({ bankAccounts = [] }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local state for immediate UI feedback before URL sync
  const [searchTerm, setSearchTerm] = useState(searchParams.get("searchContent") || "");
  const [direction, setDirection] = useState(searchParams.get("direction") || "ALL");
  const [status, setStatus] = useState(searchParams.get("status") || "ALL");
  const [source, setSource] = useState(searchParams.get("source") || "ALL");
  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
  const [bankAccountId, setBankAccountId] = useState(searchParams.get("bankAccountId") || "ALL");

  // Debounce search update
  useEffect(() => {
    const handler = setTimeout(() => {
      updateFilter("searchContent", searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "ALL" && value !== "") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Delete cursor when filter changes to go back to page 1
    params.delete("cursor");
    router.push(`/jobs/transactions?${params.toString()}`);
  };

  const handleManualFilter = () => {
    // Show smooth loading state when user explicitly clicks filter
    window.dispatchEvent(new Event("trigger-page-transition"));
    // Search is debounced, but clicking explicitly forces router.push
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm) params.set("searchContent", searchTerm);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    router.push(`/jobs/transactions?${params.toString()}`);
  }

  return (
    <div className="bg-surface rounded-xl shadow-card p-4 mb-6 border border-moss-200">
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
        
        {/* Native Date Pickers styling as a range */}
        <div className="relative group lg:col-span-2">
          <label className="text-[10px] font-bold text-moss-500 uppercase tracking-widest mb-1.5 block">Khoảng ngày</label>
          <div className="flex items-center justify-between bg-moss-50/50 border border-moss-200 rounded-lg focus-within:ring-2 focus-within:ring-mint-500/20 focus-within:border-mint-500 transition-all hover:border-mint-300 shadow-sm p-1">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                updateFilter("startDate", e.target.value);
              }}
              className="w-full bg-transparent border-none text-xs text-moss-900 focus:ring-0 p-1.5 outline-none font-medium" 
            />
            <span className="text-moss-400 font-bold mx-1">-</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                updateFilter("endDate", e.target.value);
              }}
              className="w-full bg-transparent border-none text-xs text-moss-900 focus:ring-0 p-1.5 outline-none font-medium" 
            />
          </div>
        </div>

        {/* Direction Filter */}
        <CustomSelect 
          label="Hướng"
          value={direction}
          onChange={(v) => { setDirection(v); updateFilter("direction", v); }}
          options={[
            { label: "Tất cả", value: "ALL" },
            { label: "Tiền vào", value: "INCOMING" },
            { label: "Tiền ra", value: "OUTGOING" }
          ]}
        />

        {/* Status Filter */}
        <CustomSelect 
          label="Trạng thái"
          value={status}
          onChange={(v) => { setStatus(v); updateFilter("status", v); }}
          options={[
            { label: "Tất cả", value: "ALL" },
            { label: "Hoàn tất", value: "COMPLETED" },
            { label: "Chờ xử lý", value: "PENDING" },
            { label: "Thất bại", value: "FAILED" },
            { label: "Đã huỷ", value: "CANCELLED" }
          ]}
        />

        {/* Source Filter */}
        <CustomSelect 
          label="Nguồn"
          value={source}
          onChange={(v) => { setSource(v); updateFilter("source", v); }}
          options={[
            { label: "Tất cả", value: "ALL" },
            { label: "Sepay (Tự động)", value: "SEPAY" },
            { label: "Thủ công", value: "MANUAL" }
          ]}
        />

        {/* Dynamic Accounts */}
         <CustomSelect 
          label="Tài khoản"
          value={bankAccountId}
          onChange={(v) => { setBankAccountId(v); updateFilter("bankAccountId", v); }}
          options={[
            { label: "Tất cả tài khoản", value: "ALL" },
            ...bankAccounts.map(b => ({ label: `${b.bankId} - ${b.accountNo}`, value: String(b.id) }))
          ]}
        />
      </div>

      <div className="flex gap-4 mt-4">
        <div className="relative group w-1/2 md:w-3/4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-moss-400 group-focus-within:text-mint-500 transition-colors" />
          </div>
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
               if (e.key === "Enter") handleManualFilter();
            }}
            placeholder="Tìm theo nội dung chuyển khoản..."
            className="w-full bg-moss-50/50 border border-moss-200 text-moss-900 text-sm rounded-lg focus:ring-2 focus:ring-mint-500/20 focus:border-mint-500 block pl-10 p-2.5 transition-all outline-none hover:border-mint-300" 
          />
        </div>
        
        <button 
          onClick={handleManualFilter}
          className="w-1/2 md:w-1/4 bg-mint-500 hover:bg-mint-600 text-white font-semibold rounded-lg text-sm px-5 py-2.5 text-center shadow-sm shadow-mint-500/30 transition-all hover:shadow-mint-500/50 hover:-translate-y-0.5"
        >
          Lọc dữ liệu
        </button>
      </div>
    </div>
  );
}


function CustomSelect({ label, value, options, onChange }: { label: string, value: string, options: {label: string, value: string}[], onChange: (val: string) => void }) {
  return (
    <div className="relative group">
      <label className="text-[10px] font-bold text-moss-500 uppercase tracking-widest mb-1.5 block">{label}</label>
      <div className="relative">
        <select 
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-full bg-moss-50/50 border border-moss-200 text-moss-900 font-medium text-sm rounded-lg focus:ring-2 focus:ring-mint-500/20 focus:border-mint-500 block p-2.5 pr-10 transition-all outline-none hover:border-mint-300 shadow-sm"
          style={{ backgroundImage: 'none' }}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-moss-500 transition-colors group-focus-within:text-mint-500">
           <ChevronDown size={16} />
        </div>
      </div>
    </div>
  );
}
