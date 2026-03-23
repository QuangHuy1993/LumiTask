"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Save, X } from "lucide-react";

import { createCategoryAction, updateCategoryAction } from "@/features/trading/actions/serviceCategoryActions";
import type { ServiceCategoryListItemDTO } from "@/features/trading/model/categoryTypes";
import { displayNameToCategorySlug } from "@/features/trading/utils/displayNameToCategorySlug";

type Mode = "create" | "edit";

type CategoryFormModalProps = {
  open: boolean;
  mode: Mode;
  initial: ServiceCategoryListItemDTO | null;
  /** Khi tạo mới: thứ tự gợi ý = max(sortOrder) hiện có + 1 (từ danh sách đang tải). */
  suggestedSortOrder?: number;
  onClose: () => void;
  /** Khi tạo mới thành công, truyền DTO một dòng để parent có thể prepend (bớt refetch). */
  onSaved: (created?: ServiceCategoryListItemDTO) => void;
};

export function CategoryFormModal({
  open,
  mode,
  initial,
  suggestedSortOrder = 0,
  onClose,
  onSaved,
}: CategoryFormModalProps) {
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  /** Chỉ dùng khi create: user đã sửa slug tay thì không ghi đè theo tên nữa. */
  const [slugManual, setSlugManual] = useState(false);

  const prevOpenRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      return;
    }

    if (mode === "edit" && initial) {
      setName(initial.name);
      setSlug(initial.slug);
      setSortOrder(initial.sortOrder);
      setIsActive(initial.isActive);
      setSlugManual(false);
      prevOpenRef.current = true;
      return;
    }

    if (mode === "create") {
      const justOpened = !prevOpenRef.current;
      prevOpenRef.current = true;
      if (justOpened) {
        setName("");
        setSlug("");
        setSortOrder(suggestedSortOrder);
        setIsActive(true);
        setSlugManual(false);
      }
    }
  }, [open, mode, initial, suggestedSortOrder]);

  if (!mounted || !open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "create") {
        const res = await createCategoryAction({
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          sortOrder,
          isActive,
        });
        if (!res.success) {
          if (res.error === "DUPLICATE_SLUG") toast.error("Slug đã tồn tại. Chọn slug khác.");
          else if (res.error === "VALIDATION_ERROR") toast.error("Dữ liệu không hợp lệ.");
          else if (res.error === "UNAUTHENTICATED") toast.error("Bạn cần đăng nhập lại.");
          else toast.error("Không thể tạo danh mục.");
          return;
        }
        toast.success("Đã thêm danh mục.");
        onSaved(res.item);
        onClose();
        return;
      }

      if (!initial) return;
      const res = await updateCategoryAction(initial.id, {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        sortOrder,
        isActive,
      });
      if (!res.success) {
        if (res.error === "DUPLICATE_SLUG") toast.error("Slug đã tồn tại. Chọn slug khác.");
        else if (res.error === "NOT_FOUND") toast.error("Không tìm thấy danh mục.");
        else if (res.error === "VALIDATION_ERROR") toast.error("Dữ liệu không hợp lệ.");
        else if (res.error === "UNAUTHENTICATED") toast.error("Bạn cần đăng nhập lại.");
        else toast.error("Không thể cập nhật danh mục.");
        return;
      }
      toast.success("Đã cập nhật danh mục.");
      onSaved();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-moss-900/40 backdrop-blur-sm" aria-label="Đóng" onClick={onClose} />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-moss-100 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-moss-100 px-6 py-4">
          <h2 className="text-lg font-bold text-moss-900">{mode === "create" ? "Thêm danh mục" : "Sửa danh mục"}</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-moss-500 hover:bg-moss-50" aria-label="Đóng">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-moss-500 mb-1">Tên hiển thị</label>
            <input
              value={name}
              onChange={(e) => {
                const v = e.target.value;
                setName(v);
                if (mode === "create" && !slugManual) {
                  setSlug(displayNameToCategorySlug(v));
                }
              }}
              required
              minLength={2}
              maxLength={120}
              className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-moss-500 mb-1">
              Slug (duy nhất)
              {mode === "create" ? (
                <span className="ml-2 font-normal normal-case text-moss-400">— tự theo tên; sửa ô này để tách khỏi tên</span>
              ) : null}
            </label>
            <input
              value={slug}
              onChange={(e) => {
                setSlugManual(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              required
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              title="Chữ thường, số và dấu -"
              className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm font-mono focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-moss-500 mb-1">
              Thứ tự sắp xếp
              {mode === "create" ? (
                <span className="ml-2 font-normal normal-case text-moss-400">— gợi ý tự động</span>
              ) : null}
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number.parseInt(e.target.value, 10) || 0)}
              min={0}
              max={1000}
              className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-moss-700 cursor-pointer">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Đang hoạt động
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-moss-200 px-4 py-2.5 text-sm font-bold text-moss-600 hover:bg-moss-50"
            >
              Huỷ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:brightness-110 disabled:opacity-60"
            >
              <Save className="size-4" />
              {submitting ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
