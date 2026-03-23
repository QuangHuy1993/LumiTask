"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageTransition } from "@/components/common/PageTransition";
import { ArrowLeft as ArrowLeftIcon, ExternalLink, Copy, Clipboard, ArrowDown, ArrowUp, Link2, Check as CheckIcon, ChevronDown, Braces } from "lucide-react";
import type { TransactionDetailDTO } from "@/features/transactions/model/transactionTypes";

const formatVND = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

// Simple Status mapping
const STATUS_LABELS = {
  COMPLETED: "Hoàn tất",
  PENDING: "Đang chờ",
  FAILED: "Thất bại",
  CANCELLED: "Đã hủy"
};

export function TransactionDetailClient({
  initialData,
}: {
  initialData?: TransactionDetailDTO | null;
}) {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const [isLoaded, setIsLoaded] = useState(false);
  const [showPayload, setShowPayload] = useState(false);

  useEffect(() => {
    // Keep the transition for smooth UX
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const t = initialData ?? null;

  if (isLoaded && !t) {
    return (
      <div className="max-w-[1200px] mx-auto p-4 md:p-8 text-center text-moss-500 mt-20">
        <h2 className="text-2xl font-bold mb-2">Không tìm thấy giao dịch</h2>
        <p>Giao dịch #{id} không tồn tại hoặc đã bị xóa.</p>
        <button onClick={() => router.push("/jobs/transactions")} className="mt-4 text-mint-600 underline">Quay lại danh sách</button>
      </div>
    );
  }

  const isIncoming = t?.direction === "INCOMING";
  const isSepay = !!t?.gatewayTransId;

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-8">
      {!isLoaded && <PageTransition />}

      {/* Header Section */}
      <header className="mb-10 lg:pt-0 pt-6">
        <button 
          onClick={() => {
            window.dispatchEvent(new Event("trigger-page-transition"));
            router.push("/jobs/transactions");
          }}
          className="inline-flex items-center text-mint-600 font-medium hover:underline mb-4 gap-1 transition-colors"
        >
          <ArrowLeftIcon size={16} />
          Quay lại giao dịch
        </button>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-moss-900 mb-3 font-display">
              Giao dịch #{t?.id || id}
            </h1>
            <div className="flex flex-wrap gap-2 text-[10px] font-bold tracking-wider uppercase">
              <span className={`px-3 py-1 rounded-full shadow-sm border ${isIncoming ? 'bg-mint-100 text-mint-800 border-mint-200' : 'bg-coral-100 text-coral-800 border-coral-200'}`}>
                {t?.direction}
              </span>
              <span className={`px-3 py-1 rounded-full shadow-sm border ${isSepay ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-moss-100 text-moss-700 border-moss-200'}`}>
                {isSepay ? 'Sepay' : 'Thủ công'}
              </span>
              <span className={`px-3 py-1 rounded-full shadow-sm text-white ${t?.status === 'COMPLETED' ? 'bg-mint-500' : t?.status === 'FAILED' ? 'bg-coral-500' : 'bg-sand-500'}`}>
                {t?.status ? STATUS_LABELS[t.status as keyof typeof STATUS_LABELS] || t.status : "MỚI"}
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button 
              disabled={!t?.job?.id}
              onClick={() => t?.job?.id && router.push(`/jobs/list/${t.job.id}`)}
              className="bg-gradient-to-br from-mint-500 to-mint-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 active:scale-95 transition-transform shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ExternalLink size={18} />
              Mở job
            </button>
            <button 
              disabled={!t?.gatewayTransId}
              onClick={() => navigator.clipboard.writeText(t?.gatewayTransId || "")}
              className="bg-white border border-moss-200 text-moss-700 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-moss-50 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              <Copy size={18} />
              Copy gatewayTransId
            </button>
            <button 
              onClick={() => navigator.clipboard.writeText(t?.content || "")}
              className="bg-white border border-moss-200 text-moss-700 px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-moss-50 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Clipboard size={18} />
              Copy nội dung
            </button>
          </div>
        </div>
      </header>

      {/* Body Layout */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-8 items-start transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        
        {/* Left Column: Context & Lookup */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Detail Card */}
          <section className="bg-surface rounded-2xl p-6 md:p-8 shadow-card border border-moss-200">
            <h2 className="text-xl font-bold text-moss-900 mb-6 border-b border-moss-100 pb-4">
              Thông tin chi tiết
            </h2>
            <div className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 py-3 border-b border-moss-100/50">
                <span className="text-[11px] font-bold text-moss-500 uppercase tracking-widest pt-1">Thời gian</span>
                <div className="md:col-span-2 text-moss-900 font-medium flex items-baseline gap-2">
                  {t?.transactionDate ? new Date(t.transactionDate).toLocaleString("vi-VN") : "—"}
                  <span className="text-moss-400 text-xs font-normal">(Asia/Ho_Chi_Minh)</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 py-3 border-b border-moss-100/50">
                <span className="text-[11px] font-bold text-moss-500 uppercase tracking-widest pt-1">Số tiền</span>
                <div className="md:col-span-2 text-2xl font-black text-mint-600">
                  {t?.amount ? formatVND(t.amount) : "0 VND"}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 py-3 border-b border-moss-100/50">
                <span className="text-[11px] font-bold text-moss-500 uppercase tracking-widest pt-1">Chiều giao dịch</span>
                <div className="md:col-span-2 flex items-center gap-2 font-bold text-moss-900">
                  {isIncoming ? <ArrowDown size={18} className="text-mint-600" /> : <ArrowUp size={18} className="text-coral-600" />}
                  <span className={isIncoming ? "text-mint-600" : "text-coral-600"}>
                    {isIncoming ? "Tiền vào" : "Tiền ra"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 py-3 border-b border-moss-100/50">
                <span className="text-[11px] font-bold text-moss-500 uppercase tracking-widest pt-1">Nguồn</span>
                <div className="md:col-span-2 text-moss-900 font-medium">
                  {isSepay ? "Casso API Integration (Sepay)" : "Nhập tay / Hệ thống"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 py-3 border-b border-moss-100/50">
                <span className="text-[11px] font-bold text-moss-500 uppercase tracking-widest pt-1">Nội dung chuyển</span>
                <div className="md:col-span-2">
                  <div className="bg-moss-50 p-3 rounded-lg border border-moss-200 font-mono text-sm text-moss-800 break-all shadow-inner inline-block">
                    {t?.content || "—"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 py-3 border-b border-moss-100/50">
                <span className="text-[11px] font-bold text-moss-500 uppercase tracking-widest pt-1">Tài khoản</span>
                <div className="md:col-span-2 text-moss-900 font-medium flex items-center gap-2">
                  {t?.bankAccount ? (
                    <>
                      <span className="w-8 h-6 rounded bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shadow-sm">
                        {t.bankAccount.bankId}
                      </span>
                      {t.bankAccount.bankId} - {t.bankAccount.accountNo}
                    </>
                  ) : "—"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 py-3">
                <span className="text-[11px] font-bold text-moss-500 uppercase tracking-widest pt-1">Mã tham chiếu</span>
                <div className="md:col-span-2 text-moss-900 font-semibold tracking-wide flex items-center gap-2">
                  {t?.gatewayTransId || "—"}
                </div>
              </div>

            </div>
          </section>

          {/* Linked Job Card */}
          <section className="bg-mint-50/50 rounded-2xl p-6 md:p-8 border border-mint-200 shadow-sm">
            <h2 className="text-lg font-bold text-mint-800 mb-6 flex items-center gap-2">
               <Link2 size={20} />
               Job liên kết
            </h2>
            {t?.job ? (
              <div 
                onClick={() => {
                  if (!t?.job) return;
                  router.push(`/jobs/list/${t.job.id}`);
                }}
                className="bg-white p-5 rounded-xl flex items-center justify-between border border-moss-200 shadow-sm hover:border-mint-300 transition-colors group cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="text-mint-600 font-bold group-hover:underline text-lg">
                    #J-{t.job.id} - {t.job.name}
                  </span>
                  <span className="text-sm text-moss-500 mt-1">
                    Client: <span className="font-medium text-moss-700">{t.job.client?.name || "No Client"}</span>
                  </span>
                </div>
                <ExternalLink className="text-moss-400 group-hover:text-mint-500 transition-colors" />
              </div>
            ) : (
              <div className="bg-white p-5 rounded-xl border border-moss-200 shadow-sm flex items-center justify-center">
                <span className="text-moss-500 italic">Giao dịch này chưa được liên kết với Job nào.</span>
              </div>
            )}
          </section>

        </div>

        {/* Right Column: Raw & Audit */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Timeline Card */}
          <section className="bg-surface rounded-2xl p-6 md:p-8 shadow-card border border-moss-200">
            <h2 className="text-xl font-bold text-moss-900 mb-8 border-b border-moss-100 pb-4">
              Lịch sử sự kiện
            </h2>
            
            <div className="relative pl-8 space-y-10 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-moss-200">
              
              {t?.status === "COMPLETED" && (
                <div className="relative">
                  <div className="absolute -left-[37px] top-0 w-6 h-6 rounded-full bg-mint-500 flex items-center justify-center ring-4 ring-mint-100 shadow-sm">
                    <CheckIcon size={14} className="text-white" strokeWidth={3} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-moss-900">Đã đối soát thành công</span>
                    <time className="text-xs text-moss-500 font-medium mt-1">Luôn hiển thị là mốc hiện tại</time>
                  </div>
                </div>
              )}

              {isSepay && (
                <div className="relative">
                  <div className="absolute -left-[37px] top-0 w-6 h-6 rounded-full bg-white border-2 border-moss-300 flex items-center justify-center shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-moss-400"></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-moss-700">Giao dịch phát sinh tại Ngân hàng qua Sepay</span>
                    <time className="text-xs text-moss-500 mt-1">{t?.transactionDate ? new Date(t.transactionDate).toLocaleString("vi-VN") : "—"}</time>
                  </div>
                </div>
              )}

              {!isSepay && t?.user && (
                <div className="relative">
                  <div className="absolute -left-[37px] top-0 w-6 h-6 rounded-full bg-white border-2 border-moss-300 flex items-center justify-center shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-moss-400"></span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-moss-700">
                      Tạo thủ công bởi {t.user.fullName ?? "—"}
                    </span>
                    <time className="text-xs text-moss-500 mt-1">{t?.transactionDate ? new Date(t.transactionDate).toLocaleString("vi-VN") : "—"}</time>
                  </div>
                </div>
              )}

            </div>
          </section>

          {/* Payload Card */}
          <section className="bg-moss-50 rounded-2xl overflow-hidden border border-moss-200 shadow-sm">
            <button 
              onClick={() => setShowPayload(!showPayload)}
              className="w-full p-5 bg-white flex items-center justify-between cursor-pointer hover:bg-moss-50/50 transition-colors"
            >
              <h2 className="font-bold text-moss-800 text-sm flex items-center gap-2">
                <Braces size={18} className="text-moss-500" />
                Raw Payload (SePay)
              </h2>
              <ChevronDown 
                size={20} 
                className={`text-moss-400 transition-transform duration-300 ${showPayload ? 'rotate-180' : ''}`} 
              />
            </button>
            
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showPayload ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
              <pre className="font-mono text-[11px] sm:text-xs bg-slate-900 text-mint-400 p-6 overflow-x-auto leading-relaxed border-t border-moss-200 shadow-inner">
                {t?.rawPayload ? t.rawPayload : "{\n  // Không có dữ liệu payload gốc từ Sepay\n}"}
              </pre>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
