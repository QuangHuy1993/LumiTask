"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { SubjectSchema, SubjectInput, SUBJECT_COLORS } from "@/features/admin-subjects/model/subjectSchema";
import { Check, X, Loader2, Sparkles } from "lucide-react";
import { createPortal } from "react-dom";

interface SubjectFormProps {
  show: boolean;
  onClose: () => void;
  onSubmit: (data: SubjectInput) => Promise<void>;
  initialData?: SubjectInput | null;
  isLoading?: boolean;
}

export function SubjectForm({ show, onClose, onSubmit, initialData, isLoading }: SubjectFormProps) {
  const { 
    register, 
    handleSubmit, 
    reset, 
    setValue, 
    watch,
    formState: { errors } 
  } = useForm<SubjectInput>({
    resolver: zodResolver(SubjectSchema),
    defaultValues: {
      name: "",
      code: "",
      color: "#3B82F6",
    }
  });

  const currentColor = watch("color");
  const currentName = watch("name");

  // Hàm tạo mã (slug) từ tên
  const handleAutoGenerateCode = () => {
    if (!currentName) return;
    
    const slug = currentName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Loại bỏ dấu tiếng Việt
      .replace(/[đĐ]/g, "d")
      .toUpperCase()
      .trim()
      .replace(/[^A-Z0-9]+/g, "-") // Thay thế ký tự đặc biệt bằng gạch ngang
      .replace(/^-+|-+$/g, "") // Xóa gạch ngang thừa ở đầu/cuối
      .slice(0, 10); // Giới hạn 10 ký tự theo Schema
      
    setValue("code", slug, { shouldValidate: true });
  };

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name,
        code: initialData.code || "",
        color: initialData.color || "#3B82F6",
      });
    } else if (show) {
      // Chọn màu ngẫu nhiên khi thêm mới
      const randomColor = SUBJECT_COLORS[Math.floor(Math.random() * SUBJECT_COLORS.length)].hex;
      reset({
        name: "",
        code: "",
        color: randomColor,
      });
    }
  }, [initialData, reset, show]);

  const handleFormSubmit = async (data: SubjectInput) => {
    await onSubmit(data);
    if (!initialData) reset();
  };

  if (!show) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative overflow-hidden transition-all duration-300 transform scale-100">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-moss-50 rounded-full transition-colors text-moss-400">
          <X className="size-6" />
        </button>

        <div className="p-8">
          <h3 className="text-2xl font-bold text-moss-900 mb-6 font-black uppercase tracking-tight">
            {initialData ? "Chỉnh sửa môn học" : "Thêm môn học mới"}
          </h3>
          
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2" htmlFor="name">
                Tên môn học <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                className={`block w-full px-4 py-4 bg-slate-50 border rounded-xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-400 font-medium ${
                  errors.name ? "border-red-500" : "border-slate-200"
                }`}
                placeholder="Ví dụ: Lập trình Java"
                {...register("name")}
              />
              {errors.name && <p className="mt-1.5 text-xs font-bold text-red-500">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-500 mb-2" htmlFor="code">
                Mã môn học (Tùy chọn)
              </label>
              <div className="relative group">
                <input
                  id="code"
                  className={`block w-full pl-4 pr-24 py-4 bg-slate-50 border rounded-xl text-slate-900 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all placeholder:text-slate-400 font-medium uppercase ${
                    errors.code ? "border-red-500" : "border-slate-200"
                  }`}
                  placeholder="Ví dụ: JAVA-101"
                  {...register("code")}
                />
                <button
                  type="button"
                  onClick={handleAutoGenerateCode}
                  disabled={!currentName}
                  className="absolute right-2 top-2 bottom-2 px-3 flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:text-primary hover:border-primary transition-all disabled:opacity-30 disabled:cursor-not-allowed group/btn"
                >
                  <Sparkles className="size-3 text-amber-400 group-hover/btn:animate-pulse" />
                  Tạo mã
                </button>
              </div>
              {errors.code && <p className="mt-1.5 text-xs font-bold text-red-500">{errors.code.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-500 mb-4">
                Chọn màu đại diện
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                {SUBJECT_COLORS.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => setValue("color", color.hex)}
                    className={`size-10 rounded-full border-2 shadow-sm flex items-center justify-center transition-all hover:scale-110 ${
                      currentColor === color.hex ? "border-primary scale-110" : "border-white"
                    }`}
                    style={{ backgroundColor: color.hex }}
                  >
                    {currentColor === color.hex && <Check className="size-5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 flex gap-3">
              <button 
                type="button"
                onClick={onClose} 
                className="flex-1 py-4 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all"
                disabled={isLoading}
              >
                Hủy
              </button>
              <button 
                 type="submit" 
                 disabled={isLoading}
                 className="flex-1 py-4 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-all shadow-glow-mint flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="size-5 animate-spin" /> : (initialData ? "Cập nhật" : "Lưu môn học")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(modalContent, document.body) : null;
}
