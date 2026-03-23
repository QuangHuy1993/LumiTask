"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Trash2, X } from "lucide-react";

import { deleteCategoryAction } from "@/features/trading/actions/serviceCategoryActions";

type CategoryDeleteModalProps = {
  open: boolean;
  categoryId: number | null;
  categoryName: string;
  onClose: () => void;
  onDeleted: () => void;
};

export function CategoryDeleteModal({ open, categoryId, categoryName, onClose, onDeleted }: CategoryDeleteModalProps) {
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !open || categoryId == null) return null;

  async function handleDelete() {
    if (categoryId == null) return;
    setSubmitting(true);
    try {
      const res = await deleteCategoryAction(categoryId);
      if (!res.success) {
        if (res.error === "NOT_FOUND") toast.error("Không tìm thấy danh mục.");
        else if (res.error === "UNAUTHENTICATED") toast.error("Bạn cần đăng nhập lại.");
        else toast.error("Không thể xoá danh mục.");
        return;
      }
      toast.success("Đã xoá danh mục.");
      onDeleted();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-moss-900/40 backdrop-blur-sm" aria-label="Đóng" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-moss-100 bg-white p-6 shadow-card">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-moss-900">Xoá danh mục?</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-moss-500 hover:bg-moss-50" aria-label="Đóng">
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-3 text-sm text-moss-600">
          Danh mục <span className="font-bold text-moss-900">{categoryName}</span> sẽ bị ẩn. Các subscription đang dùng vẫn giữ{" "}
          <span className="font-semibold">categoryId</span> — chỉ ẩn bản ghi danh mục.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-moss-200 px-4 py-2.5 text-sm font-bold text-moss-600 hover:bg-moss-50"
          >
            Huỷ
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-xl bg-tertiary px-4 py-2.5 text-sm font-bold text-white hover:brightness-110 disabled:opacity-60"
          >
            <Trash2 className="size-4" />
            {submitting ? "Đang xoá..." : "Xoá"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
