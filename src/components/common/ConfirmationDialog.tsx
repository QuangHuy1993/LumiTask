"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Xác nhận",
  cancelText = "Hủy bỏ",
  variant = "danger",
  isLoading = false,
}: ConfirmationDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = "hidden";
    } else {
      const timer = setTimeout(() => setMounted(false), 300);
      document.body.style.overflow = "unset";
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!mounted && !isOpen) return null;

  const variantStyles = {
    danger: "bg-coral-500 hover:bg-coral-600 text-white shadow-coral-100",
    warning: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100",
    info: "bg-primary hover:bg-primary-hover text-white shadow-primary-100",
  };

  const iconStyles = {
    danger: "bg-coral-50 text-coral-500",
    warning: "bg-amber-50 text-amber-500",
    info: "bg-primary/10 text-primary",
  };

  const dialogContent = (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${
        isOpen ? "opacity-100 visible" : "opacity-0 invisible"
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        className={`bg-white w-full max-w-md rounded-[2.5rem] border border-moss-100 shadow-2xl relative overflow-hidden transition-all duration-300 ease-out transform ${
          isOpen ? "translate-y-0 scale-100" : "translate-y-8 scale-95"
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 text-moss-300 hover:text-moss-600 hover:bg-moss-50 rounded-full transition-all"
        >
          <X className="size-5" />
        </button>

        <div className="p-8 pt-10 flex flex-col items-center text-center">
          {/* Icon Wrapper */}
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 animate-in zoom-in-50 duration-500 ${iconStyles[variant]}`}
          >
            <AlertTriangle className="size-10" />
          </div>

          <h2 className="text-2xl font-bold text-moss-900 mb-3 tracking-tight">
            {title}
          </h2>
          <p className="text-moss-600 leading-relaxed mb-8 px-4">
            {description}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
            <button
              disabled={isLoading}
              onClick={onClose}
              className="flex-1 px-6 py-3.5 rounded-2xl border border-moss-200 text-moss-500 font-bold transition-all hover:bg-moss-50 active:scale-95 disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              disabled={isLoading}
              onClick={onConfirm}
              className={`flex-1 px-6 py-3.5 rounded-2xl font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 ${variantStyles[variant]}`}
            >
              {isLoading ? (
                <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                confirmText
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined"
    ? createPortal(dialogContent, document.body)
    : null;
}
