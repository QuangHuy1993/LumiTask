"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Download, 
  Link as LinkIcon, 

  Edit, 
  
  QrCode,
  ShieldCheck,
  Zap,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getUserBankAccountsAction } from "../actions/paymentActions";
import { SUPPORTED_BANKS } from "@/features/settings/model/bankList";
import { toast } from "sonner";
import Link from "next/link";

interface BankAccount {
  id: number;
  bankId: string;
  accountNo: string;
  accountName: string;
  isDefault: boolean;
}

interface VietQRGeneratorProps {
  initialAccounts: BankAccount[];
}

export function VietQRGenerator({ initialAccounts = [] }: VietQRGeneratorProps) {
  const [accounts, setAccounts] = useState<BankAccount[]>(initialAccounts);
  // Default to false if we have initial data to avoid flash of loader
  const [isLoading, setIsLoading] = useState(initialAccounts.length === 0);
  
  // Initialize state from first available account if present
  const defaultAcc = useMemo(() => 
    initialAccounts.find(a => a.isDefault) || initialAccounts[0], 
    [initialAccounts]
  );

  const [selectedBankId, setSelectedBankId] = useState(defaultAcc?.bankId || "");
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(defaultAcc?.id || null);
  const [amount, setAmount] = useState("");
  const [content, setContent] = useState("");
  const [debouncedQrUrl, setDebouncedQrUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // 1. Fetch data on mount if not provided
  useEffect(() => {
    async function loadData() {
      // If we already have initial accounts, just set the defaults and return
      if (initialAccounts.length > 0) {
        const defaultAcc = initialAccounts.find(a => a.isDefault) || initialAccounts[0];
        if (defaultAcc) {
          setSelectedBankId(defaultAcc.bankId);
          setSelectedAccountId(defaultAcc.id);
        }
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const res = await getUserBankAccountsAction();
      if (res.success && res.data) {
        setAccounts(res.data);
        const defaultAcc = res.data.find(a => a.isDefault) || res.data[0];
        if (defaultAcc) {
          setSelectedBankId(defaultAcc.bankId);
          setSelectedAccountId(defaultAcc.id);
        }
      } else {
        toast.error("Không thể tải danh sách tài khoản ngân hàng");
      }
      setIsLoading(false);
    }
    loadData();
  }, [initialAccounts]);

  // 2. Computed values
  const uniqueBanks = useMemo(() => {
    const ids = Array.from(new Set(accounts.map(a => a.bankId)));
    return SUPPORTED_BANKS.filter(b => ids.includes(b.id));
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter(a => a.bankId === selectedBankId);
  }, [accounts, selectedBankId]);

  const selectedAccount = useMemo(() => {
    return accounts.find(a => a.id === selectedAccountId);
  }, [accounts, selectedAccountId]);

  const bankMeta = useMemo(() => {
    return SUPPORTED_BANKS.find(b => b.id === selectedBankId);
  }, [selectedBankId]);

  // 3. Handlers
  const handleGenerateQr = () => {
    if (!selectedAccount || !bankMeta) {
      toast.error("Vui lòng chọn đầy đủ thông tin ngân hàng");
      return;
    }
    
    setIsGenerating(true);
    // Short delay to feel like "generating"
    setTimeout(() => {
      const url = `https://img.vietqr.io/image/${selectedBankId}-${selectedAccount.accountNo}-compact.png?amount=${amount}&addInfo=${encodeURIComponent(content)}&accountName=${encodeURIComponent(selectedAccount.accountName)}`;
      setDebouncedQrUrl(url);
      setHasGenerated(true);
      setIsGenerating(false);
      toast.success("Đã cập nhật mã QR mới");
    }, 300);
  };

  const handleCopyImage = async () => {
    if (!debouncedQrUrl) {
      toast.error("Vui lòng tạo mã QR trước");
      return;
    }
    try {
      const response = await fetch(debouncedQrUrl);
      const blob = await response.blob();
      
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      
      toast.success("Đã sao chép ảnh mã QR vào bộ nhớ tạm");
    } catch (err) {
      console.error("Copy image failed:", err);
      toast.error("Không thể sao chép ảnh. Vui lòng thử lại.");
    }
  };

  const handleDownload = async () => {
    if (!debouncedQrUrl) {
      toast.error("Vui lòng tạo mã QR trước");
      return;
    }
    try {
      const response = await fetch(debouncedQrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vietqr-${selectedAccount?.accountNo || "payment"}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Bắt đầu tải mã QR...");
    } catch (err) {
      toast.error("Không thể tải ảnh. Vui lòng thử lại.");
    }
  };

  const formatCurrency = (val: string) => {
    if (!val || isNaN(parseInt(val))) return "0";
    return parseInt(val).toLocaleString("vi-VN");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="size-12 animate-spin text-primary opacity-20" />
        <p className="text-sm font-bold text-moss-400 uppercase tracking-widest animate-pulse">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-6">
        <div className="size-20 bg-moss-100 rounded-full flex items-center justify-center mx-auto text-moss-400">
           <QrCode size={40} />
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-black text-moss-900">Chưa có tài khoản ngân hàng</h3>
          <p className="text-moss-500">Bạn cần thiết lập ít nhất một tài khoản ngân hàng trong cài đặt để sử dụng chức năng này.</p>
        </div>
        <Link 
          href="/settings" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-black rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-primary/20"
        >
          <Edit size={18} />
          Đi đến Cài đặt
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Left Column: Input Form (7 cols) */}
        <section className="xl:col-span-7 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-3xl p-6 md:p-8 border border-moss-100 shadow-xl shadow-moss-900/5 relative overflow-hidden group"
          >
            {/* Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors"></div>

            <div className="flex items-center gap-4 mb-8">
              <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                <Edit size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-moss-900">Chi tiết thanh toán</h3>
                <p className="text-sm text-moss-500 font-medium">Nhập thông tin để tự động sinh mã QR</p>
              </div>
            </div>

            <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handleGenerateQr(); }}>
              {/* Ngân hàng thụ hưởng */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-moss-700 ml-1">Ngân hàng thụ hưởng</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <div className="size-10 rounded-xl bg-white flex items-center justify-center overflow-hidden border border-moss-100 p-1 shadow-sm">
                      {bankMeta ? (
                        <img src={bankMeta.logoUrl} alt="Bank Logo" className="size-full object-contain" />
                      ) : (
                        <div className="size-full bg-moss-50" />
                      )}
                    </div>
                  </div>
                  <select 
                    className="block w-full pl-16 pr-4 py-4 bg-moss-50 border border-moss-200 rounded-2xl text-sm font-bold text-moss-900 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all cursor-pointer appearance-none"
                    value={selectedBankId}
                    onChange={(e) => {
                      const bid = e.target.value;
                      setSelectedBankId(bid);
                      const firstOfBank = accounts.find(a => a.bankId === bid);
                      if (firstOfBank) setSelectedAccountId(firstOfBank.id);
                    }}
                  >
                    {uniqueBanks.map(bank => (
                      <option key={bank.id} value={bank.id}>{bank.shortName} - {bank.fullName}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Số tài khoản thụ hưởng */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-moss-700 ml-1">Số tài khoản thụ hưởng</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <div className="size-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary border border-primary/10 shadow-sm font-black text-xs italic tracking-tighter">
                      STK
                    </div>
                  </div>
                  <select 
                    className="block w-full pl-16 pr-4 py-4 bg-moss-50 border border-moss-200 rounded-2xl text-sm font-bold text-moss-900 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all cursor-pointer appearance-none"
                    value={selectedAccountId || ""}
                    onChange={(e) => {
                      const aid = parseInt(e.target.value);
                      setSelectedAccountId(aid);
                    }}
                  >
                    {filteredAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountNo} - {acc.accountName} {acc.isDefault ? "(Mặc định)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Số tiền thanh toán */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-moss-700 ml-1">Số tiền thanh toán</label>
                <div className="relative group">
                  <input 
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                    placeholder="0"
                    className="block w-full px-6 py-6 bg-moss-50 border border-moss-200 rounded-2xl text-3xl font-black text-moss-900 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-moss-200"
                  />
                  <div className="absolute inset-y-0 right-0 pr-8 flex items-center pointer-events-none">
                    <span className="text-2xl font-black text-moss-300 uppercase italic tracking-tighter">VND</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 ml-1">
                  {["50000", "100000", "200000", "500000"].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${
                        amount === val 
                        ? "bg-primary text-white shadow-md shadow-primary/20" 
                        : "bg-moss-100 text-moss-600 hover:bg-primary/10 hover:text-primary"
                      }`}
                    >
                      {formatCurrency(val)}đ
                    </button>
                  ))}
                </div>
              </div>

              {/* Nội dung chuyển khoản */}
              <div className="space-y-3">
                <label className="text-sm font-bold text-moss-700 ml-1">Nội dung chuyển khoản</label>
                <div className="relative">
                  <textarea 
                    rows={3}
                    value={content}
                    onChange={(e) => setContent(e.target.value.substring(0, 50))}
                    placeholder="Ví dụ: NGUYEN VAN A THANH TOAN..."
                    className="block w-full px-6 py-4 bg-moss-50 border border-moss-200 rounded-2xl text-sm font-bold text-moss-900 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all resize-none placeholder:text-moss-300"
                  />
                  <div className="absolute bottom-4 right-6 text-[11px] font-black text-moss-300 uppercase tracking-widest bg-white/50 px-2 py-1 rounded-lg backdrop-blur-sm">
                    {content.length} <span className="opacity-40">/</span> 50
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="button"
                onClick={handleGenerateQr}
                disabled={isGenerating}
                className="w-full py-5 bg-moss-900 text-white font-black rounded-2xl flex items-center justify-center gap-3 hover:bg-black transition-all shadow-xl shadow-moss-900/10 uppercase tracking-[0.2em] text-sm disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <QrCode size={20} />
                )}
                {isGenerating ? "Đang tạo mã..." : "Tạo mã thanh toán ngay"}
              </motion.button>
            </form>
          </motion.div>
        </section>

        {/* Right Column: QR Preview (5 cols) */}
        <section className="xl:col-span-5 xl:sticky xl:top-24">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden bg-gradient-to-br from-moss-50 via-white to-moss-50 border border-moss-100 shadow-2xl shadow-moss-900/10 flex flex-col items-center"
          >
            {/* Design elements */}
            <div className="absolute -top-12 -right-12 size-48 bg-primary/10 rounded-full blur-[80px]"></div>
            <div className="absolute -bottom-12 -left-12 size-48 bg-moss-400/10 rounded-full blur-[80px]"></div>
            
            {/* QR Card Container */}
            <div className="w-full relative z-10 flex flex-col items-center">
              <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-4 md:p-6 shadow-2xl shadow-moss-900/10 flex flex-col items-center w-full">
                
                {/* QR Display - Enlarged and simplified */}
                <div className="w-full aspect-square relative group cursor-pointer mb-6">
                  {/* Static Border */}
                  <div className="absolute inset-0 border-2 border-dashed border-primary/10 rounded-3xl"></div>
                  
                  <div className="absolute inset-2 bg-white rounded-2xl shadow-inner border border-moss-100 flex items-center justify-center p-2 overflow-hidden">
                    {hasGenerated && debouncedQrUrl ? (
                      <motion.img 
                        key={debouncedQrUrl}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        src={debouncedQrUrl} 
                        alt="VietQR Code" 
                        className={`size-full object-contain scale-[1.1] ${isGenerating ? "opacity-30 blur-sm" : ""}`} 
                      />
                    ) : (
                      <div className="relative size-full flex flex-col items-center justify-center gap-4 text-moss-200 group-hover:text-primary transition-colors">
                        <QrCode size={120} strokeWidth={1} className="opacity-10" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-moss-300 text-center uppercase">Bấm &quot;Tạo mã&quot; để bắt đầu</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Box */}
                <div className="w-full bg-moss-50/50 rounded-2xl p-4 md:p-5 space-y-3 border border-moss-100 mb-2">
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-moss-400">Ngân hàng</span>
                      <span className="text-xs font-black text-moss-900 uppercase">{selectedAccount?.bankId}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-moss-400">Số tài khoản</span>
                      <span className="text-sm font-black text-primary tracking-widest">{selectedAccount?.accountNo}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase tracking-widest text-moss-400">Chủ tài khoản</span>
                      <span className="text-xs font-black text-moss-900 uppercase">{selectedAccount?.accountName}</span>
                   </div>
                   <div className="pt-3 border-t border-moss-200 flex justify-between items-center">
                      <span className="text-xs font-black uppercase text-moss-900">Tổng thanh toán</span>
                      <span className="text-xl font-black text-primary italic tracking-tighter">
                        {formatCurrency(amount)} <span className="text-sm not-italic mt-1">đ</span>
                      </span>
                   </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-4 mt-6 w-full">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDownload}
                  disabled={!debouncedQrUrl || isGenerating}
                  className="bg-primary text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:bg-emerald-500 transition-all uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download size={18} />
                  Tải ảnh
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCopyImage}
                  disabled={!debouncedQrUrl || isGenerating}
                  className="bg-white text-primary font-black py-4 rounded-xl flex items-center justify-center gap-2 border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all uppercase tracking-widest text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LinkIcon size={18} />
                  Copy Ảnh
                </motion.button>
              </div>

              {/* Footer Badge */}
              <div className="mt-6 flex items-center justify-center gap-2 text-moss-400 opacity-60">
                 <ShieldCheck size={12} />
                 <span className="text-[9px] font-black tracking-widest uppercase">Thanh toán Napas247</span>
              </div>
            </div>
          </motion.div>
        </section>
      </div>

      {/* Page Header (Now at the bottom) */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-mint-400/20 rounded-2xl blur opacity-10 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex flex-col md:flex-row md:items-end justify-between bg-white/30 backdrop-blur-sm border border-white/30 p-6 rounded-2xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary font-bold text-[10px] tracking-widest uppercase opacity-70">
              <Zap size={12} fill="currentColor" />
              Thông tin công cụ
            </div>
            <h2 className="text-xl font-black text-moss-900 tracking-tight">
              Tạo mã QR <span className="text-primary">VietQR</span>
            </h2>
            <p className="text-moss-500 font-medium text-xs max-w-lg">
              Công cụ hỗ trợ tạo mã QR thanh toán nhanh chóng và chính xác cho hệ thống Napas247, tự động hoá quy trình nhận thanh toán.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
    