"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  Calendar,
  Eye,
  EyeOff,
  X,
  Save,
  Trash2,
  Info,
  Sparkles,
  Store,
  User,
} from "lucide-react";

import { renewSubscriptionAction } from "@/features/trading/actions/subscriptionActions";
import { getSubscriptionCredentialHints } from "@/features/trading/utils/subscriptionCredentialHints";
import {
  clampReminderDaysOnBlur,
  parseReminderDaysForSubmit,
  sanitizeReminderDaysDraft,
} from "@/features/trading/utils/reminderDayInputs";

type Audience = "OWNER_AND_BUYER";

export type SubscriptionRenewDraft = {
  id: number;
  title: string;
  categoryName: string;
  usageMode: "PERSONAL_FAMILY" | "RESELL";
  contactName?: string | null;
  contactEmail?: string | null;

  renewalOrExpiryAtISO: string; // initial
  remindDaysBefore: number;
  remindAfterExpiryDays: number;

  purchasePrice: string | null;
  salePrice: string | null;
  currency?: string | null;

  // Theo yêu cầu: lưu plaintext Netflix + gmail mua YouTube
  youtubeAccountEmail?: string | null;
  netflixAccountEmail?: string | null;
  netflixAccountPassword?: string | null;
};

type RenewSubscriptionModalProps = {
  open: boolean;
  onClose: () => void;
  draft: SubscriptionRenewDraft | null;
  audience?: Audience;
  onUpdated?: () => void;
};

function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function renewMoneyDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 14);
}

function formatMoneyVNDInline(valueStr: string): string {
  const digits = valueStr.replace(/[^\d]/g, "");
  if (!digits) return "—";
  const n = Number.parseInt(digits, 10);
  const safe = Number.isFinite(n) ? n : 0;
  return `${new Intl.NumberFormat("vi-VN").format(safe)} ₫`;
}

function addDays(date: Date, days: number): Date {
  const t = date.getTime();
  return new Date(t + days * 24 * 60 * 60 * 1000);
}

function fmtDateVi(date: Date): string {
  return date.toLocaleDateString("vi-VN", {
    weekday: undefined,
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export function RenewSubscriptionModal({
  open,
  onClose,
  draft,
  onUpdated,
}: RenewSubscriptionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [renewalDate, setRenewalDate] = useState("");
  const [remindDaysBefore, setRemindDaysBefore] = useState("7");
  const [remindAfterExpiryDays, setRemindAfterExpiryDays] = useState("3");

  const [purchasePrice, setPurchasePrice] = useState("0");
  const [salePrice, setSalePrice] = useState("0");

  const [youtubeAccountEmail, setYoutubeAccountEmail] = useState("");
  const [netflixAccountEmail, setNetflixAccountEmail] = useState("");
  const [netflixAccountPassword, setNetflixAccountPassword] = useState("");
  const [showNetflixPassword, setShowNetflixPassword] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMounted(true);
    setShowNetflixPassword(false);
    if (draft) {
      setRenewalDate(toDateInputValue(draft.renewalOrExpiryAtISO));
      setRemindDaysBefore(String(draft.remindDaysBefore));
      setRemindAfterExpiryDays(String(draft.remindAfterExpiryDays));
      setPurchasePrice(draft.purchasePrice ?? "0");
      setSalePrice(draft.salePrice ?? "0");

      setYoutubeAccountEmail(draft.youtubeAccountEmail ?? "");
      setNetflixAccountEmail(draft.netflixAccountEmail ?? "");
      setNetflixAccountPassword(draft.netflixAccountPassword ?? "");
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
      setMounted(false);
    };
  }, [open, draft]);

  const credentialHints = useMemo(() => {
    if (!draft) {
      return { showYoutube: false, showNetflix: false, showSimDataHint: false };
    }
    return getSubscriptionCredentialHints({
      categoryName: draft.categoryName,
      title: draft.title,
      youtubeAccountEmail,
      netflixAccountEmail,
      netflixAccountPassword,
    });
  }, [draft, youtubeAccountEmail, netflixAccountEmail, netflixAccountPassword]);

  const hasCredentialFields =
    credentialHints.showYoutube || credentialHints.showNetflix;

  const computed = useMemo(() => {
    if (!renewalDate) return null;
    const base = new Date(`${renewalDate}T00:00:00`);
    if (Number.isNaN(base.getTime())) return null;
    const before = Number.parseInt(remindDaysBefore, 10);
    const after = Number.parseInt(remindAfterExpiryDays, 10);
    if (
      remindDaysBefore.trim() === "" ||
      !Number.isFinite(before) ||
      before < 0 ||
      before > 90 ||
      remindAfterExpiryDays.trim() === "" ||
      !Number.isFinite(after) ||
      after < 0 ||
      after > 90
    ) {
      return null;
    }
    const leadAt = addDays(base, -before);
    const afterAt = addDays(base, after);
    return { base, leadAt, afterAt };
  }, [renewalDate, remindDaysBefore, remindAfterExpiryDays]);

  const leadStageText = useMemo(() => {
    if (!computed) return "—";
    return `Trước hạn: ${fmtDateVi(computed.leadAt)}`;
  }, [computed]);

  const afterStageText = useMemo(() => {
    if (!computed) return "—";
    return `Sau quá hạn: ${fmtDateVi(computed.afterAt)}`;
  }, [computed]);

  const canUpdate = Boolean(draft?.id) && Boolean(renewalDate) && !isSaving;

  const handleSave = async () => {
    if (!draft) return;
    if (!canUpdate) return;

    const remindBefore = parseReminderDaysForSubmit(remindDaysBefore, "Nhắc trước hạn");
    if (remindBefore === null) return;
    const remindAfter = parseReminderDaysForSubmit(remindAfterExpiryDays, "Nhắc sau quá hạn");
    if (remindAfter === null) return;

    if (draft.usageMode === "RESELL") {
      if (!purchasePrice.trim() || !salePrice.trim()) {
        toast.error("Nhập giá nhập và giá bán (chỉ số, không để trống).");
        return;
      }
    }

    setIsSaving(true);
    try {
      const res = await renewSubscriptionAction({
        subscriptionId: draft.id,
        renewalOrExpiryAt: renewalDate,
        remindDaysBefore: remindBefore,
        remindAfterExpiryDays: remindAfter,
        purchasePrice: draft.usageMode === "RESELL" ? purchasePrice : null,
        salePrice: draft.usageMode === "RESELL" ? salePrice : null,
        currency: draft.currency ?? "VND",

        youtubeAccountEmail: youtubeAccountEmail.trim() || "",
        netflixAccountEmail: netflixAccountEmail.trim() || "",
        netflixAccountPassword: netflixAccountPassword || "",
      });

      if (!res.success) {
        toast.error("Không thể cập nhật lịch gia hạn.");
        return;
      }

      onUpdated?.();
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!open || !mounted || !draft) return null;

  const audienceLine =
    draft.usageMode === "RESELL" ? (
      <>
        Hệ thống sẽ gửi email cho bạn và khách mua (nếu contact có email). Khách chỉ thấy{" "}
        <span className="font-bold">giá bán</span>.
      </>
    ) : (
      <>Hệ thống sẽ gửi email cho bạn (Owner).</>
    );

  const modal = (
    <div className="fixed inset-0 z-[9999] p-4 transition-all duration-200">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative mx-auto flex max-h-[min(92dvh,56rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[2.5rem] border border-moss-100 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="relative shrink-0 border-b border-moss-50">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-mint-500" />
          <div className="flex items-start justify-between gap-4 p-6 pb-5 md:p-8 md:pb-6">
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-moss-400 tracking-wide">
                Gia hạn dịch vụ
              </p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-moss-900 md:text-2xl">
                {draft.title}
              </h2>
              <p className="mt-2 text-sm text-moss-500">{draft.categoryName}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-2xl p-2 text-moss-400 transition-colors hover:bg-moss-50 hover:text-moss-700"
              aria-label="Đóng"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Body — scroll; footer luôn hiện */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 md:px-8 md:py-6">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            {draft.usageMode === "RESELL" ? (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-primary">
                <Store className="size-3.5" aria-hidden />
                Bán lại
              </span>
            ) : (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-sand-200 bg-sand-50 px-3 py-1 text-xs font-black uppercase tracking-wider text-sand-800">
                <User className="size-3.5" aria-hidden />
                Cá nhân / gia đình
              </span>
            )}
            {draft.usageMode === "RESELL" && draft.contactName ? (
              <p className="text-sm text-moss-600">
                Người mua: <span className="font-bold text-moss-900">{draft.contactName}</span>
                {draft.contactEmail ? (
                  <span className="text-moss-400"> · {draft.contactEmail}</span>
                ) : null}
              </p>
            ) : null}
          </div>

          <div className="space-y-5">
            {draft.usageMode === "RESELL" ? (
              <div className="space-y-5">
                {/* Row 1: Ngày gia hạn | Gmail mua */}
                <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-moss-600">
                      <Calendar className="size-4 shrink-0" aria-hidden />
                      Ngày gia hạn tiếp theo
                    </label>
                    <input
                      type="date"
                      value={renewalDate}
                      onChange={(e) => setRenewalDate(e.target.value)}
                      className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-sm font-bold transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                    />
                    <div className="min-h-[14px] text-[11px] leading-snug text-moss-500">
                      {computed ? (
                        <>
                          {leadStageText}
                          <span className="mx-1.5">•</span>
                          {afterStageText}
                        </>
                      ) : null}
                    </div>
                  </div>

                  {credentialHints.showYoutube ? (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-moss-600">
                        Gmail mua (YouTube)
                      </label>
                      <input
                        value={youtubeAccountEmail}
                        onChange={(e) => setYoutubeAccountEmail(e.target.value)}
                        className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-sm font-bold transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                        placeholder="name@gmail.com"
                      />
                      <div className="min-h-[14px]" />
                    </div>
                  ) : (
                    <div className="space-y-2" aria-hidden>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-moss-600 opacity-0">
                        Gmail mua (YouTube)
                      </div>
                      <div className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-sm font-bold text-transparent">
                        &nbsp;
                      </div>
                      <div className="min-h-[14px]" />
                    </div>
                  )}
                </div>

                {/* Row 2: Giá nhập | Tài khoản Netflix */}
                <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.2em] text-moss-600">
                      Giá nhập
                    </label>
                    <input
                      value={purchasePrice}
                      inputMode="numeric"
                      autoComplete="off"
                      onChange={(e) => setPurchasePrice(renewMoneyDigits(e.target.value))}
                      className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-sm font-bold transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                      placeholder="VD: 950000"
                    />
                    <div className="min-h-[14px] text-[11px] text-slate-500">
                      {formatMoneyVNDInline(purchasePrice)}
                    </div>
                  </div>

                  {credentialHints.showNetflix ? (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-moss-600">
                        Tài khoản Netflix
                      </label>
                      <input
                        value={netflixAccountEmail}
                        onChange={(e) => setNetflixAccountEmail(e.target.value)}
                        className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-sm font-bold transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                        placeholder="email hoặc tài khoản"
                      />
                      <div className="min-h-[14px]" />
                    </div>
                  ) : (
                    <div className="space-y-2" aria-hidden>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-moss-600 opacity-0">
                        Tài khoản Netflix
                      </div>
                      <div className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-sm font-bold text-transparent">
                        &nbsp;
                      </div>
                      <div className="min-h-[14px]" />
                    </div>
                  )}
                </div>

                {/* Row 3: Giá bán | Mật khẩu Netflix */}
                <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-[0.2em] text-moss-600">
                      Giá bán
                    </label>
                    <input
                      value={salePrice}
                      inputMode="numeric"
                      autoComplete="off"
                      onChange={(e) => setSalePrice(renewMoneyDigits(e.target.value))}
                      className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-sm font-bold transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                      placeholder="VD: 1425000"
                    />
                    <div className="min-h-[14px] text-[11px] text-slate-500">
                      {formatMoneyVNDInline(salePrice)}
                    </div>
                  </div>

                  {credentialHints.showNetflix ? (
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-[0.2em] text-moss-600">
                        Mật khẩu Netflix
                      </label>
                      <div className="relative">
                        <input
                          type={showNetflixPassword ? "text" : "password"}
                          value={netflixAccountPassword}
                          onChange={(e) => setNetflixAccountPassword(e.target.value)}
                          autoComplete="off"
                          className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 py-3 pr-12 pl-5 text-sm font-bold transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                          placeholder="Nhập mật khẩu"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNetflixPassword((v) => !v)}
                          aria-pressed={showNetflixPassword}
                          aria-label={showNetflixPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                          className="absolute top-1/2 right-3 -translate-y-1/2 rounded-xl p-1.5 text-moss-400 transition-colors hover:bg-moss-100 hover:text-moss-700"
                        >
                          {showNetflixPassword ? (
                            <EyeOff className="size-4" aria-hidden />
                          ) : (
                            <Eye className="size-4" aria-hidden />
                          )}
                        </button>
                      </div>
                      <div className="min-h-[14px]" />
                    </div>
                  ) : (
                    <div className="space-y-2" aria-hidden>
                      <div className="text-xs font-black uppercase tracking-[0.2em] text-moss-600 opacity-0">
                        Mật khẩu Netflix
                      </div>
                      <div className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 py-3 pr-12 pl-5 text-sm font-bold text-transparent">
                        &nbsp;
                      </div>
                      <div className="min-h-[14px]" />
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div
                className={
                  hasCredentialFields
                    ? "grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2"
                    : "grid grid-cols-1"
                }
              >
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-moss-600">
                      <Calendar className="size-4 shrink-0" aria-hidden />
                      Ngày gia hạn tiếp theo
                    </label>
                    <input
                      type="date"
                      value={renewalDate}
                      onChange={(e) => setRenewalDate(e.target.value)}
                      className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-sm font-bold transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                    />
                    {computed ? (
                      <div className="text-[11px] leading-snug text-moss-500">
                        {leadStageText}
                        <span className="mx-1.5">•</span>
                        {afterStageText}
                      </div>
                    ) : null}
                  </div>

                </div>

                {hasCredentialFields ? (
                  <div className="space-y-5">
                    {credentialHints.showYoutube ? (
                      <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-[0.2em] text-moss-600">
                          Gmail mua (YouTube)
                        </label>
                        <input
                          value={youtubeAccountEmail}
                          onChange={(e) => setYoutubeAccountEmail(e.target.value)}
                          className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-sm font-bold transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                          placeholder="name@gmail.com"
                        />
                      </div>
                    ) : null}

                    {credentialHints.showNetflix ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-[0.2em] text-moss-600">
                            Tài khoản Netflix
                          </label>
                          <input
                            value={netflixAccountEmail}
                            onChange={(e) => setNetflixAccountEmail(e.target.value)}
                            className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-sm font-bold transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                            placeholder="email hoặc tài khoản"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black uppercase tracking-[0.2em] text-moss-600">
                            Mật khẩu Netflix
                          </label>
                          <div className="relative">
                            <input
                              type={showNetflixPassword ? "text" : "password"}
                              value={netflixAccountPassword}
                              onChange={(e) => setNetflixAccountPassword(e.target.value)}
                              autoComplete="off"
                              className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 py-3 pr-12 pl-5 text-sm font-bold transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                              placeholder="Nhập mật khẩu"
                            />
                            <button
                              type="button"
                              onClick={() => setShowNetflixPassword((v) => !v)}
                              aria-pressed={showNetflixPassword}
                              aria-label={showNetflixPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-xl p-1.5 text-moss-400 transition-colors hover:bg-moss-100 hover:text-moss-700"
                            >
                              {showNetflixPassword ? (
                                <EyeOff className="size-4" aria-hidden />
                              ) : (
                                <Eye className="size-4" aria-hidden />
                              )}
                            </button>
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}

            {credentialHints.showSimDataHint ? (
              <div className="rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-3 text-xs leading-relaxed text-sky-950">
                Gói <strong>SIM / 4G / 5G</strong>: không có ô riêng khi gia hạn. Chi tiết số thuê bao hoặc gói cước hãy
                cập nhật tại <strong>Sửa dịch vụ</strong> (ghi chú hoặc tên gói).
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-moss-600">Nhắc trước hạn</label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={remindDaysBefore}
                  onChange={(e) => setRemindDaysBefore(sanitizeReminderDaysDraft(e.target.value))}
                  onBlur={() => setRemindDaysBefore((v) => clampReminderDaysOnBlur(v))}
                  className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-sm font-bold transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-[0.2em] text-moss-600">
                  Nhắc sau quá hạn (phương án B)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={remindAfterExpiryDays}
                  onChange={(e) => setRemindAfterExpiryDays(sanitizeReminderDaysDraft(e.target.value))}
                  onBlur={() => setRemindAfterExpiryDays((v) => clampReminderDaysOnBlur(v))}
                  className="w-full rounded-2xl border border-moss-100 bg-moss-50/30 px-5 py-3 text-sm font-bold transition-all focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-moss-100 bg-slate-50 p-5">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Info className="size-5" aria-hidden />
                </div>
                <div className="space-y-1">
                  <h4 className="font-black text-moss-900">Tóm tắt gia hạn</h4>
                  <p className="text-sm leading-relaxed text-moss-500">{audienceLine}</p>
                  <div className="text-xs text-moss-400">
                    Giai đoạn trước hạn: gửi email trước hạn {remindDaysBefore || "—"} ngày · Sau quá hạn: gửi bù sau{" "}
                    {remindAfterExpiryDays || "—"} ngày.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer — luôn dính đáy dialog */}
        <div className="shrink-0 border-t border-moss-100 bg-white px-6 py-4 md:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <button
              type="button"
              onClick={handleSave}
              disabled={!canUpdate}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-xs font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-primary/20 transition-all hover:brightness-110 disabled:opacity-50 sm:py-4"
            >
              <Save className="size-4 shrink-0" aria-hidden />
              Cập nhật và đặt lại nhắc nhở
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-moss-200 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-moss-600 transition-all hover:bg-moss-50 sm:py-4"
            >
              <Trash2 className="size-4 shrink-0" aria-hidden />
              Hủy thay đổi
            </button>
          </div>

          <div className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-moss-400">
            <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Lưu sẽ cập nhật ngày gia hạn, nhắc nhở và (nếu có) tài khoản trên hệ thống.</span>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

