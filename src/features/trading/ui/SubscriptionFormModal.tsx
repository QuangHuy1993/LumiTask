"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Save, UserPlus, X } from "lucide-react";

import { createSubscriptionAction, updateSubscriptionAction } from "@/features/trading/actions/subscriptionActions";
import { getContactsAction } from "@/features/trading/actions/contactActions";
import { ContactFormModal } from "@/features/trading/ui/ContactFormModal";
import type { ServiceCategoryListItemDTO } from "@/features/trading/model/categoryTypes";
import type { SaleContactListItemDTO } from "@/features/trading/model/contactTypes";
import type { SubscriptionDetailDTO, SubscriptionListItemDTO } from "@/features/trading/model/subscriptionTypes";
import {
  clampReminderDaysOnBlur,
  parseReminderDaysForSubmit,
  sanitizeReminderDaysDraft,
} from "@/features/trading/utils/reminderDayInputs";

type Mode = "create" | "edit";

type SubscriptionFormModalProps = {
  open: boolean;
  mode: Mode;
  /** Edit: pass list row or detail DTO */
  initial: SubscriptionListItemDTO | SubscriptionDetailDTO | null;
  categories: ServiceCategoryListItemDTO[];
  onClose: () => void;
  onSaved: () => void;
};

function sanitizeMoneyInput(prev: string, nextRaw: string): string {
  const digits = nextRaw.replace(/[^\d]/g, "");
  if (!digits) return "0";
  let normalized = prev === "0" ? digits : digits;
  normalized = normalized.replace(/^0+(\d)/, "$1");
  return normalized || "0";
}

function listToDraft(row: SubscriptionListItemDTO): FormState {
  return {
    title: row.title,
    categoryId: row.categoryId,
    usageMode: row.usageMode,
    contactId: row.contactId,
    purchaseStartAt: row.purchaseStartAtISO ?? "",
    renewalOrExpiryAt: row.renewalOrExpiryAtISO,
    remindDaysBefore: String(row.remindDaysBefore),
    remindAfterExpiryDays: String(row.remindAfterExpiryDays),
    purchasePrice: row.purchasePriceRaw && row.purchasePriceRaw !== "" ? row.purchasePriceRaw : "0",
    salePrice: row.salePriceRaw && row.salePriceRaw !== "" ? row.salePriceRaw : "0",
    currency: row.currency || "VND",
    notes: row.notes ?? "",
    youtubeAccountEmail: row.youtubeAccountEmail ?? "",
    netflixAccountEmail: row.netflixAccountEmail ?? "",
    netflixAccountPassword: row.netflixAccountPassword ?? "",
  };
}

function detailToDraft(d: SubscriptionDetailDTO): FormState {
  return {
    title: d.title,
    categoryId: d.categoryId,
    usageMode: d.usageMode,
    contactId: d.contactId,
    purchaseStartAt: d.purchaseStartAtISO ?? "",
    renewalOrExpiryAt: d.renewalOrExpiryAtISO,
    remindDaysBefore: String(d.remindDaysBefore),
    remindAfterExpiryDays: String(d.remindAfterExpiryDays),
    purchasePrice: d.purchasePriceRaw && d.purchasePriceRaw !== "" ? d.purchasePriceRaw : "0",
    salePrice: d.salePriceRaw && d.salePriceRaw !== "" ? d.salePriceRaw : "0",
    currency: d.currency || "VND",
    notes: d.notes ?? "",
    youtubeAccountEmail: d.youtubeAccountEmail ?? "",
    netflixAccountEmail: d.netflixAccountEmail ?? "",
    netflixAccountPassword: d.netflixAccountPassword ?? "",
  };
}

type FormState = {
  title: string;
  categoryId: number;
  usageMode: "PERSONAL_FAMILY" | "RESELL";
  contactId: number | null;
  purchaseStartAt: string;
  renewalOrExpiryAt: string;
  /** Chuỗi để người dùng có thể xóa ô rồi gõ lại (không ép `|| 0` khi đang nhập). */
  remindDaysBefore: string;
  remindAfterExpiryDays: string;
  purchasePrice: string;
  salePrice: string;
  currency: string;
  notes: string;
  youtubeAccountEmail: string;
  netflixAccountEmail: string;
  netflixAccountPassword: string;
};

const emptyCreate: FormState = {
  title: "",
  categoryId: 0,
  usageMode: "PERSONAL_FAMILY",
  contactId: null,
  purchaseStartAt: "",
  renewalOrExpiryAt: "",
  remindDaysBefore: "7",
  remindAfterExpiryDays: "3",
  purchasePrice: "0",
  salePrice: "0",
  currency: "VND",
  notes: "",
  youtubeAccountEmail: "",
  netflixAccountEmail: "",
  netflixAccountPassword: "",
};

function mapSubscriptionError(error: string): string {
  switch (error) {
    case "UNAUTHENTICATED":
      return "Bạn cần đăng nhập lại.";
    case "VALIDATION_ERROR":
      return "Dữ liệu không hợp lệ.";
    case "CATEGORY_NOT_FOUND":
      return "Danh mục không tồn tại hoặc đã tắt.";
    case "CONTACT_REQUIRED":
      return "Chế độ bán lại cần chọn liên hệ.";
    case "CONTACT_NOT_FOUND":
      return "Không tìm thấy liên hệ.";
    case "NOT_FOUND":
      return "Không tìm thấy subscription.";
    case "DB_ERROR":
      return "Không thể lưu dịch vụ. Kiểm tra dữ liệu (liên hệ / giá khi bán lại) hoặc thử lại sau.";
    default:
      return "Không thể lưu. Thử lại sau.";
  }
}

export function SubscriptionFormModal({ open, mode, initial, categories, onClose, onSaved }: SubscriptionFormModalProps) {
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [contacts, setContacts] = useState<SaleContactListItemDTO[]>([]);
  const [contactFormOpen, setContactFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyCreate);

  const reloadContacts = useCallback(async (selectId?: number) => {
    const res = await getContactsAction({ limit: 200, status: "ALL", contactMethod: "ALL" });
    if (!res.success) return;
    setContacts(res.items);
    if (selectId != null) {
      setForm((f) => ({ ...f, contactId: selectId }));
    }
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    void reloadContacts();
  }, [open, reloadContacts]);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      if ("createdAtISO" in initial) {
        setForm(detailToDraft(initial));
      } else {
        setForm(listToDraft(initial));
      }
      return;
    }
    setForm({
      ...emptyCreate,
      categoryId: categories[0]?.id ?? 0,
      renewalOrExpiryAt: new Date().toISOString().slice(0, 10),
      purchaseStartAt: new Date().toISOString().slice(0, 10),
    });
  }, [open, mode, initial, categories]);

  const categoryOptions = useMemo(() => {
    const active = categories.filter((c) => c.isActive);
    if (mode === "edit" && form.categoryId > 0) {
      const current = categories.find((c) => c.id === form.categoryId);
      if (current && !current.isActive && !active.some((c) => c.id === current.id)) {
        return [...active, current];
      }
    }
    return active;
  }, [categories, mode, form.categoryId]);

  const effectiveCategoryId = form.categoryId || categoryOptions[0]?.id || 0;

  if (!mounted || !open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.renewalOrExpiryAt.match(/^\d{4}-\d{2}-\d{2}$/)) {
      toast.error("Ngày không hợp lệ (YYYY-MM-DD).");
      return;
    }

    const remindDaysBefore = parseReminderDaysForSubmit(form.remindDaysBefore, "Nhắc trước");
    if (remindDaysBefore === null) return;
    const remindAfterExpiryDays = parseReminderDaysForSubmit(form.remindAfterExpiryDays, "Nhắc sau quá hạn");
    if (remindAfterExpiryDays === null) return;

    if (form.usageMode === "RESELL") {
      if (!form.contactId) {
        toast.error("Chọn liên hệ (người mua) cho chế độ bán lại.");
        return;
      }
      if (form.purchasePrice === "0" || form.salePrice === "0") {
        toast.error("Nhập giá mua và giá bán (khác 0) cho bán lại.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const basePayload = {
        title: form.title.trim(),
        categoryId: effectiveCategoryId,
        usageMode: form.usageMode,
        contactId: form.usageMode === "RESELL" ? form.contactId : null,
        purchaseStartAt: form.purchaseStartAt.trim() || undefined,
        renewalOrExpiryAt: form.renewalOrExpiryAt,
        remindDaysBefore,
        remindAfterExpiryDays,
        purchasePrice: form.usageMode === "RESELL" ? form.purchasePrice : "",
        salePrice: form.usageMode === "RESELL" ? form.salePrice : "",
        currency: form.currency.trim() || "VND",
        notes: form.notes.trim() || "",
        youtubeAccountEmail: form.youtubeAccountEmail.trim() || "",
        netflixAccountEmail: form.netflixAccountEmail.trim() || "",
        netflixAccountPassword: form.netflixAccountPassword.trim() || "",
      };

      if (mode === "create") {
        const res = await createSubscriptionAction(basePayload);
        if (!res.success) {
          toast.error(mapSubscriptionError(res.error));
          return;
        }
        toast.success("Đã tạo dịch vụ.");
        onSaved();
        onClose();
        return;
      }

      if (!initial) {
        toast.error("Thiếu dữ liệu subscription.");
        return;
      }

      const res = await updateSubscriptionAction(initial.id, basePayload);
      if (!res.success) {
        toast.error(mapSubscriptionError(res.error));
        return;
      }
      toast.success("Đã cập nhật dịch vụ.");
      onSaved();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-moss-900/40 backdrop-blur-sm" aria-label="Đóng" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-2xl border border-moss-100 bg-white shadow-card">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-moss-100 bg-white px-6 py-4">
          <h2 className="text-lg font-bold text-moss-900">{mode === "create" ? "Thêm dịch vụ" : "Sửa dịch vụ"}</h2>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-moss-500 hover:bg-moss-50" aria-label="Đóng">
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-moss-500">
                Tên gói / tài khoản
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
                minLength={2}
                maxLength={160}
                placeholder="VD: Netflix gia đình, 4G Viettel 150GB"
                className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-moss-500">Danh mục</label>
              <select
                value={effectiveCategoryId || ""}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: Number(e.target.value) }))}
                required
                className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
              >
                {categoryOptions.length === 0 ? <option value="">Chưa có danh mục hoạt động</option> : null}
                {categoryOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-moss-500">Kiểu sử dụng</label>
              <select
                value={form.usageMode}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    usageMode: e.target.value as "PERSONAL_FAMILY" | "RESELL",
                    contactId: e.target.value === "PERSONAL_FAMILY" ? null : f.contactId,
                  }))
                }
                className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
              >
                <option value="PERSONAL_FAMILY">Cá nhân / gia đình</option>
                <option value="RESELL">Bán lại</option>
              </select>
            </div>

            {form.usageMode === "RESELL" ? (
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-moss-500">
                  Liên hệ (người mua)
                </label>
                <div className="flex gap-2">
                  <select
                    value={form.contactId ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value ? Number(e.target.value) : null }))}
                    required
                    className="min-w-0 flex-1 rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
                  >
                    <option value="">— Chọn —</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setContactFormOpen(true)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-xs font-bold text-primary hover:bg-primary/10"
                    title="Thêm liên hệ mới"
                  >
                    <UserPlus className="size-4" aria-hidden />
                    Thêm mới
                  </button>
                </div>
              </div>
            ) : null}

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-moss-500">Ngày mua</label>
              <input
                type="date"
                value={form.purchaseStartAt}
                onChange={(e) => setForm((f) => ({ ...f, purchaseStartAt: e.target.value }))}
                required
                className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-moss-500">
                Ngày gia hạn / hết hạn kế tiếp
              </label>
              <input
                type="date"
                value={form.renewalOrExpiryAt}
                onChange={(e) => setForm((f) => ({ ...f, renewalOrExpiryAt: e.target.value }))}
                required
                className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-moss-500">Tiền tệ</label>
              <input
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                maxLength={10}
                className="w-full max-w-[12rem] rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-moss-500">Nhắc trước (ngày)</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={form.remindDaysBefore}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remindDaysBefore: sanitizeReminderDaysDraft(e.target.value) }))
                }
                onBlur={() =>
                  setForm((f) => ({ ...f, remindDaysBefore: clampReminderDaysOnBlur(f.remindDaysBefore) }))
                }
                className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-moss-500">Nhắc sau quá hạn (ngày)</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={form.remindAfterExpiryDays}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remindAfterExpiryDays: sanitizeReminderDaysDraft(e.target.value) }))
                }
                onBlur={() =>
                  setForm((f) => ({
                    ...f,
                    remindAfterExpiryDays: clampReminderDaysOnBlur(f.remindAfterExpiryDays),
                  }))
                }
                className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
              />
            </div>
          </div>

          {form.usageMode === "RESELL" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-moss-500">Giá mua (số)</label>
                <input
                  value={form.purchasePrice}
                  onChange={(e) => setForm((f) => ({ ...f, purchasePrice: sanitizeMoneyInput(f.purchasePrice, e.target.value) }))}
                  inputMode="numeric"
                  className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-moss-500">Giá bán (số)</label>
                <input
                  value={form.salePrice}
                  onChange={(e) => setForm((f) => ({ ...f, salePrice: sanitizeMoneyInput(f.salePrice, e.target.value) }))}
                  inputMode="numeric"
                  className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
                />
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-4">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-moss-500">Ghi chú</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                maxLength={2000}
                className="min-h-[60px] w-full resize-y rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
              />
            </div>
          </div>

          <div className="space-y-3 border-t border-moss-100 pt-4">
            <p className="text-xs font-bold uppercase tracking-wider text-moss-400">Tài khoản (tuỳ chọn)</p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
              <input
                placeholder="Gmail mua YouTube"
                value={form.youtubeAccountEmail}
                onChange={(e) => setForm((f) => ({ ...f, youtubeAccountEmail: e.target.value }))}
                className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
              />
              <input
                placeholder="Email Netflix"
                value={form.netflixAccountEmail}
                onChange={(e) => setForm((f) => ({ ...f, netflixAccountEmail: e.target.value }))}
                className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
              />
            </div>
            <input
              placeholder="Mật khẩu Netflix"
              value={form.netflixAccountPassword}
              onChange={(e) => setForm((f) => ({ ...f, netflixAccountPassword: e.target.value }))}
              className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none md:max-w-none"
            />
          </div>

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
              disabled={submitting || (mode === "create" && categoryOptions.length === 0)}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/20 hover:brightness-110 disabled:opacity-60"
            >
              <Save className="size-4" />
              {submitting ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
      </div>
      <ContactFormModal
        open={contactFormOpen}
        mode="create"
        initial={null}
        onClose={() => setContactFormOpen(false)}
        onSaved={(id) => void reloadContacts(id)}
      />
    </>,
    document.body,
  );
}
