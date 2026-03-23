"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction, verify2FAAction } from "@/features/auth/actions/loginAction";
import { toast } from "sonner";
import type { LoginInput, LoginResult } from "@/features/auth/model/authTypes";

export function useLoginForm() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string; otp?: string }>({});
  
  // 2FA states
  const [requires2FA, setRequires2FA] = useState(false);
  const [preAuthToken, setPreAuthToken] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");

  const toggleShowPassword = () => setShowPassword((v) => !v);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!identifier || !password) {
      const fieldErrors: { identifier?: string; password?: string } = {};
      if (!identifier) fieldErrors.identifier = "Vui lòng nhập email";
      if (!password) fieldErrors.password = "Vui lòng nhập mật khẩu";
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);
    const input: LoginInput = { identifier, password, rememberMe };

    try {
      const result = await loginAction(input);

      if (result.success) {
        handleSuccess(result.redirectUrl);
      } else if (result.error === "REQUIRES_2FA") {
        setRequires2FA(true);
        setPreAuthToken(result.preAuthToken);
        toast.info("Yêu cầu xác thực 2 lớp", {
          description: "Vui lòng nhập mã từ ứng dụng Authenticator của bạn",
        });
      } else {
        handleError(result);
      }
    } catch {
      toast.error("Lỗi kết nối");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!preAuthToken || otpCode.length !== 6) return;

    setIsLoading(true);
    try {
      const result = await verify2FAAction(preAuthToken, otpCode);
      if (result.success) {
        handleSuccess(result.redirectUrl);
      } else {
        toast.error("Mã xác thực không đúng", {
          description: "Vui lòng kiểm tra lại mã 6 chữ số",
        });
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = (redirectUrl: string) => {
    toast.success("Đăng nhập thành công!");
    window.dispatchEvent(new CustomEvent("trigger-page-transition"));
    setTimeout(() => {
      router.push(redirectUrl);
    }, 600);
  };

  const handleError = (result: LoginResult) => {
    if (result.success) return;

    if (result.error === "VALIDATION_ERROR" && result.field) {
      setErrors({ [result.field]: "Dữ liệu không hợp lệ" });
    } else if (result.error === "INVALID_CREDENTIALS") {
      toast.error("Sai thông tin đăng nhập");
    } else if (result.error === "ACCOUNT_DISABLED") {
      toast.error("Tài khoản bị khoá");
    } else if (result.error === "RATE_LIMITED") {
      toast.error(`Thử lại sau ${Math.ceil((result.retryAfterMs || 0) / 1000 / 60)} phút`);
    } else {
      toast.error("Lỗi hệ thống");
    }
  };

  return {
    identifier, setIdentifier,
    password, setPassword,
    rememberMe, setRememberMe,
    showPassword, toggleShowPassword,
    isLoading,
    errors,
    handleSubmit,
    // 2FA
    requires2FA,
    setRequires2FA,
    otpCode,
    setOtpCode,
    handleVerify2FA,
  };
}
