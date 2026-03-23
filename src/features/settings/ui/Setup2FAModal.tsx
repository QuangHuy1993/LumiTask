"use client";

import React, { useState, useEffect } from "react";
import { X, ShieldCheck, Copy, Download, Loader2, QrCode, ArrowRight, ShieldAlert } from "lucide-react";
import { createPortal } from "react-dom";
import { init2FAAction, enable2FAAction } from "../actions/securityActions";
import { toast } from "sonner";
import QRCode from "qrcode";

interface Setup2FAModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "intro" | "qr" | "verify" | "recovery" | "reactivate";

export function Setup2FAModal({ isOpen, onClose, onSuccess }: Setup2FAModalProps) {
  const [step, setStep] = useState<Step>("intro");
  const [isPending, setIsPending] = useState(false);
  const [qrData, setQrData] = useState<{ secret: string; otpauth: string; qrImage: string; isReactivating?: boolean } | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) setMounted(true);
    else {
      const timer = setTimeout(() => {
        setMounted(false);
        setStep("intro");
        setQrData(null);
        setOtpCode("");
        setRecoveryCodes([]);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleInit = async (forceNew = false) => {
    setIsPending(true);
    try {
      const res = await init2FAAction(forceNew);
      if (!res.success) {
        toast.error(res.message || "Không thể khởi tạo 2FA");
        return;
      }

      if (res.secret && res.otpauth) {
        const qrImage = await QRCode.toDataURL(res.otpauth);
        setQrData({ secret: res.secret, otpauth: res.otpauth, qrImage, isReactivating: res.isReactivating });
        setStep(res.isReactivating ? "reactivate" : "qr");
      }
    } catch (e) {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsPending(false);
    }
  };

  const handleVerify = async () => {
    if (otpCode.length !== 6) return;
    setIsPending(true);
    try {
      const res = await enable2FAAction(otpCode);
      if (!res.success) {
        toast.error(res.message || "Mã xác thực không đúng");
        return;
      }

      if (res.recoveryCodes) {
        setRecoveryCodes(res.recoveryCodes);
        setStep("recovery");
        toast.success("Đã kích hoạt 2FA thành công!");
      }
    } catch (e) {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsPending(false);
    }
  };

  const copyCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    toast.success("Đã sao chép mã khôi phục");
  };

  if (!mounted && !isOpen) return null;

  const modalContent = (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden transition-all duration-300 transform ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-8"}`}>
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-moss-50 rounded-full transition-colors text-moss-400">
          <X className="size-6" />
        </button>

        <div className="p-8">
          {step === "intro" && (
            <div className="text-center space-y-6">
              <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck className="size-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-moss-900">Bảo mật 2 lớp (2FA)</h3>
                <p className="text-moss-500 leading-relaxed px-4">Thêm lớp bảo vệ thứ hai cho tài khoản của bạn bằng ứng dụng Authenticator (Microsoft/Google).</p>
              </div>
              <button 
                disabled={isPending}
                onClick={() => handleInit()}
                className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-2xl font-bold transition-all shadow-glow-mint flex items-center justify-center gap-2"
              >
                {isPending ? <Loader2 className="size-5 animate-spin" /> : "Bắt đầu thiết lập"}
              </button>
            </div>
          )}

          {step === "reactivate" && qrData && (
            <div className="text-center space-y-6">
              <div className="size-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto">
                <QrCode className="size-10 text-amber-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-moss-900">Thiết bị đã cấu hình</h3>
                <p className="text-moss-500 leading-relaxed px-4">Chúng tôi tìm thấy cấu hình 2FA cũ của bạn. Bạn có muốn sử dụng tiếp không?</p>
              </div>
              <div className="space-y-3 pt-2">
                <button 
                  onClick={() => setStep("verify")}
                  className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  Dùng cấu hình hiện tại
                </button>
                <button 
                  onClick={() => handleInit(true)} // forceNew = true
                  disabled={isPending}
                  className="w-full bg-moss-50 hover:bg-moss-100 text-moss-700 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  {isPending ? <Loader2 className="size-5 animate-spin" /> : "Thiết lập thiết bị mới"}
                </button>
              </div>
            </div>
          )}

          {step === "qr" && qrData && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-moss-900 mb-2">Quét mã QR</h3>
                <p className="text-sm text-moss-500">Dùng app Authenticator để quét mã bên dưới</p>
              </div>
              
              <div className="bg-white p-4 rounded-3xl border-2 border-dashed border-moss-100 flex items-center justify-center mx-auto size-52">
                <img src={qrData.qrImage} alt="QR Code" className="size-full" />
              </div>

              <div className="bg-moss-50 p-4 rounded-2xl space-y-1">
                <label className="text-[10px] font-bold text-moss-400 uppercase tracking-widest block">Hoặc nhập mã thủ công</label>
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono font-bold text-moss-700 tracking-wider text-sm">{qrData.secret}</span>
                  <button onClick={() => {
                    navigator.clipboard.writeText(qrData.secret);
                    toast.success("Đã sao chép secret");
                  }} className="text-primary p-2 hover:bg-white rounded-lg transition-all">
                    <Copy className="size-4" />
                  </button>
                </div>
              </div>

              <button 
                onClick={() => setStep("verify")}
                className="w-full bg-moss-900 text-white py-4 rounded-2xl font-bold hover:bg-moss-800 transition-all flex items-center justify-center gap-2"
              >
                Tiếp tục <ArrowRight className="size-5" />
              </button>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-bold text-moss-900 mb-2">Nhập mã xác nhận</h3>
                <p className="text-sm text-moss-500 leading-relaxed">Nhập mã 6 chữ số từ ứng dụng Authenticator của bạn</p>
              </div>

              <div className="flex justify-center w-full">
                <input 
                  autoFocus
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-64 text-center text-4xl font-bold tracking-[0.3em] py-4 bg-moss-50 border-none rounded-3xl focus:ring-4 focus:ring-primary/10 placeholder:text-moss-200 outline-none transition-all"
                />
              </div>

              <button 
                disabled={isPending || otpCode.length !== 6}
                onClick={handleVerify}
                className="w-full bg-primary hover:bg-primary-hover text-white py-4 rounded-2xl font-bold transition-all shadow-glow-mint flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isPending ? <Loader2 className="size-5 animate-spin" /> : "Xác nhận & Kích hoạt"}
              </button>
              
              <button 
                onClick={() => setStep("qr")}
                className="w-full text-moss-400 font-bold text-sm hover:text-moss-900 transition-colors"
              >
                Quay lại quét mã
              </button>
            </div>
          )}

          {step === "recovery" && (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                <ShieldAlert className="size-6 text-amber-500 shrink-0" />
                <p className="text-xs text-amber-800 leading-relaxed font-medium">Lưu ý: Các mã này giúp bạn đăng nhập nếu mất điện thoại. Hãy lưu chúng ở nơi an toàn. Mỗi mã chỉ dùng được 1 lần.</p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-6 bg-moss-50 rounded-[2rem] border border-moss-100">
                {recoveryCodes.map((code, idx) => (
                  <div key={idx} className="font-mono font-bold text-moss-700 tracking-wider text-sm p-1">
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={copyCodes}
                  className="flex-1 bg-moss-50 hover:bg-moss-100 text-moss-700 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Copy className="size-4" /> Sao chép
                </button>
                <button 
                  onClick={() => {
                    const blob = new Blob([recoveryCodes.join("\n")], { type: "text/plain" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "lumitask-recovery-codes.txt";
                    a.click();
                  }}
                  className="flex-1 bg-moss-50 hover:bg-moss-100 text-moss-700 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Download className="size-4" /> Tải về
                </button>
              </div>

              <button 
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="w-full bg-moss-900 text-white py-4 rounded-2xl font-bold hover:bg-moss-800 transition-all"
              >
                Xong, tôi đã lưu mã
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modalContent, document.body) : null;
}
