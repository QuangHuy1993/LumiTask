"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Save, X } from "lucide-react";

import {
  createContactAction,
  updateContactAction,
} from "@/features/trading/actions/contactActions";
import type { SaleContactListItemDTO } from "@/features/trading/model/contactTypes";

type ContactMethod = "ZALO" | "FACEBOOK";
type ContactStatus = "ACTIVE" | "PAUSED" | "DORMANT";

type Mode = "create" | "edit";

type ContactFormModalProps = {
  open: boolean;
  mode: Mode;
  initial: SaleContactListItemDTO | null;
  onClose: () => void;
  /** Khi tạo mới thành công: trả về id để parent chọn trong select (vd. form dịch vụ). */
  onSaved?: (createdId?: number) => void;
};

function mapActionError(error: string): string {
  switch (error) {
    case "UNAUTHENTICATED":
      return "Bạn cần đăng nhập lại.";
    case "VALIDATION_ERROR":
      return "Dữ liệu không hợp lệ. Kiểm tra Zalo hoặc URL Facebook.";
    case "NOT_FOUND":
      return "Không tìm thấy contact.";
    case "DB_ERROR":
      return "Lỗi lưu dữ liệu. Thử lại sau.";
    default:
      return "Đã có lỗi xảy ra.";
  }
}

export function ContactFormModal({ open, mode, initial, onClose, onSaved }: ContactFormModalProps) {
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState("");
  const [contactMethod, setContactMethod] = useState<ContactMethod>("ZALO");
  const [zalo, setZalo] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<ContactStatus>("ACTIVE");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && initial) {
      setName(initial.name);
      setContactMethod(initial.contactMethod);
      setZalo(initial.zalo ?? "");
      setFacebookUrl(initial.facebookUrl ?? "");
      setEmail(initial.email ?? "");
      setNote(initial.note ?? "");
      setStatus(initial.status);
      return;
    }
    setName("");
    setContactMethod("ZALO");
    setZalo("");
    setFacebookUrl("");
    setEmail("");
    setNote("");
    setStatus("ACTIVE");
  }, [open, mode, initial]);

  if (!mounted || !open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "create") {
        const res = await createContactAction({
          name: name.trim(),
          contactMethod,
          zalo: contactMethod === "ZALO" ? zalo.trim() : "",
          facebookUrl: contactMethod === "FACEBOOK" ? facebookUrl.trim() : "",
          email: email.trim() || undefined,
          note: note.trim() || undefined,
          status,
        });
        if (!res.success) {
          toast.error(mapActionError(res.error));
          return;
        }
        toast.success("Đã thêm liên hệ.");
        onSaved?.(res.id);
        onClose();
        return;
      }

      if (!initial) return;
      const res = await updateContactAction(initial.id, {
        name: name.trim(),
        contactMethod,
        zalo: contactMethod === "ZALO" ? zalo.trim() : "",
        facebookUrl: contactMethod === "FACEBOOK" ? facebookUrl.trim() : "",
        email: email.trim() || undefined,
        note: note.trim() || undefined,
        status,
      });
      if (!res.success) {
        toast.error(mapActionError(res.error));
        return;
      }
      toast.success("Đã cập nhật liên hệ.");
      onSaved?.();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-moss-900/40 backdrop-blur-sm"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-moss-100 bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-moss-100 px-6 py-4">
          <h2 className="text-lg font-bold text-moss-900">{mode === "create" ? "Thêm liên hệ" : "Sửa liên hệ"}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-moss-500 hover:bg-moss-50"
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 p-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-moss-500 mb-1">Tên</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              maxLength={120}
              className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-moss-500 mb-1">Phương thức</label>
            <select
              value={contactMethod}
              onChange={(e) => setContactMethod(e.target.value as ContactMethod)}
              className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
            >
              <option value="ZALO">Zalo</option>
              <option value="FACEBOOK">Facebook</option>
            </select>
          </div>

          {contactMethod === "ZALO" ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-moss-500 mb-1">Zalo (số hoặc link)</label>
              <input
                value={zalo}
                onChange={(e) => setZalo(e.target.value)}
                required
                maxLength={50}
                className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-moss-500 mb-1">URL Facebook</label>
              <input
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                required
                maxLength={500}
                placeholder="https://facebook.com/..."
                className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-moss-500 mb-1">Email (tuỳ chọn)</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              maxLength={200}
              className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-moss-500 mb-1">Ghi chú (tuỳ chọn)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none resize-y min-h-[80px]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-moss-500 mb-1">Trạng thái</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ContactStatus)}
              className="w-full rounded-xl border-none bg-moss-50 px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
            >
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="PAUSED">Tạm dừng</option>
              <option value="DORMANT">Ngưng hoạt động</option>
            </select>
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
