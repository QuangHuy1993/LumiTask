"use client";

import React, { useState } from "react";
import { Monitor, Smartphone, Globe, Loader2, ShieldAlert, MoreHorizontal, Clock, MapPin, ExternalLink } from "lucide-react";
import { revokeSessionAction, revokeAllOtherSessionsAction } from "../actions/sessionActions";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { SessionDetailModal } from "./SessionDetailModal";
import { parseUserAgent } from "../utils/userAgent";

interface Session {
  id: number;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  expiresAt: Date;
}

interface SessionsSettingsPaneProps {
  initialSessions: Session[];
}

export function SessionsSettingsPane({ initialSessions }: SessionsSettingsPaneProps) {
  const [isPending, setIsPending] = useState<number | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [showRevokeAllConfirm, setShowRevokeAllConfirm] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const handleRevoke = async (id: number) => {
    setIsPending(id);
    try {
      const res = await revokeSessionAction(id);
      if (res.success) toast.success("Đã thu hồi phiên đăng nhập");
      else toast.error("Có lỗi xảy ra");
    } catch (e) {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsPending(null);
    }
  };

  const handleRevokeAll = async () => {
    setIsRevokingAll(true);
    try {
      const res = await revokeAllOtherSessionsAction();
      if (res.success) {
        toast.success("Đã đăng xuất các thiết bị khác");
        setShowRevokeAllConfirm(false);
      } else {
        toast.error("Có lỗi xảy ra");
      }
    } catch (e) {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsRevokingAll(false);
    }
  };

  return (
    <section className="space-y-6 animate-fade-in-up">
      <ConfirmationDialog 
        isOpen={showRevokeAllConfirm}
        isLoading={isRevokingAll}
        onClose={() => setShowRevokeAllConfirm(false)}
        onConfirm={handleRevokeAll}
        title="Đăng xuất tất cả thiết bị?"
        description="Hành động này sẽ thu hồi quyền truy cập của tất cả các phiên đăng nhập khác ngoại trừ phiên bạn đang sử dụng."
        confirmText="Xác nhận đăng xuất"
      />

      {selectedSession && (
        <SessionDetailModal 
          isOpen={!!selectedSession}
          onClose={() => setSelectedSession(null)}
          session={selectedSession}
        />
      )}

      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold text-moss-900 tracking-tight">Phiên đăng nhập</h2>
        <p className="text-moss-500 text-xs">Quản lý và giám sát các thiết bị đang truy cập vào tài khoản của bạn.</p>
      </div>

      <div className="grid gap-4">
        {initialSessions.map((session, index) => {
          const uaInfo = parseUserAgent(session.userAgent);
          const isCurrent = index === 0; // Temporary logic for "Current Session"

          return (
            <div 
              key={session.id} 
              className={`bg-white rounded-3xl p-5 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group ${
                isCurrent ? "border-primary/20 bg-primary/[0.02]" : "border-moss-100 hover:border-primary/30"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl bg-white border border-moss-100 shadow-sm ${isCurrent ? "text-primary" : "text-moss-400"}`}>
                  {uaInfo.isMobile ? <Smartphone className="size-6" /> : <Monitor className="size-6" />}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-moss-900">{uaInfo.os} • {uaInfo.browser}</span>
                    {isCurrent && (
                      <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-primary/20">
                        Phiên này
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="text-xs text-moss-500 flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-moss-300" /> {session.ipAddress || "Unknown"}
                    </span>
                    <span className="text-xs text-moss-400 flex items-center gap-1.5">
                      <Clock className="size-3.5 text-moss-300" /> 
                      {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true, locale: vi })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end self-end md:self-center">
                <button 
                  onClick={() => setSelectedSession(session)}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-moss-600 bg-moss-50 hover:bg-moss-100 rounded-xl transition-all active:scale-95"
                >
                  <ExternalLink className="size-3.5" />
                  Chi tiết
                </button>
                {!isCurrent && (
                  <button 
                    disabled={isPending === session.id}
                    onClick={() => handleRevoke(session.id)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-coral-500 hover:bg-coral-50 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isPending === session.id ? <Loader2 className="size-3.5 animate-spin" /> : "Đăng xuất"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="bg-white rounded-[2rem] border border-coral-100 p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-coral-50 flex items-center justify-center border border-coral-100">
            <ShieldAlert className="size-7 text-coral-500 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-moss-900 text-sm">Bảo mật tài khoản</h4>
            <p className="text-xs text-moss-500 max-w-[400px]">Bạn cảm thấy có hoạt động đáng ngờ? Đăng xuất khỏi mọi thiết bị khác ngay lập tức để bảo vệ thông tin cá nhân.</p>
          </div>
        </div>
        <button 
          disabled={isRevokingAll}
          onClick={() => setShowRevokeAllConfirm(true)}
          className="w-full md:w-auto px-6 py-3 bg-coral-500 hover:bg-coral-600 text-white font-bold text-sm rounded-2xl transition-all shadow-lg shadow-coral-100 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isRevokingAll && <Loader2 className="size-4 animate-spin" />}
          Đăng xuất tất cả thiết bị khác
        </button>
      </div>
    </section>
  );
}
