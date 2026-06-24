"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  Check,
} from "lucide-react";

import {
  listFinanceCategoriesAction,
  createFinanceCategoryAction,
  updateFinanceCategoryAction,
  deleteFinanceCategoryAction,
} from "@/features/expenses/actions/financeCategoryActions";
import type { FinanceCategoryListItemDTO } from "@/features/expenses/model/financeCategoryTypes";
import { displayNameToFinanceCategorySlug } from "@/features/expenses/utils/financeCategorySlug";

type FilterKind = "ALL" | "INCOME" | "EXPENSE";
type FilterActive = "ALL" | "true" | "false";

// ─── Delete Confirmation Modal ─────────────────────────────────────────────
function DeleteModal({
  category,
  onClose,
  onDeleted,
}: {
  category: FinanceCategoryListItemDTO;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const entryCount = category._count?.entries ?? 0;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await deleteFinanceCategoryAction(category.id);
      if (!res.success) {
        if (res.error === "NOT_FOUND") toast.error("Không tìm thấy danh mục.");
        else if (res.error === "UNAUTHENTICATED") toast.error("Bạn cần đăng nhập lại.");
        else toast.error("Không thể xóa danh mục.");
        return;
      }
      toast.success("Đã xóa danh mục.");
      onDeleted();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-moss-900/40 backdrop-blur-sm"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-card border border-outline-variant/10 overflow-hidden">
        <div className="flex items-center justify-between border-b border-moss-100 px-6 py-4">
          <h2 className="text-lg font-bold text-on-surface">Xóa danh mục</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-moss-500 hover:bg-moss-50"
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-on-surface">
            Bạn có chắc muốn xóa danh mục{" "}
            <span className="font-bold text-on-surface">&ldquo;{category.name}&rdquo;</span>?
          </p>

          {entryCount > 0 && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-sm text-amber-800">
                <span className="font-bold">Lưu ý:</span> Danh mục này đang được dùng trong{" "}
                <span className="font-bold">{entryCount}</span> khoản thu/chi. Xóa chỉ ẩn danh
                mục, dữ liệu cũ vẫn giữ nguyên.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-surface-container-low text-on-surface-variant rounded-xl text-sm font-bold hover:bg-surface-container transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="flex-1 py-3 bg-error text-white rounded-xl text-sm font-bold hover:brightness-95 disabled:opacity-50 transition-all"
          >
            {deleting ? "Đang xóa..." : "Xóa"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ─── Category Form Modal ───────────────────────────────────────────────────
function CategoryFormModal({
  open,
  mode,
  initial,
  suggestedSortOrder,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: "create" | "edit";
  initial: FinanceCategoryListItemDTO | null;
  suggestedSortOrder: number;
  onClose: () => void;
  onSaved: (created?: FinanceCategoryListItemDTO) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [kind, setKind] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [color, setColor] = useState("");
  const [icon, setIcon] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [slugManual, setSlugManual] = useState(false);

  const prevOpenRef = useRef(false);
  const hasEntries = (initial?._count?.entries ?? 0) > 0;
  const kindChangeDisabled = mode === "edit" && hasEntries;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      return;
    }

    if (mode === "edit" && initial) {
      setKind(initial.kind);
      setName(initial.name);
      setSlug(initial.slug);
      setColor(initial.color ?? "");
      setIcon(initial.icon ?? "");
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
        setKind("EXPENSE");
        setName("");
        setSlug("");
        setColor("");
        setIcon("");
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
      const payload = {
        kind,
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        color: color.trim() || undefined,
        icon: icon.trim() || undefined,
        sortOrder,
        isActive,
      };

      if (mode === "create") {
        const res = await createFinanceCategoryAction(payload);
        if (!res.success) {
          if (res.error === "DUPLICATE_SLUG") toast.error("Slug đã tồn tại. Hãy chọn slug khác.");
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
      const res = await updateFinanceCategoryAction(initial.id, payload);
      if (!res.success) {
        if (res.error === "DUPLICATE_SLUG") toast.error("Slug đã tồn tại. Hãy chọn slug khác.");
        else if (res.error === "KIND_CHANGE_BLOCKED")
          toast.error("Không thể đổi loại vì đã có dữ liệu gắn với danh mục này.");
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

  const ICON_OPTIONS = ["💰", "🎁", "📈", "🏪", "🍜", "🏠", "🚗", "💊", "🎮", "📚", "⚡", "🛒", "✈️", "🎵", "🏋️", "💻"];
  const COLOR_OPTIONS = [
    "#1DB954", "#47C77F", "#006e2d", "#F0C05A", "#FF6B6B",
    "#ae2f34", "#6c7d6b", "#7a5900", "#3b82f6", "#8b5cf6",
  ];

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-moss-900/40 backdrop-blur-sm"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-card border border-outline-variant/10">
        <div className="flex items-center justify-between border-b border-moss-100 px-6 py-4">
          <h2 className="text-lg font-bold text-on-surface">
            {mode === "create" ? "Thêm danh mục mới" : "Chỉnh sửa danh mục"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-moss-500 hover:bg-moss-50"
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5 p-6">
          {/* Kind */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
              Loại
              {kindChangeDisabled && (
                <span className="ml-2 font-normal normal-case text-amber-600">
                  — không thể đổi vì đã có dữ liệu
                </span>
              )}
            </label>
            <div className="flex gap-3">
              {(["INCOME", "EXPENSE"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  disabled={kindChangeDisabled}
                  onClick={() => setKind(k)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    kind === k
                      ? k === "INCOME"
                        ? "bg-primary text-white shadow-lg shadow-primary/20"
                        : "bg-tertiary text-white shadow-lg shadow-tertiary/20"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  {k === "INCOME" ? "Thu (INCOME)" : "Chi (EXPENSE)"}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
              Tên danh mục
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                const v = e.target.value;
                setName(v);
                if (mode === "create" && !slugManual) {
                  setSlug(displayNameToFinanceCategorySlug(v));
                }
              }}
              required
              minLength={2}
              maxLength={120}
              placeholder="VD: Lương tháng"
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
              Slug (duy nhất){" "}
              {mode === "create" && (
                <span className="font-normal normal-case text-on-surface-variant/60">
                  — tự theo tên; sửa ô này để tách khỏi tên
                </span>
              )}
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlugManual(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
              required
              pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
              title="Chữ thường, số và dấu -"
              placeholder="luong-thang"
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          {/* Color + Icon */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                Biểu tượng (emoji)
              </label>
              <div className="grid grid-cols-8 gap-1.5">
                {ICON_OPTIONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(icon === ic ? "" : ic)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-base transition-all ${
                      icon === ic ? "bg-primary/15 ring-2 ring-primary" : "hover:bg-surface-container"
                    }`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="hoặc nhập tùy ý"
                maxLength={50}
                className="mt-2 w-full bg-surface-container-low border-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                Màu sắc
              </label>
              <div className="grid grid-cols-5 gap-2">
                {COLOR_OPTIONS.map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setColor(color === col ? "" : col)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      color === col ? "border-moss-900 scale-110" : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="color"
                  value={color || "#1DB954"}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-9 rounded-lg border-none cursor-pointer"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#1DB954"
                  pattern="^#[0-9a-fA-F]{6}$"
                  maxLength={7}
                  className="flex-1 bg-surface-container-low border-none rounded-xl px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary/20 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Sort order + isActive */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                Thứ tự{" "}
                {mode === "create" && (
                  <span className="font-normal normal-case text-on-surface-variant/60">— gợi ý tự động</span>
                )}
              </label>
              <input
                type="number"
                min={0}
                max={9999}
                value={sortOrder}
                onChange={(e) => setSortOrder(Number.parseInt(e.target.value, 10) || 0)}
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
                Trạng thái
              </label>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "bg-surface-container-low text-on-surface-variant"
                }`}
              >
                {isActive ? <Check className="size-4" /> : <X className="size-4" />}
                {isActive ? "Đang hoạt động" : "Đã tắt"}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-surface-container-low text-on-surface-variant rounded-xl text-sm font-bold hover:bg-surface-container transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 disabled:opacity-50 transition-all"
            >
              {submitting ? "Đang lưu..." : mode === "create" ? "Thêm danh mục" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

// ─── Main Component ────────────────────────────────────────────────────────
export function FinanceCategoriesClient() {
  const [categories, setCategories] = useState<FinanceCategoryListItemDTO[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterKind, setFilterKind] = useState<FilterKind>("ALL");
  const [filterActive, setFilterActive] = useState<FilterActive>("ALL");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<FinanceCategoryListItemDTO | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<FinanceCategoryListItemDTO | null>(null);

  const PAGE_SIZE = 8;

  const loadCategories = useCallback(async (q: string, kind: FilterKind, active: FilterActive) => {
    setIsLoading(true);
    try {
      const res = await listFinanceCategoriesAction({
        limit: 200,
        search: q || undefined,
        kind: kind === "ALL" ? undefined : kind,
        isActive: active === "ALL" ? undefined : active === "true",
      });
      if (res.success) {
        setCategories(res.items);
        setTotalCount(res.totalCount);
      } else {
        if (res.error === "UNAUTHENTICATED") toast.error("Bạn cần đăng nhập lại.");
        else toast.error("Không thể tải danh mục.");
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce 250ms khi filter thay đổi
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      void loadCategories(search, filterKind, filterActive);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, filterKind, filterActive, loadCategories]);

  const suggestedSortOrder = useMemo(
    () => Math.max(-1, ...categories.map((c) => c.sortOrder)) + 1,
    [categories],
  );

  const paged = categories.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(categories.length / PAGE_SIZE));

  const incomeActiveCount = categories.filter((c) => c.kind === "INCOME" && c.isActive).length;
  const expenseActiveCount = categories.filter((c) => c.kind === "EXPENSE" && c.isActive).length;

  function openCreate() {
    setEditing(null);
    setFormMode("create");
    setFormOpen(true);
  }

  function openEdit(cat: FinanceCategoryListItemDTO) {
    setEditing(cat);
    setFormMode("edit");
    setFormOpen(true);
  }

  function handleSaved(created?: FinanceCategoryListItemDTO) {
    if (created) {
      // Prepend optimistically; reload sau để đồng bộ
      setCategories((prev) => [created, ...prev]);
      setTotalCount((n) => n + 1);
    }
    void loadCategories(search, filterKind, filterActive);
  }

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8">
      {/* Form Modal */}
      <CategoryFormModal
        open={formOpen}
        mode={formMode}
        initial={editing}
        suggestedSortOrder={suggestedSortOrder}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />

      {/* Delete Modal */}
      {deleteTarget && (
        <DeleteModal
          category={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => void loadCategories(search, filterKind, filterActive)}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-on-surface">Danh mục thu/chi</h1>
          <p className="text-on-surface-variant text-sm mt-0.5">Phân loại dòng tiền hiệu quả</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadCategories(search, filterKind, filterActive)}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-3 bg-surface-container-low text-on-surface-variant rounded-xl font-bold text-sm hover:bg-surface-container disabled:opacity-50 transition-all"
          >
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all"
          >
            <Plus className="size-4" />
            Thêm danh mục
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white p-3.5 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] shadow-card border border-white/40">
          <div className="flex items-start justify-between mb-4">
            <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="size-5" />
            </span>
            <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Hoạt động</span>
          </div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Danh mục thu</h3>
          <p className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
            {incomeActiveCount}{" "}
            <span className="text-sm font-medium text-on-surface-variant/40">loại</span>
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] shadow-card border border-white/40">
          <div className="flex items-start justify-between mb-4">
            <span className="p-2.5 rounded-xl bg-tertiary/10 text-tertiary">
              <TrendingDown className="size-5" />
            </span>
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-[0.2em]">Hoạt động</span>
          </div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Danh mục chi</h3>
          <p className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
            {expenseActiveCount}{" "}
            <span className="text-sm font-medium text-on-surface-variant/40">loại</span>
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] shadow-card border border-white/40 col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between mb-4">
            <span className="p-2.5 rounded-xl bg-[#7a5900]/10 text-[#7a5900]">
              <LayoutGrid className="size-5" />
            </span>
            <span className="text-[10px] font-bold text-[#7a5900] uppercase tracking-[0.2em]">Tổng thể</span>
          </div>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-1">Theo bộ lọc</h3>
          <p className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
            {totalCount}{" "}
            <span className="text-sm font-medium text-on-surface-variant/40">loại</span>
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-container-low p-2 rounded-2xl flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Search */}
        <div className="relative w-full lg:flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm danh mục..."
            className="w-full bg-white border-none rounded-xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
        </div>

        {/* Kind Toggle */}
        <div className="flex bg-surface-container-high p-1 rounded-xl w-full lg:w-auto overflow-x-auto no-scrollbar">
          {(["ALL", "INCOME", "EXPENSE"] as FilterKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilterKind(k)}
              className={`flex-1 lg:flex-none px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                filterKind === k
                  ? "bg-white shadow-sm text-on-surface"
                  : "text-on-surface-variant hover:bg-white/50"
              }`}
            >
              {k === "ALL" ? "Tất cả" : k === "INCOME" ? "Thu" : "Chi"}
            </button>
          ))}
        </div>

        {/* isActive select */}
        <select
          value={filterActive}
          onChange={(e) => setFilterActive(e.target.value as FilterActive)}
          className="bg-white border-none rounded-xl px-4 py-3 text-sm font-medium text-on-surface-variant focus:ring-2 focus:ring-primary/20 outline-none"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Đã tắt</option>
        </select>

        <span className="hidden lg:block text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest whitespace-nowrap px-2">
          {totalCount} kết quả
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] shadow-card overflow-hidden border border-outline-variant/10">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="size-8 text-primary/40 animate-spin mb-3" />
            <p className="text-sm text-on-surface-variant/60 font-medium">Đang tải...</p>
          </div>
        ) : paged.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-surface-container-low flex items-center justify-center mb-4 text-on-surface-variant/30">
              <LayoutGrid className="size-8" />
            </div>
            <p className="text-sm text-on-surface-variant/60 font-medium">Không tìm thấy danh mục nào</p>
            <button
              type="button"
              onClick={openCreate}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-sm font-bold hover:bg-primary/20 transition-colors"
            >
              <Plus className="size-4" />
              Thêm danh mục đầu tiên
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low/60">
                    {["Tên", "Slug", "Loại", "Màu", "Thứ tự", "Tổng tiền", "Trạng thái", "Thao tác"].map((h, i) => (
                      <th
                        key={h}
                        className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60 ${i === 7 ? "text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {paged.map((cat) => (
                    <tr key={cat.id} className="hover:bg-surface-container-low/30 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {cat.icon ? (
                            <span
                              className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
                              style={{ backgroundColor: cat.color ? `${cat.color}20` : undefined }}
                            >
                              {cat.icon}
                            </span>
                          ) : (
                            <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-surface-container-low text-on-surface-variant/30">
                              <LayoutGrid className="size-4" />
                            </span>
                          )}
                          <span className="font-bold text-on-surface">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-[10px] text-on-surface-variant/70">{cat.slug}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            cat.kind === "INCOME" ? "bg-primary/10 text-primary" : "bg-tertiary/10 text-tertiary"
                          }`}
                        >
                          {cat.kind === "INCOME" ? "Thu" : "Chi"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {cat.color ? (
                          <div
                            className="w-5 h-5 rounded-md border border-outline-variant/20"
                            style={{ backgroundColor: cat.color }}
                            title={cat.color}
                          />
                        ) : (
                          <span className="text-on-surface-variant/30 text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-medium text-on-surface-variant tabular-nums">
                        {String(cat.sortOrder).padStart(2, "0")}
                      </td>
                      <td className="px-6 py-4 font-bold text-on-surface tabular-nums text-xs">
                        {new Intl.NumberFormat("vi-VN").format(cat.totalAmount ?? 0)} đ
                      </td>
                      <td className="px-6 py-4">
                        <div
                          className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-tight ${
                            cat.isActive ? "text-primary" : "text-on-surface-variant/40"
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${cat.isActive ? "bg-primary animate-pulse" : "bg-on-surface-variant/30"}`}
                          />
                          {cat.isActive ? "Hoạt động" : "Đã tắt"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => openEdit(cat)}
                            className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(cat)}
                            className="p-2 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-xl transition-all"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="sm:hidden divide-y divide-outline-variant/10">
              {paged.map((cat) => (
                <div key={cat.id} className="p-3.5 active:bg-surface-container-low transition-colors flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: cat.color ? `${cat.color}20` : undefined }}
                    >
                      {cat.icon || "📁"}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-on-surface truncate">{cat.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest ${cat.kind === "INCOME" ? "text-primary" : "text-tertiary"}`}
                        >
                          {cat.kind === "INCOME" ? "Thu nhập" : "Chi tiêu"}
                        </span>
                        <span className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                          • {new Intl.NumberFormat("vi-VN").format(cat.totalAmount ?? 0)} đ
                        </span>
                        {!cat.isActive && (
                          <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
                            • Đã tắt
                          </span>
                        )}
                        {cat.color && (
                          <span
                            className="w-3 h-3 rounded-full border border-outline-variant/20"
                            style={{ backgroundColor: cat.color }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(cat)}
                      className="p-2 text-on-surface-variant hover:text-primary rounded-xl transition-all"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(cat)}
                      className="p-2 text-on-surface-variant hover:text-error rounded-xl transition-all"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="px-4 sm:px-6 py-4 bg-surface-container-low/30 border-t border-outline-variant/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">
                {categories.length === 0
                  ? "0 kết quả"
                  : `${Math.min((page - 1) * PAGE_SIZE + 1, categories.length)}–${Math.min(page * PAGE_SIZE, categories.length)} / ${categories.length}`}
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-2 bg-white rounded-xl text-xs font-bold text-on-surface-variant disabled:opacity-30 shadow-sm border border-outline-variant/5 flex items-center gap-1"
                >
                  <ChevronLeft className="size-3.5" />
                  Trước
                </button>
                <div className="flex gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .slice(Math.max(0, page - 2), page + 1)
                    .map((pg) => (
                      <button
                        key={pg}
                        type="button"
                        onClick={() => setPage(pg)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${
                          pg === page
                            ? "bg-primary text-white shadow-md shadow-primary/20"
                            : "bg-white text-on-surface-variant hover:bg-surface-container shadow-sm border border-outline-variant/5"
                        }`}
                      >
                        {pg}
                      </button>
                    ))}
                </div>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-2 bg-white rounded-xl text-xs font-bold text-on-surface-variant disabled:opacity-30 shadow-sm border border-outline-variant/5 flex items-center gap-1"
                >
                  Sau
                  <ChevronRight className="size-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
