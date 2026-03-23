"use client";

import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, CheckCircle2, Edit2, Plus, RotateCcw, Trash2 } from "lucide-react";

import { getCategoriesAction } from "@/features/trading/actions/serviceCategoryActions";
import type { ServiceCategoryListItemDTO } from "@/features/trading/model/categoryTypes";
import { CategoryFormModal } from "@/features/trading/ui/CategoryFormModal";
import { CategoryDeleteModal } from "@/features/trading/ui/CategoryDeleteModal";

function listLoadErrorMessage(error: string, message?: string): string {
  if (error === "VALIDATION_ERROR") return message ?? "Tham số không hợp lệ.";
  if (error === "UNAUTHENTICATED") return "Bạn cần đăng nhập lại.";
  return "Không thể tải danh mục dịch vụ.";
}

export function CategoriesPageClient() {
  const [q, setQ] = useState("");
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | "ALL">("ALL");

  const [categories, setCategories] = useState<ServiceCategoryListItemDTO[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<ServiceCategoryListItemDTO | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ServiceCategoryListItemDTO | null>(null);

  function categoryMatchesCurrentFilters(c: ServiceCategoryListItemDTO): boolean {
    if (isActiveFilter !== "ALL" && c.isActive !== isActiveFilter) return false;
    const term = q.trim().toLowerCase();
    if (!term) return true;
    return c.name.toLowerCase().includes(term) || c.slug.toLowerCase().includes(term);
  }

  function mergeCreatedCategory(created: ServiceCategoryListItemDTO) {
    setCategories((prev) => {
      if (prev.some((x) => x.id === created.id)) return prev;
      const next = [...prev, created];
      next.sort((a, b) => a.sortOrder - b.sortOrder || b.id - a.id);
      return next;
    });
    setTotalCount((n) => n + 1);
  }

  async function reloadList() {
    setIsLoading(true);
    try {
      const res = await getCategoriesAction({
        limit: 200,
        search: q.trim() ? q.trim() : undefined,
        isActive: isActiveFilter,
      });
      if (!res.success) {
        toast.error(listLoadErrorMessage(res.error, res.message));
        return;
      }
      setCategories(res.items);
      setTotalCount(res.totalCount);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      void reloadList();
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, isActiveFilter]);

  const handleRefresh = () => void reloadList();

  const openCreate = () => {
    setFormMode("create");
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (c: ServiceCategoryListItemDTO) => {
    setFormMode("edit");
    setEditing(c);
    setFormOpen(true);
  };

  const openDelete = (c: ServiceCategoryListItemDTO) => {
    setDeleteTarget(c);
    setDeleteOpen(true);
  };

  const suggestedSortOrder = useMemo(() => {
    if (categories.length === 0) return 0;
    return Math.max(...categories.map((c) => c.sortOrder)) + 1;
  }, [categories]);

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shadow-card">
            <BookOpen className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-moss-900">Danh mục dịch vụ</h1>
            <p className="text-moss-500 text-sm">
              Mở rộng dễ dàng: thêm Spotify/Locket Gold… mà không cần thay đổi luồng cốt lõi.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="px-3 py-2 rounded-xl border border-moss-100 text-moss-600 hover:bg-moss-50 transition-colors"
            title="Làm mới"
            disabled={isLoading}
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
            disabled={isLoading}
          >
            <Plus className="size-4" />
            Thêm category
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-moss-100 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-moss-400">Đang hoạt động</p>
            <div className="text-3xl font-black text-moss-900 mt-2">{categories.filter((c) => c.isActive).length}</div>
          </div>
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <CheckCircle2 className="size-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-moss-100 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-moss-400">Tổng (theo lọc)</p>
            <div className="text-3xl font-black text-moss-900 mt-2">{totalCount}</div>
          </div>
          <div className="p-3 rounded-xl bg-sand/50 text-sand-700 border border-sand-100">
            <BookOpen className="size-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-moss-100 shadow-card flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-moss-400">Đã tắt</p>
            <div className="text-3xl font-black text-moss-900 mt-2">{categories.filter((c) => !c.isActive).length}</div>
          </div>
          <div className="p-3 rounded-xl bg-tertiary/10 text-tertiary border border-tertiary/20">
            <Trash2 className="size-6" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-moss-100 shadow-card p-4">
        <div className="flex items-center gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="flex-1 bg-moss-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
            placeholder="Search theo name hoặc slug..."
            disabled={isLoading}
          />
          <select
            value={isActiveFilter === "ALL" ? "ALL" : String(isActiveFilter)}
            onChange={(e) => {
              const v = e.target.value;
              setIsActiveFilter(v === "ALL" ? "ALL" : v === "true");
            }}
            className="w-56 bg-moss-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
            aria-label="Lọc theo trạng thái danh mục"
            disabled={isLoading}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Đã tắt</option>
          </select>
          <div className="text-xs font-bold uppercase tracking-widest text-moss-400 whitespace-nowrap">
            {isLoading ? "Đang tải..." : `${categories.length} / ${totalCount} kết quả`}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-moss-200 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-moss-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-lg font-bold">Danh mục dịch vụ</h3>
          <span className="text-sm text-moss-500">
            {isLoading ? "Đang tải dữ liệu..." : "Kết quả theo bộ lọc hiện tại"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tên</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Slug</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
                  Thứ tự
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-moss-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-moss-400">
                    <div className="text-slate-500 text-sm italic">Đang tải...</div>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-moss-400">
                    Chưa có danh mục phù hợp.
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id} className="hover:bg-moss-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{c.name}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-moss-500 font-mono">{c.slug}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold">
                        {c.sortOrder.toString().padStart(2, "0")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-[11px] font-bold border ${
                          c.isActive
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-tertiary/10 text-tertiary border-tertiary/20"
                        }`}
                      >
                        {c.isActive ? "Đang hoạt động" : "Đã tắt"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          className="p-2 hover:bg-moss-50 rounded-xl text-moss-500 hover:text-primary transition-colors"
                          title="Sửa"
                          disabled={isLoading}
                        >
                          <Edit2 className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(c)}
                          className="p-2 hover:bg-moss-50 rounded-xl text-moss-500 hover:text-tertiary transition-colors"
                          title="Xoá"
                          disabled={isLoading}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CategoryFormModal
        open={formOpen}
        mode={formMode}
        initial={editing}
        suggestedSortOrder={suggestedSortOrder}
        onClose={() => setFormOpen(false)}
        onSaved={(created) => {
          if (created && categoryMatchesCurrentFilters(created)) {
            mergeCreatedCategory(created);
          } else {
            void reloadList();
          }
        }}
      />

      <CategoryDeleteModal
        open={deleteOpen}
        categoryId={deleteTarget?.id ?? null}
        categoryName={deleteTarget?.name ?? ""}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onDeleted={() => void reloadList()}
      />
    </div>
  );
}
