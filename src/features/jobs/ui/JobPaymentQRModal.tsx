"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Link as LinkIcon, QrCode, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

import type { PaymentStatus } from "@prisma/client";
import { SUPPORTED_BANKS } from "@/features/settings/model/bankList";
import { getUserBankAccountsAction } from "@/features/payments/actions/paymentActions";

type BankAccount = {
  id: number;
  bankId: string;
  accountNo: string;
  accountName: string;
  isDefault: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  jobId: number | null;
  jobName: string | null;
  paymentStatus: PaymentStatus | null;
  amount: number;
  deposit: number;
  totalPaid: number;
};

type TabId = "DEPOSIT" | "FULL";

export function JobPaymentQRModal({ open, onClose, jobId, jobName, paymentStatus, amount, deposit, totalPaid }: Props) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [tab, setTab] = useState<TabId>("DEPOSIT");
  const [money, setMoney] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [qrUrl, setQrUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const getDepositAmount = React.useCallback(() => {
    if (deposit > 0) return deposit;
    if (amount > 0) return amount;
    return 0;
  }, [amount, deposit]);

  const getFullAmount = React.useCallback(() => {
    const remaining = Math.max(amount - totalPaid, 0);
    if (remaining > 0) return remaining;
    if (amount > 0 && totalPaid === 0) return amount;
    return remaining;
  }, [amount, totalPaid]);

  React.useEffect(() => {
    if (!open) return;
    async function load() {
      setIsLoading(true);
      const res = await getUserBankAccountsAction();
      if (res.success && res.data) {
        setAccounts(res.data);
        const def = res.data.find((a) => a.isDefault) ?? res.data[0];
        setSelectedAccountId(def?.id ?? null);
      } else {
        toast.error("Không thể tải danh sách tài khoản ngân hàng");
      }
      setIsLoading(false);
    }
    load();
  }, [open]);

  React.useEffect(() => {
    if (!jobId || !paymentStatus) return;

    let defaultTab: TabId = "DEPOSIT";
    if (paymentStatus === "UNPAID") {
      defaultTab = "DEPOSIT";
    } else if (paymentStatus === "DEPOSIT_PAID" || paymentStatus === "COMPLETED") {
      defaultTab = "FULL";
    }
    setTab(defaultTab);

    const defaultAmount = defaultTab === "DEPOSIT" ? getDepositAmount() : getFullAmount();
    setMoney(String(defaultAmount || 0));
    const code = defaultTab === "DEPOSIT" ? `JOB${jobId}COC` : `JOB${jobId}FULL`;
    setContent(code);
  }, [jobId, paymentStatus, getDepositAmount, getFullAmount]);

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === selectedAccountId) ?? null,
    [accounts, selectedAccountId],
  );

  const bankMeta = useMemo(
    () => (selectedAccount ? SUPPORTED_BANKS.find((b) => b.id === selectedAccount.bankId) ?? null : null),
    [selectedAccount],
  );

  async function handleGenerate() {
    if (!selectedAccount || !jobId) {
      toast.error("Thiếu thông tin job hoặc tài khoản ngân hàng");
      return;
    }
    const numericAmount = Number.parseInt(money || "0", 10);
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Số tiền không hợp lệ");
      return;
    }
    const baseContent = content || (tab === "DEPOSIT" ? `JOB${jobId}COC` : `JOB${jobId}FULL`);
    const url = `https://img.vietqr.io/image/${selectedAccount.bankId}-${selectedAccount.accountNo}-compact.png?amount=${numericAmount}&addInfo=${encodeURIComponent(baseContent)}&accountName=${encodeURIComponent(selectedAccount.accountName)}`;
    setIsGenerating(true);
    setTimeout(() => {
      setQrUrl(url);
      setIsGenerating(false);
      toast.success("Đã tạo mã QR thanh toán");
    }, 250);
  }

  async function handleDownload() {
    if (!qrUrl) {
      toast.error("Vui lòng tạo mã QR trước");
      return;
    }
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vietqr-job-${jobId ?? "payment"}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Đã bắt đầu tải ảnh");
    } catch {
      toast.error("Không thể tải ảnh. Vui lòng thử lại.");
    }
  }

  async function handleCopyImage() {
    if (!qrUrl) {
      toast.error("Vui lòng tạo mã QR trước");
      return;
    }
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      toast.success("Đã sao chép ảnh mã QR vào bộ nhớ tạm");
    } catch {
      toast.error("Không thể sao chép ảnh. Vui lòng thử lại.");
    }
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          className="relative w-full max-w-5xl rounded-xl bg-bgApp border border-slate-200 shadow-2xl overflow-hidden"
        >
          <div className="flex flex-col md:flex-row">
            {/* Left: Form */}
            <div className="flex-1 p-6 md:p-10 border-b md:border-b-0 md:border-r border-primary/10 bg-bgApp">
              <div className="mb-8">
                <h1 className="text-slate-900 text-3xl font-bold leading-tight">Tạo mã QR thanh toán</h1>
                <p className="text-slate-600 text-sm mt-2">
                  Vui lòng kiểm tra thông tin trước khi quét mã để đảm bảo giao dịch chính xác.
                </p>
                {jobId && (
                  <p className="mt-2 text-xs text-slate-500">
                    Job #{jobId}
                    {jobName ? ` • ${jobName}` : ""}
                  </p>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-primary/10 mb-8">
                {(paymentStatus === "UNPAID" || paymentStatus === "DEPOSIT_PAID") && (
                  <>
                    <button
                      type="button"
                      className={`flex items-center justify-center border-b-2 px-6 py-3 text-sm font-bold tracking-wide ${
                        tab === "DEPOSIT" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-primary"
                      }`}
                      onClick={() => {
                        if (paymentStatus === "DEPOSIT_PAID") return;
                        setTab("DEPOSIT");
                        const value = getDepositAmount();
                        setMoney(String(value || 0));
                        setContent(jobId ? `JOB${jobId}COC` : "");
                      }}
                      disabled={paymentStatus === "DEPOSIT_PAID"}
                    >
                      Tiền cọc
                    </button>
                    <button
                      type="button"
                      className={`flex items-center justify-center border-b-2 px-6 py-3 text-sm font-bold tracking-wide ${
                        tab === "FULL" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-primary"
                      }`}
                      onClick={() => {
                        setTab("FULL");
                        const value = getFullAmount();
                        setMoney(String(value || 0));
                        setContent(jobId ? `JOB${jobId}FULL` : "");
                      }}
                    >
                      {paymentStatus === "UNPAID" ? "Trả đủ ngay" : "Phần còn lại"}
                    </button>
                  </>
                )}
                {paymentStatus === "COMPLETED" && (
                  <div className="py-3 text-sm font-bold text-slate-500">Đã thanh toán đủ</div>
                )}
              </div>

              {paymentStatus === "DEPOSIT_PAID" && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
                  Khách hàng đã thanh toán tiền cọc. Bạn chỉ có thể tạo mã QR cho phần tiền còn lại.
                </div>
              )}

              {isLoading ? (
                <div className="p-10 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="size-8 animate-spin text-primary/40" />
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em]">Đang tải tài khoản ngân hàng</p>
                </div>
              ) : accounts.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-600 bg-white rounded-xl border border-slate-200">
                  Bạn chưa cấu hình tài khoản ngân hàng. Vào phần Cài đặt &gt; Thanh toán để thêm tài khoản trước.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-slate-700 text-sm font-semibold">Số tiền</label>
                    <div className="relative">
                      <input
                        className="w-full h-14 bg-white border border-primary/20 rounded-xl px-4 text-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-lg font-bold"
                        type="text"
                        value={money}
                        onChange={(e) => setMoney(e.target.value.replace(/[^\d]/g, "") || "0")}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">VND</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-slate-700 text-sm font-semibold">Nội dung thanh toán</label>
                    <div className="flex items-stretch">
                      <input
                        className="flex-1 h-14 bg-white border border-primary/20 rounded-l-xl px-4 text-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-base font-mono"
                        type="text"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                      />
                      <button
                        type="button"
                        className="bg-primary/10 hover:bg-primary/20 text-primary border border-l-0 border-primary/20 rounded-r-xl px-4 flex items-center justify-center transition-colors"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(content);
                            toast.success("Đã copy nội dung");
                          } catch {
                            toast.error("Không thể copy nội dung");
                          }
                        }}
                      >
                        <Copy className="size-5" />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Gợi ý: {jobId ? `JOB${jobId}${tab === "DEPOSIT" ? "COC" : "FULL"}` : "JOB{id}COC / JOB{id}FULL"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-slate-700 text-sm font-semibold">Tài khoản thụ hưởng</label>
                    <div className="relative">
                      <select
                        className="w-full h-14 bg-white border border-primary/20 rounded-xl px-4 pr-10 text-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent outline-none appearance-none text-base"
                        value={selectedAccountId ?? ""}
                        onChange={(e) => setSelectedAccountId(e.target.value ? Number(e.target.value) : null)}
                      >
                        {accounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.bankId} - {acc.accountNo} - {acc.accountName}
                            {acc.isDefault ? " (Mặc định)" : ""}
                          </option>
                        ))}
                      </select>
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                        ▾
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-4">
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={isGenerating || paymentStatus === "COMPLETED"}
                      className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 className="size-5 animate-spin" /> : <QrCode className="size-5" />}
                      Xác nhận thông tin
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: QR preview */}
            <div className="w-full md:w-[400px] bg-slate-100 p-8 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />

              <div className="bg-white/70 backdrop-blur p-6 rounded-3xl w-full max-w-[280px] shadow-2xl relative z-10 border border-white/40">
                <div className="bg-white p-4 rounded-2xl mb-4 aspect-square flex items-center justify-center relative">
                  {qrUrl ? (
                    <img alt="VietQR code for payment" className="w-full h-full object-contain" src={qrUrl} />
                  ) : (
                    <div className="text-center text-slate-400 text-sm font-semibold flex flex-col items-center gap-3">
                      <QrCode className="size-16 opacity-30" />
                      <span>Chưa có mã QR</span>
                    </div>
                  )}
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs font-bold text-primary tracking-widest uppercase">VietQR</p>
                  <p className="text-slate-900 text-lg font-bold">{money ? `${money} VND` : "—"}</p>
                  <p className="text-slate-500 text-xs">Quét để thanh toán</p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 w-full max-w-[280px] relative z-10">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={!qrUrl}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded-xl border border-slate-200 transition-all disabled:opacity-50"
                >
                  <Download className="size-5" />
                  Tải ảnh
                </button>
                <button
                  type="button"
                  onClick={handleCopyImage}
                  disabled={!qrUrl}
                  className="flex items-center justify-center gap-2 w-full py-3 bg-white hover:bg-slate-50 text-slate-900 font-semibold rounded-xl border border-slate-200 transition-all disabled:opacity-50"
                >
                  <LinkIcon className="size-5" />
                  Copy ảnh
                </button>
              </div>

              {selectedAccount && bankMeta && (
                <p className="mt-6 text-[10px] text-slate-400 text-center uppercase tracking-widest font-medium">
                  {bankMeta.shortName} • {selectedAccount.accountNo} • {selectedAccount.accountName}
                </p>
              )}

              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-white/70 border border-white/60 text-slate-600 hover:text-slate-900"
              >
                Đóng
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

