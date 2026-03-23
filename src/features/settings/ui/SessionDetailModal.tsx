"use client";

import React from "react";
import { X, Monitor, Smartphone, Globe, Clock, ShieldCheck, MapPin } from "lucide-react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { parseUserAgent } from "../utils/userAgent";

interface SessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: {
    id: number;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    expiresAt: Date;
  };
}

export function SessionDetailModal({ isOpen, onClose, session }: SessionDetailModalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) setMounted(true);
    else {
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted && !isOpen) return null;

  const uaInfo = parseUserAgent(session.userAgent);

  const modalContent = (
    <div className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? "opacity-100 visible" : "opacity-0 invisible"}`}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className={`bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden transition-all duration-300 transform ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-8"}`}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold text-moss-900 tracking-tight">Chi tiết phiên</h3>
            <button onClick={onClose} className="p-2 hover:bg-moss-50 rounded-full transition-colors text-moss-400">
              <X className="size-6" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-moss-50 rounded-2xl">
              <div className="p-3 bg-white rounded-xl shadow-sm">
                {uaInfo.isMobile ? <Smartphone className="size-6 text-primary" /> : <Monitor className="size-6 text-primary" />}
              </div>
              <div>
                <p className="font-bold text-moss-900">{uaInfo.os} • {uaInfo.browser}</p>
                <p className="text-xs text-moss-500 mt-1">Loại thiết bị: {uaInfo.deviceType}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-moss-400 uppercase tracking-widest flex items-center gap-1.5">
                  <MapPin className="size-3" /> Địa chỉ IP
                </label>
                <p className="text-sm font-mono text-moss-700 bg-white border border-moss-100 px-3 py-2 rounded-xl">{session.ipAddress || "Unknown"}</p>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-moss-400 uppercase tracking-widest flex items-center gap-1.5">
                  <ShieldCheck className="size-3" /> Trạng thái
                </label>
                <div className="flex items-center gap-2 px-3 py-2">
                  <span className="size-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-bold text-primary">Đang hoạt động</span>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center text-sm border-b border-moss-50 pb-3">
                <span className="text-moss-500 flex items-center gap-2"><Clock className="size-4" /> Đăng nhập lúc</span>
                <span className="font-medium text-moss-900">{format(new Date(session.createdAt), "HH:mm, dd/MM/yyyy", { locale: vi })}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-moss-50 pb-3">
                <span className="text-moss-500 flex items-center gap-2"><X className="size-4" /> Hết hạn vào</span>
                <span className="font-medium text-moss-900">{format(new Date(session.expiresAt), "HH:mm, dd/MM/yyyy", { locale: vi })}</span>
              </div>
            </div>

            <div className="pt-2">
              <label className="text-[10px] font-bold text-moss-400 uppercase tracking-widest block mb-2">User Agent đầy đủ</label>
              <div className="p-4 bg-moss-50 rounded-2xl border border-moss-100 text-[11px] font-mono text-moss-600 break-all leading-relaxed max-h-24 overflow-y-auto custom-scrollbar">
                {session.userAgent || "N/A"}
              </div>
            </div>
          </div>

          <button onClick={onClose} className="w-full mt-8 bg-moss-900 text-white py-4 rounded-2xl font-bold hover:bg-moss-800 transition-all active:scale-[0.98]">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modalContent, document.body) : null;
}
