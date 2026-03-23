"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClientSchema, ClientInput } from "../model/clientSchema";
import { X, Loader2, User, Mail, Phone, MessageSquare, StickyNote } from "lucide-react";
import { createPortal } from "react-dom";

interface ClientFormProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: ClientInput) => Promise<void>;
  initialData?: ClientInput | null;
  isLoading?: boolean;
}

export function ClientForm({ show, onClose, onSubmit, initialData, isLoading }: ClientFormProps) {
  const { 
    register, 
    handleSubmit, 
    reset, 
    formState: { errors } 
  } = useForm<ClientInput>({
    resolver: zodResolver(ClientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      zalo: "",
      note: "",
    }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        email: initialData.email || "",
        phone: initialData.phone || "",
        zalo: initialData.zalo || "",
        note: initialData.note || "",
      });
    } else {
      reset({
        name: "",
        email: "",
        phone: "",
        zalo: "",
        note: "",
      });
    }
  }, [initialData, reset, show]);

  const handleFormSubmit = async (data: ClientInput) => {
    await onSubmit(data);
    if (!initialData) reset();
  };

  if (!show) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm shadow-2xl transition-opacity" onClick={onClose} />
      
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl relative overflow-hidden transition-all duration-300 transform scale-100 border border-slate-100">
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-primary to-emerald-400" />
        
        <button onClick={onClose} className="absolute top-8 right-8 p-2.5 hover:bg-slate-50 rounded-full transition-colors text-slate-400">
          <X className="size-6" />
        </button>

        <div className="p-10">
          <div className="mb-8">
            <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">
              {initialData ? "Cập nhật khách hàng" : "Thêm khách hàng mới"}
            </h3>
            <p className="text-slate-400 text-sm mt-1 font-bold uppercase tracking-widest">Thông tin đối tác & Hợp đồng</p>
          </div>
          
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tên khách hàng */}
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2" htmlFor="name">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-300 group-focus-within:text-primary transition-colors">
                    <User className="size-5" />
                  </span>
                  <input
                    id="name"
                    className={`block w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-2xl text-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 font-bold ${
                      errors.name ? "border-red-500" : "border-slate-100"
                    }`}
                    placeholder="Ví dụ: Nguyễn Văn A"
                    {...register("name")}
                  />
                </div>
                {errors.name && <p className="mt-1.5 text-xs font-bold text-red-500">{errors.name.message}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2" htmlFor="email">
                  Email
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-300 group-focus-within:text-primary transition-colors">
                    <Mail className="size-5" />
                  </span>
                  <input
                    id="email"
                    type="email"
                    className={`block w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-2xl text-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 font-bold ${
                      errors.email ? "border-red-500" : "border-slate-100"
                    }`}
                    placeholder="partner@company.com"
                    {...register("email")}
                  />
                </div>
                {errors.email && <p className="mt-1.5 text-xs font-bold text-red-500">{errors.email.message}</p>}
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2" htmlFor="phone">
                  Số điện thoại
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-300 group-focus-within:text-primary transition-colors">
                    <Phone className="size-5" />
                  </span>
                  <input
                    id="phone"
                    className={`block w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-2xl text-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 font-bold ${
                      errors.phone ? "border-red-500" : "border-slate-100"
                    }`}
                    placeholder="09xx xxx xxx"
                    {...register("phone")}
                  />
                </div>
              </div>

              {/* Zalo */}
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2" htmlFor="zalo">
                  Link Zalo / Username
                </label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-300 group-focus-within:text-primary transition-colors">
                    <MessageSquare className="size-5" />
                  </span>
                  <input
                    id="zalo"
                    className={`block w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-2xl text-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 font-bold border-slate-100`}
                    placeholder="zalo.me/username"
                    {...register("zalo")}
                  />
                </div>
              </div>

              {/* Ghi chú */}
              <div className="md:col-span-2">
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2" htmlFor="note">
                  Ghi chú đặc biệt
                </label>
                <div className="relative group">
                  <span className="absolute top-4 left-4 text-slate-300 group-focus-within:text-primary transition-colors">
                    <StickyNote className="size-5" />
                  </span>
                  <textarea
                    id="note"
                    rows={3}
                    className={`block w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-2xl text-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-300 font-bold border-slate-100 resize-none`}
                    placeholder="Đối tác quan trọng, ưu tiên xử lý nhanh..."
                    {...register("note")}
                  />
                </div>
              </div>
            </div>

            <div className="pt-8 flex gap-4">
              <button 
                type="button"
                onClick={onClose} 
                className="flex-1 py-5 px-6 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black uppercase tracking-widest text-xs transition-all transform active:scale-[0.98]"
                disabled={isLoading}
              >
                Hủy bỏ
              </button>
              <button 
                 type="submit" 
                 disabled={isLoading}
                 className="flex-[2] py-5 px-6 rounded-2xl bg-primary hover:bg-primary-hover text-white font-black uppercase tracking-widest text-xs transition-all shadow-glow-mint flex items-center justify-center gap-3 transform active:scale-[0.98]"
              >
                {isLoading ? <Loader2 className="size-5 animate-spin" /> : (initialData ? "Cập nhật ngay" : "Lưu khách hàng")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modalContent, document.body) : null;
}
