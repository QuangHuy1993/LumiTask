"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createPortal } from "react-dom";
import { X, Loader2, User, Lock, Eye, EyeOff, ShieldCheck, Mail } from "lucide-react";
import {
  createUserSchema,
  updateUserSchema,
  type UserDTO,
  type CreateUserFormValues,
  type UpdateUserFormValues,
} from "../model/userSchema";

interface UserFormProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserFormValues | UpdateUserFormValues) => Promise<void>;
  editingUser?: UserDTO | null;
  isLoading?: boolean;
}

export function UserForm({ show, onClose, onSubmit, editingUser, isLoading }: UserFormProps) {
  const isEdit = !!editingUser;
  const [showPassword, setShowPassword] = useState(false);

  const createForm = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { username: "", email: "", password: "", fullName: "", role: "LIMITED" },
  });

  const editForm = useForm<UpdateUserFormValues>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: { fullName: "", email: "", role: "LIMITED", password: "" },
  });

  useEffect(() => {
    if (!show) return;
    setShowPassword(false);
    if (isEdit && editingUser) {
      editForm.reset({
        fullName: editingUser.fullName || "",
        email: editingUser.email || "",
        role: editingUser.role,
        password: "",
      });
    } else {
      createForm.reset({ username: "", email: "", password: "", fullName: "", role: "LIMITED" });
    }
    // editForm and createForm are stable refs from useForm
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, editingUser, isEdit]);

  const handleCreate = async (data: CreateUserFormValues) => {
    await onSubmit(data);
  };

  const handleEdit = async (data: UpdateUserFormValues) => {
    await onSubmit(data);
  };

  if (!show) return null;

  const fieldClass = (hasError?: boolean) =>
    `block w-full pl-11 pr-4 py-4 bg-slate-50 border rounded-2xl text-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 font-medium ${
      hasError ? "border-red-400" : "border-slate-100"
    }`;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary to-emerald-400" />
        <button
          onClick={onClose}
          className="absolute top-7 right-7 p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400"
        >
          <X className="size-5" />
        </button>

        <div className="p-8 pt-9">
          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-1">
            {isEdit ? "Chỉnh sửa người dùng" : "Thêm người dùng mới"}
          </h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-7">
            {isEdit ? `Cập nhật: @${editingUser?.username}` : "Tạo tài khoản và cấp quyền truy cập"}
          </p>

          {isEdit ? (
            <form onSubmit={editForm.handleSubmit(handleEdit)} className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Họ và tên
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-300 group-focus-within:text-primary transition-colors">
                    <User className="size-4.5" />
                  </span>
                  <input
                    className={fieldClass(!!editForm.formState.errors.fullName)}
                    placeholder="Nguyễn Văn A"
                    {...editForm.register("fullName")}
                  />
                </div>
                {editForm.formState.errors.fullName && (
                  <p className="mt-1.5 text-xs text-red-500 font-bold">{editForm.formState.errors.fullName.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Email <span className="normal-case font-medium text-slate-400">(tùy chọn)</span>
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-300 group-focus-within:text-primary transition-colors">
                    <Mail className="size-4.5" />
                  </span>
                  <input
                    type="email"
                    className={fieldClass(!!editForm.formState.errors.email)}
                    placeholder="name@example.com"
                    {...editForm.register("email")}
                  />
                </div>
                {editForm.formState.errors.email && (
                  <p className="mt-1.5 text-xs text-red-500 font-bold">{editForm.formState.errors.email.message}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Quyền hạn
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-300 group-focus-within:text-primary transition-colors">
                    <ShieldCheck className="size-4.5" />
                  </span>
                  <select
                    className={`${fieldClass(!!editForm.formState.errors.role)} cursor-pointer`}
                    {...editForm.register("role")}
                  >
                    <option value="LIMITED">Hạn chế (LIMITED)</option>
                    <option value="OWNER">Chủ sở hữu (OWNER)</option>
                  </select>
                </div>
              </div>

              {/* Password optional */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Mật khẩu mới <span className="normal-case font-medium text-slate-400">(để trống nếu không đổi)</span>
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-300 group-focus-within:text-primary transition-colors">
                    <Lock className="size-4.5" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`${fieldClass(!!editForm.formState.errors.password)} pr-12`}
                    placeholder="••••••••"
                    {...editForm.register("password")}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-primary"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {editForm.formState.errors.password && (
                  <p className="mt-1.5 text-xs text-red-500 font-bold">{editForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-4 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-4 px-6 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold transition-all shadow-glow-mint flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Cập nhật"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-5">
              {/* Username */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Tên đăng nhập <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-300 group-focus-within:text-primary transition-colors">
                    <User className="size-4.5" />
                  </span>
                  <input
                    className={fieldClass(!!createForm.formState.errors.username)}
                    placeholder="vd: nguyen_van_a"
                    {...createForm.register("username")}
                  />
                </div>
                {createForm.formState.errors.username && (
                  <p className="mt-1.5 text-xs text-red-500 font-bold">{createForm.formState.errors.username.message}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Email <span className="normal-case font-medium text-slate-400">(tùy chọn)</span>
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-300 group-focus-within:text-primary transition-colors">
                    <Mail className="size-4.5" />
                  </span>
                  <input
                    type="email"
                    className={fieldClass(!!createForm.formState.errors.email)}
                    placeholder="name@example.com"
                    {...createForm.register("email")}
                  />
                </div>
                {createForm.formState.errors.email && (
                  <p className="mt-1.5 text-xs text-red-500 font-bold">{createForm.formState.errors.email.message}</p>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Họ và tên</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-300 group-focus-within:text-primary transition-colors">
                    <User className="size-4.5" />
                  </span>
                  <input
                    className={fieldClass(!!createForm.formState.errors.fullName)}
                    placeholder="Nguyễn Văn A"
                    {...createForm.register("fullName")}
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Quyền hạn <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-300 group-focus-within:text-primary transition-colors">
                    <ShieldCheck className="size-4.5" />
                  </span>
                  <select
                    className={`${fieldClass(!!createForm.formState.errors.role)} cursor-pointer`}
                    {...createForm.register("role")}
                  >
                    <option value="LIMITED">Hạn chế (LIMITED)</option>
                    <option value="OWNER">Chủ sở hữu (OWNER)</option>
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                  Mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-300 group-focus-within:text-primary transition-colors">
                    <Lock className="size-4.5" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`${fieldClass(!!createForm.formState.errors.password)} pr-12`}
                    placeholder="Tối thiểu 8 ký tự, chữ hoa, số, ký tự đặc biệt"
                    {...createForm.register("password")}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-primary"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {createForm.formState.errors.password && (
                  <p className="mt-1.5 text-xs text-red-500 font-bold">{createForm.formState.errors.password.message}</p>
                )}
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-4 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-4 px-6 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold transition-all shadow-glow-mint flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Tạo tài khoản"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modalContent, document.body) : null;
}
