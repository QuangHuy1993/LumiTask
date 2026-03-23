"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Sparkles,
  Bell,
  ShieldAlert,
  RotateCcw,
  Edit2,
  Trash2,
} from "lucide-react";

import { RenewSubscriptionModal, type SubscriptionRenewDraft } from "@/features/trading/ui/RenewSubscriptionModal";
import { SubscriptionRowMediaIcon } from "@/features/trading/ui/SubscriptionRowMediaIcon";
import { SubscriptionFormModal } from "@/features/trading/ui/SubscriptionFormModal";
import { SubscriptionDeleteModal } from "@/features/trading/ui/SubscriptionDeleteModal";
import { getCategoriesAction } from "@/features/trading/actions/serviceCategoryActions";
import { getSubscriptionsAction } from "@/features/trading/actions/subscriptionActions";

import type { ServiceCategoryListItemDTO } from "@/features/trading/model/categoryTypes";
import type {
  SubscriptionListItemDTO,
  SubscriptionReminderStage,
  SubscriptionStatusFilter,
  SubscriptionUsageModeFilter,
} from "@/features/trading/model/subscriptionTypes";

function parseYMDToLocalMidnight(ymd: string): Date | null {
  const d = new Date(`${ymd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatYMDVi(ymd: string): string {
  const d = parseYMDToLocalMidnight(ymd);
  if (!d) return ymd;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
}

function stageLabel(stage: SubscriptionReminderStage | null): string {
  if (stage === "LEAD") return "Trước hạn";
  if (stage === "AFTER") return "Sau quá hạn";
  return "—";
}

const PAGE_SIZE = 25;

function stagePillClass(usageMode: SubscriptionListItemDTO["usageMode"], stage: SubscriptionReminderStage | null): string {
  if (usageMode === "RESELL") return "bg-primary/10 text-primary border border-primary/20";
  if (stage === "LEAD") return "bg-sand/50 text-sand-700 border border-sand-100";
  if (stage === "AFTER") return "bg-mint-50 text-mint-700 border border-mint-100";
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

export function SubscriptionsPageClient() {
  const router = useRouter();
  const [q, setQ] = useState("");

  const [renewOpen, setRenewOpen] = useState(false);
  const [renewDraft, setRenewDraft] = useState<SubscriptionRenewDraft | null>(null);

  const [categories, setCategories] = useState<ServiceCategoryListItemDTO[]>([]);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [usageModeFilter, setUsageModeFilter] = useState<SubscriptionUsageModeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatusFilter>("UPCOMING");
  const [activeOnly, setActiveOnly] = useState(true);

  const [items, setItems] = useState<SubscriptionListItemDTO[]>([]);
  const [listTotalCount, setListTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({ activeCount: 0, expiringSoonCount: 0, buyerReminderCount: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<SubscriptionListItemDTO | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SubscriptionListItemDTO | null>(null);

  const activeCount = stats.activeCount;
  const expiringSoonCount = stats.expiringSoonCount;
  const totalPages = Math.max(1, Math.ceil(listTotalCount / PAGE_SIZE));

  async function loadCategories() {
    const res = await getCategoriesAction({ limit: 200, isActive: "ALL" });
    if (!res.success) return;
    setCategories(res.items);
  }

  async function reloadList() {
    setIsLoading(true);
    try {
      const res = await getSubscriptionsAction({
        limit: PAGE_SIZE,
        page,
        search: q.trim() ? q.trim() : undefined,
        categoryId: categoryId ?? undefined,
        usageMode: usageModeFilter,
        status: statusFilter,
        activeOnly,
      });
      if (!res.success) {
        toast.error(typeof res.error === "string" ? res.error : "Không thể tải subscriptions");
        return;
      }
      setItems(res.data.items);
      setListTotalCount(res.data.totalCount);
      setStats(res.data.stats);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
    void reloadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q, categoryId, usageModeFilter, statusFilter, activeOnly]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void reloadList();
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, categoryId, usageModeFilter, statusFilter, activeOnly, page]);

  const handleRefresh = () => void reloadList();

  const openCreate = () => {
    setFormMode("create");
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: SubscriptionListItemDTO) => {
    setFormMode("edit");
    setEditing(row);
    setFormOpen(true);
  };

  const openDelete = (row: SubscriptionListItemDTO) => {
    setDeleteTarget(row);
    setDeleteOpen(true);
  };

  const openRenewFor = (row: SubscriptionListItemDTO) => {
    setRenewDraft({
      id: row.id,
      title: row.title,
      categoryName: row.categoryName,
      usageMode: row.usageMode,
      contactName: row.contactName,
      contactEmail: row.contactEmail,
      renewalOrExpiryAtISO: row.renewalOrExpiryAtISO,
      remindDaysBefore: row.remindDaysBefore,
      remindAfterExpiryDays: row.remindAfterExpiryDays,
        purchasePrice: row.usageMode === "RESELL" ? row.purchasePriceRaw ?? null : null,
        salePrice: row.usageMode === "RESELL" ? row.salePriceRaw ?? null : null,
      currency: "₫",
      youtubeAccountEmail: row.youtubeAccountEmail ?? null,
      netflixAccountEmail: row.netflixAccountEmail ?? null,
      netflixAccountPassword: row.netflixAccountPassword ?? null,
    });
    setRenewOpen(true);
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-6">
      {/* Title + CTA */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shadow-card">
            <ShoppingCart className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-moss-900">Dịch vụ & nhắc hạn</h1>
            <p className="text-moss-500 text-sm">Quản lý subscriptions và lịch gia hạn theo chu kỳ.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/trading/subscriptions/manual-approval"
            className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 inline-flex items-center gap-2"
          >
            <ClipboardCheck className="size-4" />
            Duyệt gửi email
          </Link>
          <Link
            href="/trading/subscriptions/email-preview"
            className="rounded-xl border border-moss-100 px-3 py-2 text-sm font-semibold text-moss-700 transition-colors hover:bg-moss-50"
          >
            Preview email
          </Link>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isLoading}
            className="px-3 py-2 rounded-xl border border-moss-100 text-moss-600 hover:bg-moss-50 transition-colors"
            title="Làm mới"
          >
            <RefreshCw className="size-4" />
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
          >
            <Plus className="size-4" />
            Thêm dịch vụ
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-moss-100 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-moss-400">Đang bật</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-moss-900">{activeCount}</div>
          <div className="mt-1 text-sm text-moss-500">Đang bật nhắc</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-moss-100 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-moss-400">Sắp hết hạn</span>
            <div className="p-2 rounded-xl bg-tertiary/10 text-tertiary">
              <Bell className="size-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-moss-900">{expiringSoonCount}</div>
          <div className="mt-1 text-sm text-moss-500">Trong 7 ngày</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-moss-100 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-moss-400">2 giai đoạn</span>
            <div className="p-2 rounded-xl bg-sand/50 text-sand-700 border border-sand-100">
              <Calendar className="size-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-moss-900">Trước hạn + Sau quá hạn</div>
          <div className="mt-1 text-sm text-moss-500">Trước hạn + Bù sau quá hạn</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-moss-100 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-moss-400">Nhắc cho buyer</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ShieldAlert className="size-4" />
            </div>
          </div>
          <div className="mt-3 text-3xl font-black text-moss-900">{stats.buyerReminderCount}</div>
          <div className="mt-1 text-sm text-moss-500">Bán lại (có email người mua)</div>
        </div>
      </div>

      {/* Filter */}
      <div className="rounded-2xl border border-moss-100 bg-white p-4 shadow-card">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-moss-400">Bộ lọc danh sách</p>
          <div className="text-xs font-bold uppercase tracking-widest text-moss-400">
            Trang {page}/{totalPages} · {listTotalCount} bản ghi
          </div>
        </div>

        <div className="grid grid-cols-1 items-center gap-3 lg:grid-cols-12">
          <div className="relative lg:col-span-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-moss-400 size-5" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border border-moss-100 bg-moss-50/50 py-2.5 pr-4 pl-10 text-sm text-moss-700 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
              placeholder="Tìm theo tên dịch vụ hoặc category..."
            />
          </div>

          <div className="lg:col-span-2">
            <select
              value={categoryId ?? "ALL"}
              onChange={(e) => setCategoryId(e.target.value === "ALL" ? null : Number(e.target.value))}
              className="w-full rounded-xl border border-moss-100 bg-moss-50/50 px-4 py-2.5 text-sm text-moss-700 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
              aria-label="Lọc theo category"
            >
              <option value="ALL">Tất cả category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={usageModeFilter}
              onChange={(e) => setUsageModeFilter(e.target.value as SubscriptionUsageModeFilter)}
              className="w-full rounded-xl border border-moss-100 bg-moss-50/50 px-4 py-2.5 text-sm text-moss-700 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
              aria-label="Lọc theo kiểu sử dụng"
            >
              <option value="ALL">Tất cả kiểu</option>
              <option value="PERSONAL_FAMILY">Cá nhân / gia đình</option>
              <option value="RESELL">Bán lại</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SubscriptionStatusFilter)}
              className="w-full rounded-xl border border-moss-100 bg-moss-50/50 px-4 py-2.5 text-sm text-moss-700 outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
              aria-label="Lọc theo trạng thái"
            >
              <option value="UPCOMING">Sắp đến hạn</option>
              <option value="OVERDUE">Quá hạn</option>
              <option value="ALL">Tất cả</option>
            </select>
          </div>

          <label className="lg:col-span-2 flex cursor-pointer items-center gap-2 rounded-xl border border-moss-100 bg-moss-50/50 px-4 py-2.5 text-sm font-semibold text-moss-700">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => setActiveOnly(e.target.checked)}
              className="size-4 rounded border-moss-300 text-primary focus:ring-primary/20"
            />
            Chỉ đang bật
          </label>

          <div className="hidden lg:block lg:col-span-1" />
        </div>
      </div>

      {/* Table: Sắp đến hạn */}
      <div className="bg-white rounded-2xl border border-moss-100 shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-moss-100 flex items-center justify-between">
          <h3 className="text-lg font-bold">
            {statusFilter === "UPCOMING" ? "Sắp đến hạn" : statusFilter === "OVERDUE" ? "Quá hạn" : "Tất cả"}
          </h3>
          {isLoading ? <div className="text-sm font-semibold text-moss-500">Đang tải...</div> : <div />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dịch vụ</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Danh mục</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ngày gia hạn</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Nhắc tiếp theo</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Giá</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                    Chưa có subscription phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const renewalText = formatYMDVi(row.renewalOrExpiryAtISO);
                  const nextDateText = row.nextReminderAtISO ? formatYMDVi(row.nextReminderAtISO) : "—";
                  const pill = stagePillClass(row.usageMode, row.nextReminderStage);
                  const stageText = stageLabel(row.nextReminderStage);

                  return (
                    <tr
                      key={row.id}
                      className="cursor-pointer transition-colors hover:bg-slate-50/50"
                      onClick={() => router.push(`/trading/subscriptions/${row.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <SubscriptionRowMediaIcon
                            categoryName={row.categoryName}
                            title={row.title}
                            youtubeAccountEmail={row.youtubeAccountEmail}
                            netflixAccountEmail={row.netflixAccountEmail}
                            netflixAccountPassword={row.netflixAccountPassword}
                          />
                          <div>
                            <Link
                              href={`/trading/subscriptions/${row.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-bold text-slate-900 hover:text-primary transition-colors"
                            >
                              {row.title}
                            </Link>
                            <div className="text-xs text-slate-400 font-medium mt-0.5">
                              {row.usageMode === "RESELL" ? `Người mua: ${row.contactName ?? "—"}` : "Cá nhân/Gia đình"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {row.categoryName}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">{renewalText}</div>
                        <div className="text-xs text-slate-400">
                          Trước hạn: {row.remindDaysBefore} ngày • Sau quá hạn: {row.remindAfterExpiryDays} ngày
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${pill}`}>
                            {stageText}
                          </span>
                          <span className="text-xs text-slate-400 mt-1">{nextDateText}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-bold text-slate-900">
                            {row.usageMode === "RESELL" ? `Giá mua: ${row.purchasePriceRaw ?? "—"}₫` : "—"}
                          </span>
                          <span className="text-xs text-slate-500">
                            {row.usageMode === "RESELL" ? `Giá bán: ${row.salePriceRaw ?? "—"}₫` : "Cá nhân"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openRenewFor(row);
                            }}
                            className="px-3 py-2 rounded-xl bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
                          >
                            Gia hạn
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(row);
                            }}
                            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors"
                            title="Sửa"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDelete(row);
                            }}
                            className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-tertiary hover:bg-tertiary/5 transition-colors"
                            title="Xoá"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            Hiển thị {items.length}/{listTotalCount} bản ghi trên trang (tối đa {PAGE_SIZE} / trang).
          </p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={isLoading || page <= 1}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
              Trước
            </button>
            <span className="text-xs font-bold text-slate-500 px-1">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={isLoading || page >= totalPages}
              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-white disabled:opacity-40"
            >
              Sau
              <ChevronRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => void reloadList()}
              disabled={isLoading}
              className="px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:text-primary hover:bg-white transition-colors disabled:opacity-60"
              title="Làm mới trang này"
            >
              <RotateCcw className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <RenewSubscriptionModal
        open={renewOpen}
        onClose={() => setRenewOpen(false)}
        draft={renewDraft}
        onUpdated={() => {
          toast.success("Đã cập nhật lịch gia hạn.");
          void reloadList();
        }}
      />

      <SubscriptionFormModal
        open={formOpen}
        mode={formMode}
        initial={editing}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSaved={() => void reloadList()}
      />

      <SubscriptionDeleteModal
        open={deleteOpen}
        subscriptionId={deleteTarget?.id ?? null}
        title={deleteTarget?.title ?? ""}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onDeleted={() => void reloadList()}
      />
    </div>
  );
}

