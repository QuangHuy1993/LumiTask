"use client";

import { useLoginForm } from "./useLoginForm";
import { Mail, Lock, ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Checkbox, Label } from "flowbite-react";
import { motion } from "framer-motion";
import { showComingSoonToast } from "@/lib/toast-utils";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

export function LoginForm() {
  const {
    identifier, setIdentifier,
    password, setPassword,
    showPassword, toggleShowPassword,
    rememberMe, setRememberMe,
    isLoading,
    errors,
    handleSubmit,
    // 2FA
    requires2FA, setRequires2FA,
    otpCode, setOtpCode,
    handleVerify2FA,
  } = useLoginForm();

  const searchParams = useSearchParams();
  const toastShown = useRef(false);

  useEffect(() => {
    if (searchParams.get("logout") === "1" && !toastShown.current) {
      toast.success("Đăng xuất thành công", {
        description: "Hẹn gặp lại bạn lần sau!"
      });
      toastShown.current = true;
    }
  }, [searchParams]);

  const handleComingSoon = (e: React.MouseEvent) => {
    e.preventDefault();
    showComingSoonToast();
  };

  return (
    <div className="w-full max-w-md">
      <motion.div 
        key={requires2FA ? "2fa" : "login"}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 flex flex-col items-center md:items-start"
      >
        <div className="md:hidden flex items-center gap-2 mb-6 text-new-primary">
          <div className="size-8 flex items-center justify-center bg-new-primary rounded-lg text-white shadow-md">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 2L3 7V17L12 22L21 17V7L12 2Z"></path>
              <path d="M12 22V12"></path>
              <path d="M21 7L12 12L3 7"></path>
            </svg>
          </div>
          <span className="text-xl font-bold gradient-text">LumiTask</span>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
          {requires2FA ? "Xác thực 2 lớp" : "Chào mừng trở lại"}
        </h2>
        <p className="text-slate-500 font-medium">
          {requires2FA ? "Vui lòng nhập mã từ ứng dụng Authenticator" : "Vui lòng nhập thông tin để truy cập hệ thống"}
        </p>
      </motion.div>

      {!requires2FA ? (
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <div className="animate-fade-in-up stagger-1">
            <label className="block text-sm font-bold text-slate-500 mb-2" htmlFor="identifier">
              Địa chỉ Email <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-new-primary transition-colors">
                <Mail className="w-5 h-5" />
              </span>
              <input
                className={`block w-full pl-11 pr-4 py-4 bg-slate-50 border rounded-xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-new-primary/10 focus:border-new-primary transition-all placeholder:text-slate-400 font-medium ${
                  errors.identifier ? "border-red-500" : "border-slate-200"
                }`}
                id="identifier"
                placeholder="name@gmail.com"
                type="email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isLoading}
              />
            </div>
            {errors.identifier && <p className="mt-1.5 text-xs font-bold text-red-500">{errors.identifier}</p>}
          </div>

          <div className="animate-fade-in-up stagger-2">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-slate-500" htmlFor="password">
                Mật khẩu
              </label>
              <a className="text-xs font-extrabold text-new-primary hover:text-new-secondary transition-colors" href="#" tabIndex={-1} onClick={handleComingSoon}>
                Quên mật khẩu?
              </a>
            </div>
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-new-primary transition-colors">
                <Lock className="w-5 h-5" />
              </span>
              <input
                className={`block w-full pl-11 pr-12 py-4 bg-slate-50 border rounded-xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-new-primary/10 focus:border-new-primary transition-all placeholder:text-slate-400 font-medium ${
                  errors.password ? "border-red-500" : "border-slate-200"
                }`}
                id="password"
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <button className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors" type="button" onClick={toggleShowPassword}>
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="mt-1.5 text-xs font-bold text-red-500">{errors.password}</p>}
          </div>

          <div className="flex items-center animate-fade-in-up stagger-3">
            <Checkbox
              id="remember-me"
              className="h-4 w-4 text-new-primary focus:ring-new-primary border-slate-300 rounded cursor-pointer"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isLoading}
            />
            <Label className="ml-2 block text-sm font-semibold text-slate-500 cursor-pointer" htmlFor="remember-me">
              Ghi nhớ đăng nhập
            </Label>
          </div>

          <button
            className="w-full flex justify-center items-center py-4 px-6 rounded-xl bg-new-primary hover:bg-emerald-500 text-white text-base font-bold transition-all transform active:scale-[0.98] shadow-lg shadow-new-primary/20 animate-fade-in-up stagger-4 disabled:opacity-70 disabled:cursor-not-allowed"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : (
              <>
                Tiếp tục
                <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </button>
        </form>
      ) : (
        <form className="space-y-6" onSubmit={handleVerify2FA} noValidate>
          <div className="animate-fade-in-up stagger-1">
            <label className="block text-sm font-bold text-slate-500 mb-4 text-center" htmlFor="otp">
              Mã xác thực 6 chữ số
            </label>
            <div className="flex justify-center w-full">
              <input
                autoFocus
                className="w-full max-w-[280px] text-center text-4xl font-bold tracking-[0.3em] py-5 bg-slate-50 border border-slate-200 rounded-3xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-new-primary/10 focus:border-new-primary transition-all placeholder:text-slate-200 shadow-inner"
                id="otp"
                placeholder="000000"
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                disabled={isLoading}
              />
            </div>
            {errors.otp && <p className="mt-1.5 text-center text-xs font-bold text-red-500">{errors.otp}</p>}
          </div>

          <button
            className="w-full flex justify-center items-center py-4 px-6 rounded-xl bg-new-primary hover:bg-emerald-500 text-white text-base font-bold transition-all transform active:scale-[0.98] shadow-lg shadow-new-primary/20 animate-fade-in-up stagger-2 disabled:opacity-70 disabled:cursor-not-allowed"
            type="submit"
            disabled={isLoading || otpCode.length !== 6}
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : (
              <>
                Xác nhận đăng nhập
                <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setRequires2FA(false)}
            className="w-full text-center text-sm font-bold text-slate-400 hover:text-new-primary transition-colors animate-fade-in-up stagger-3"
          >
            Quay lại đăng nhập bằng mật khẩu
          </button>
        </form>
      )}

      {!requires2FA && (
        <div className="mt-10 animate-fade-in-up stagger-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500 font-bold">Hoặc tiếp tục với</span>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center py-3.5 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all gap-2 font-bold text-slate-700" onClick={handleComingSoon}>
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span>Google</span>
            </button>
            <button className="flex items-center justify-center py-3.5 px-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all gap-2 font-bold text-slate-700" onClick={handleComingSoon}>
              <svg className="h-5 w-5 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.248h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>Facebook</span>
            </button>
          </div>
        </div>
      )}

      {!requires2FA && (
        <p className="mt-10 text-center text-sm text-slate-500 font-medium animate-fade-in-up stagger-4">
          Bạn chưa có tài khoản?
          <a className="ml-1 font-extrabold text-new-primary hover:text-new-secondary transition-colors" href="#" onClick={handleComingSoon}>
            Đăng ký dùng thử miễn phí
          </a>
        </p>
      )}
    </div>
  );
}
