"use client";

import React, { useState, useEffect } from "react";
import { Shield, Eye, EyeOff, Loader2, CheckCircle2, ShieldOff } from "lucide-react";
import { changePasswordAction, disable2FAAction } from "../actions/securityActions";
import { toast } from "sonner";
import { Setup2FAModal } from "./Setup2FAModal";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";

interface AccountSettingsPaneProps {
  is2FAEnabledInitial: boolean;
}

export function AccountSettingsPane({ is2FAEnabledInitial }: AccountSettingsPaneProps) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(is2FAEnabledInitial);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showDisable2FAConfirm, setShowDisable2FAConfirm] = useState(false);
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const result = await changePasswordAction(data);
      if (result.success) {
        toast.success("Đổi mật khẩu thành công");
        (e.target as HTMLFormElement).reset();
      } else {
        toast.error(result.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      toast.error("Lỗi hệ thống, vui lòng thử lại sau");
    } finally {
      setIsPending(false);
    }
  };

  const handleDisable2FA = async () => {
    setIsDisabling2FA(true);
    try {
      const res = await disable2FAAction();
      if (res.success) {
        setIs2FAEnabled(false);
        setShowDisable2FAConfirm(false);
        toast.success("Đã tắt xác thực 2 lớp");
      } else {
        toast.error(res.message || "Có lỗi xảy ra");
      }
    } catch (e) {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsDisabling2FA(false);
    }
  };

  return (
    <section className="space-y-6 animate-fade-in-up">
      <Setup2FAModal 
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        onSuccess={() => setIs2FAEnabled(true)}
      />

      <ConfirmationDialog 
        isOpen={showDisable2FAConfirm}
        isLoading={isDisabling2FA}
        onClose={() => setShowDisable2FAConfirm(false)}
        onConfirm={handleDisable2FA}
        title="Tắt xác thực 2 lớp?"
        description="Tài khoản của bạn sẽ kém an toàn hơn. Bạn chắc chắn muốn thực hiện hành động này?"
        confirmText="Xác nhận tắt"
        variant="danger"
      />

      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-moss-900 tracking-tight">Tài khoản & bảo mật</h2>
        <p className="text-moss-500 text-sm">Quản lý mật khẩu, 2FA và các tùy chọn bảo mật quan trọng khác.</p>
      </div>

      {/* Password Card */}
      <form onSubmit={handlePasswordChange} className="bg-white rounded-2xl shadow-card border border-moss-100 overflow-hidden">
        <div className="p-6 border-b border-moss-50">
          <h3 className="text-lg font-semibold text-moss-900">Đổi mật khẩu</h3>
          <p className="text-sm text-moss-500 mt-1">Khuyến nghị dùng mật khẩu mạnh bao gồm chữ hoa, số và ký tự đặc biệt.</p>
        </div>
        <div className="p-6 space-y-4 max-w-md">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-moss-700">Mật khẩu hiện tại</label>
            <div className="relative">
              <input 
                name="currentPassword"
                required
                className="w-full rounded-xl border-moss-200 bg-moss-50/30 focus:border-primary focus:ring-primary/20 transition-all pl-4 pr-12 py-2.5 outline-none" 
                placeholder="••••••••" 
                type={showCurrentPassword ? "text" : "password"}
              />
              <button 
                type="button"
                tabIndex={-1}
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-moss-400 hover:text-primary transition-colors"
              >
                {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-moss-700">Mật khẩu mới</label>
            <div className="relative">
              <input 
                name="newPassword"
                required
                className="w-full rounded-xl border-moss-200 bg-moss-50/30 focus:border-primary focus:ring-primary/20 transition-all pl-4 pr-12 py-2.5 outline-none" 
                placeholder="••••••••" 
                type={showNewPassword ? "text" : "password"}
              />
              <button 
                type="button"
                tabIndex={-1}
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-moss-400 hover:text-primary transition-colors"
              >
                {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-moss-700">Xác nhận mật khẩu mới</label>
            <div className="relative">
              <input 
                name="confirmPassword"
                required
                className="w-full rounded-xl border-moss-200 bg-moss-50/30 focus:border-primary focus:ring-primary/20 transition-all pl-4 pr-12 py-2.5 outline-none" 
                placeholder="••••••••" 
                type={showConfirmPassword ? "text" : "password"}
              />
              <button 
                type="button"
                tabIndex={-1}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-moss-400 hover:text-primary transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <button 
            disabled={isPending}
            type="submit"
            className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-glow-mint hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            Cập nhật mật khẩu
          </button>
        </div>
      </form>

      {/* 2FA Card */}
      <div className={`bg-white rounded-2xl shadow-card border p-6 transition-all ${is2FAEnabled ? "border-primary/20 bg-primary/[0.01]" : "border-moss-100"}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className={`p-4 rounded-2xl self-start transition-colors ${is2FAEnabled ? "bg-primary/10 text-primary" : "bg-coral-50 text-coral-500"}`}>
              <Shield className="size-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-moss-900">Xác thực 2 lớp (2FA)</h3>
              <p className="text-sm text-moss-500 mt-1">Tăng cường bảo mật bằng cách thêm một lớp xác thực khi đăng nhập.</p>
              {!is2FAEnabled ? (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-3 text-sm text-moss-600">
                    <span className="w-6 h-6 flex items-center justify-center bg-moss-100 rounded-lg text-[10px] font-bold text-moss-900 cursor-default">1</span>
                    Cài đặt ứng dụng Google/Microsoft Authenticator.
                  </div>
                  <div className="flex items-center gap-3 text-sm text-moss-600">
                    <span className="w-6 h-6 flex items-center justify-center bg-moss-100 rounded-lg text-[10px] font-bold text-moss-900 cursor-default">2</span>
                    Quét mã QR được cung cấp bởi hệ thống.
                  </div>
                </div>
              ) : (
                <div className="mt-4 p-4 bg-white border border-primary/10 rounded-2xl flex items-center gap-3">
                  <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <CheckCircle2 className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-moss-900">Tính năng đang bật</p>
                    <p className="text-xs text-moss-500">Tài khoản của bạn đang được bảo vệ bởi 2FA.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${is2FAEnabled ? "bg-primary/10 text-primary" : "bg-coral-50 text-coral-600"}`}>
            {is2FAEnabled ? "Đã kích hoạt" : "Chưa kích hoạt"}
          </span>
        </div>
        <div className="mt-6 flex justify-end">
          {is2FAEnabled ? (
            <button 
              onClick={() => setShowDisable2FAConfirm(true)}
              className="text-coral-500 font-bold hover:underline transition-all flex items-center gap-1.5 group text-sm"
            >
              <ShieldOff className="size-4" />
              Tắt xác thực 2 lớp
            </button>
          ) : (
            <button 
              onClick={() => setShow2FAModal(true)}
              className="text-primary font-bold hover:underline transition-all flex items-center gap-1 group"
            >
              Thiết lập ngay 
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
