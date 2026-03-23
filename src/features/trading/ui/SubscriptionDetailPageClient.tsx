"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { PageTransition } from "@/components/common/PageTransition";
import {
  Bell,
  Calendar,
  Clock,
  Eye,
  EyeOff,
  Mail,
  ShoppingCart,
  Sparkles,
  Store,
  User,
  Users,
  Wallet,
  Edit2,
  Trash2,
} from "lucide-react";

import { RenewSubscriptionModal, type SubscriptionRenewDraft } from "@/features/trading/ui/RenewSubscriptionModal";
import { SubscriptionFormModal } from "@/features/trading/ui/SubscriptionFormModal";
import { SubscriptionDeleteModal } from "@/features/trading/ui/SubscriptionDeleteModal";
import { getSubscriptionDetailAction, toggleSubscriptionActiveAction } from "@/features/trading/actions/subscriptionActions";
import { getCategoriesAction } from "@/features/trading/actions/serviceCategoryActions";
import type { SubscriptionDetailDTO } from "@/features/trading/model/subscriptionTypes";
import type { ServiceCategoryListItemDTO } from "@/features/trading/model/categoryTypes";

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function formatDateVi(date: Date): string {
  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTimeVi(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoneyVND(raw: string | null): string {
  if (!raw) return "—";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "—";
  const n = Number.parseInt(digits, 10);
  if (!Number.isFinite(n)) return "—";
  return `${new Intl.NumberFormat("vi-VN").format(n)} ₫`;
}

function stageLabel(stage: SubscriptionDetailDTO["nextReminderStage"]): string {
  if (stage === "LEAD") return "Trước hạn";
  if (stage === "AFTER") return "Sau quá hạn";
  return "—";
}

/** Ease-out mượt: overlay tắt dần, nội dung fade-in chồng lên (tránh “khựng” khi unmount PageTransition). */
const DETAIL_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const OVERLAY_EXIT_DURATION = 0.78;
const CONTENT_IN_DURATION = 0.52;
const CONTENT_IN_DELAY = 0.14;

export function SubscriptionDetailPageClient({ subscriptionId }: { subscriptionId: number }) {
  const router = useRouter();
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewDraft, setRenewDraft] = useState<SubscriptionRenewDraft | null>(null);

  const [subscription, setSubscription] = useState<SubscriptionDetailDTO | null>(null);
  const [categories, setCategories] = useState<ServiceCategoryListItemDTO[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [showNetflixPassword, setShowNetflixPassword] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  /** Giữ overlay đến khi exit animation chạy xong (không unmount PageTransition đột ngột). */
  const [showEnterOverlay, setShowEnterOverlay] = useState(true);

  async function loadCategories() {
    const res = await getCategoriesAction({ limit: 200, isActive: "ALL" });
    if (res.success) setCategories(res.items);
  }

  async function reload() {
    setIsReady(false);
    try {
      const res = await getSubscriptionDetailAction(subscriptionId);
      if (!res.success) {
        toast.error("Không thể tải chi tiết subscription.");
        setSubscription(null);
        return;
      }
      setSubscription(res.data);
    } finally {
      setIsReady(true);
    }
  }

  useEffect(() => {
    void loadCategories();
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptionId]);

  useEffect(() => {
    if (!isReady) {
      setShowEnterOverlay(true);
      return;
    }
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setShowEnterOverlay(false);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [isReady]);

  const computed = React.useMemo(() => {
    if (!subscription) return null;
    const base = new Date(`${subscription.renewalOrExpiryAtISO}T00:00:00`);
    if (Number.isNaN(base.getTime())) return null;
    const leadAt = addDays(base, -subscription.remindDaysBefore);
    const afterAt = addDays(base, subscription.remindAfterExpiryDays);
    return { base, leadAt, afterAt };
  }, [subscription]);

  const openRenew = () => {
    if (!subscription) return;
    setRenewDraft({
      id: subscription.id,
      title: subscription.title,
      categoryName: subscription.categoryName,
      usageMode: subscription.usageMode,
      contactName: subscription.contactName,
      contactEmail: subscription.contactEmail,
      renewalOrExpiryAtISO: subscription.renewalOrExpiryAtISO,
      remindDaysBefore: subscription.remindDaysBefore,
      remindAfterExpiryDays: subscription.remindAfterExpiryDays,
      purchasePrice: subscription.usageMode === "RESELL" ? subscription.purchasePriceRaw : null,
      salePrice: subscription.usageMode === "RESELL" ? subscription.salePriceRaw : null,
      currency: "₫",
      youtubeAccountEmail: subscription.youtubeAccountEmail,
      netflixAccountEmail: subscription.netflixAccountEmail,
      netflixAccountPassword: subscription.netflixAccountPassword,
    });
    setRenewOpen(true);
  };

  async function handleToggleActive(next: boolean) {
    if (!subscription) return;
    setToggleBusy(true);
    try {
      const res = await toggleSubscriptionActiveAction(subscription.id, { subscriptionId: subscription.id, isActive: next });
      if (!res.success) {
        toast.error("Không thể đổi trạng thái nhắc.");
        return;
      }
      toast.success(next ? "Đã bật nhắc." : "Đã tạm dừng nhắc.");
      await reload();
    } finally {
      setToggleBusy(false);
    }
  }

  const hasCredentials = subscription
    ? Boolean(subscription.youtubeAccountEmail) ||
      Boolean(subscription.netflixAccountEmail) ||
      Boolean(subscription.netflixAccountPassword)
    : false;

  const pwd = subscription?.netflixAccountPassword ?? "";
  const maskedPwd = pwd.length > 0 ? "•".repeat(Math.min(pwd.length, 32)) : "—";

  return (
    <>
      <AnimatePresence>
        {showEnterOverlay ? (
          <motion.div
            key="subscription-detail-overlay"
            className="fixed inset-0 z-[10000]"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: OVERLAY_EXIT_DURATION, ease: DETAIL_EASE }}
          >
            <PageTransition stayVisible />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {!isReady ? null : !subscription ? (
        <motion.div
          className="max-w-[1600px] mx-auto p-4 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: CONTENT_IN_DURATION, delay: CONTENT_IN_DELAY, ease: DETAIL_EASE }}
        >
          <div className="rounded-2xl border border-moss-100 bg-white p-10 text-center shadow-card">
            <p className="text-moss-600 font-bold">Không tải được dịch vụ.</p>
            <Link
              href="/trading/subscriptions"
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-moss-200 px-5 py-2.5 text-sm font-bold text-moss-700 hover:bg-moss-50"
            >
              Quay lại danh sách
            </Link>
          </div>
        </motion.div>
      ) : (
      <motion.div
        className="max-w-[1600px] mx-auto space-y-6 p-4 md:p-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: CONTENT_IN_DURATION, delay: CONTENT_IN_DELAY, ease: DETAIL_EASE }}
      >
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[2.5rem] border border-moss-100 bg-white shadow-card">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-mint-500" />
        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-inner">
                <ShoppingCart className="size-7" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {subscription.usageMode === "RESELL" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">
                      <Store className="size-3" aria-hidden />
                      Bán lại
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-sand-200 bg-sand-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-sand-800">
                      <User className="size-3" aria-hidden />
                      Cá nhân / gia đình
                    </span>
                  )}
                  {subscription.isActive ? (
                    <span className="rounded-full bg-mint-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-mint-800">
                      Nhắc đang bật
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-600">
                      Nhắc tạm dừng
                    </span>
                  )}
                </div>
                <h1 className="mt-2 text-2xl font-black tracking-tight text-moss-900 md:text-3xl">
                  {subscription.title}
                </h1>
                <p className="mt-1 text-sm text-moss-500">{subscription.categoryName}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
              <Link
                href="/trading/subscriptions"
                className="px-4 py-2.5 rounded-xl border border-moss-100 text-moss-600 text-sm font-bold hover:bg-moss-50 transition-colors"
              >
                Quay lại
              </Link>
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-moss-200 text-moss-700 text-sm font-bold hover:bg-moss-50"
              >
                <Edit2 className="size-4" />
                Sửa
              </button>
              <button
                type="button"
                onClick={() => setDeleteOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-tertiary/30 text-tertiary text-sm font-bold hover:bg-tertiary/5"
              >
                <Trash2 className="size-4" />
                Xoá
              </button>
              <button
                type="button"
                onClick={openRenew}
                className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
              >
                <Calendar className="size-4" />
                Gia hạn
              </button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-moss-50 bg-moss-50/40 px-4 py-3 text-sm font-bold text-moss-700">
            <Bell className="size-4 shrink-0 text-primary" />
            <span>Nhắc hạn</span>
            <label className="ml-auto inline-flex cursor-pointer items-center gap-3 font-semibold text-moss-600">
              <input
                type="checkbox"
                checked={subscription.isActive}
                disabled={toggleBusy}
                onChange={(e) => void handleToggleActive(e.target.checked)}
                className="peer sr-only"
              />
              <span
                className={[
                  "relative inline-flex h-8 w-14 items-center rounded-full transition-colors",
                  subscription.isActive ? "bg-mint-500" : "bg-slate-200",
                  "peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-mint-500/20",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform",
                    subscription.isActive ? "translate-x-6" : "translate-x-0",
                  ].join(" ")}
                />
              </span>
              <span
                className={[
                  "text-sm transition-colors",
                  subscription.isActive ? "text-mint-800" : "text-moss-600",
                ].join(" ")}
              >
                {subscription.isActive ? "Đang bật" : "Tạm dừng"}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-moss-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-moss-400">Ngày gia hạn</span>
            <Calendar className="size-4 text-primary" />
          </div>
          <div className="mt-3 text-2xl font-black text-moss-900">
            {computed ? formatDateVi(computed.base) : subscription.renewalOrExpiryAtISO}
          </div>
          <p className="mt-2 text-xs text-moss-500">
            Nhắc trước / sau: {subscription.remindDaysBefore} / {subscription.remindAfterExpiryDays} ngày
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-moss-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-moss-400">Nhắc tiếp theo</span>
            <Sparkles className="size-4 text-primary" />
          </div>
          <div className="mt-3 text-sm font-bold text-moss-800">
            {subscription.nextReminderAtISO ? formatDateVi(new Date(`${subscription.nextReminderAtISO}T00:00:00`)) : "—"}
          </div>
          <p className="mt-2 text-xs text-moss-500">
            Giai đoạn: {stageLabel(subscription.nextReminderStage)}
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-moss-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-moss-400">Mốc nhắc</span>
            <Sparkles className="size-4 text-primary" />
          </div>
          <div className="mt-3 space-y-1 text-sm font-bold text-moss-700">
            <div>Trước hạn: {computed ? formatDateVi(computed.leadAt) : "—"}</div>
            <div>Sau quá hạn: {computed ? formatDateVi(computed.afterAt) : "—"}</div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-moss-100 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-moss-400">Giá</span>
            <Wallet className="size-4 text-primary" />
          </div>
          {subscription.usageMode === "RESELL" ? (
            <div className="mt-3 space-y-1">
              <div className="text-lg font-black text-moss-900">{formatMoneyVND(subscription.purchasePriceRaw)}</div>
              <div className="text-xs font-bold uppercase tracking-wider text-moss-400">Giá nhập</div>
              <div className="pt-2 text-lg font-black text-primary">{formatMoneyVND(subscription.salePriceRaw)}</div>
              <div className="text-xs font-bold uppercase tracking-wider text-moss-400">Giá bán</div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-moss-500">Cá nhân — không theo giá bán lại.</p>
          )}
        </div>
      </div>

      {subscription.usageMode === "RESELL" ? (
        <div className="rounded-2xl border border-moss-100 bg-white p-6 shadow-card">
          <div className="flex items-center gap-3 border-b border-moss-50 pb-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-moss-900">Người mua</h3>
              <p className="text-xs text-moss-400">Thông tin liên hệ</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-moss-50/50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-moss-400">Tên</p>
              <p className="mt-1 font-bold text-moss-900">{subscription.contactName ?? "—"}</p>
            </div>
            <div className="rounded-xl bg-moss-50/50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-moss-400">Email</p>
              <p className="mt-1 flex items-center gap-2 font-bold text-moss-900 break-all">
                <Mail className="size-4 shrink-0 text-primary" />
                {subscription.contactEmail ?? "—"}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {hasCredentials ? (
        <div className="rounded-2xl border border-moss-100 bg-white p-6 shadow-card">
          <div className="flex items-center gap-3 border-b border-moss-50 pb-4">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="size-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-moss-900">Tài khoản</h3>
              <p className="text-xs text-moss-400">Thông tin đăng nhập (lưu trên hệ thống)</p>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <div className="rounded-xl border border-moss-50 bg-moss-50/30 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-moss-400">Gmail mua (YouTube)</p>
              <p className="mt-1 font-mono text-sm font-bold text-moss-900 break-all">
                {subscription.youtubeAccountEmail ?? "—"}
              </p>
            </div>
            <div className="rounded-xl border border-moss-50 bg-moss-50/30 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-wider text-moss-400">Tài khoản Netflix</p>
              <p className="mt-1 font-mono text-sm font-bold text-moss-900 break-all">
                {subscription.netflixAccountEmail ?? "—"}
              </p>
            </div>
            <div className="rounded-xl border border-moss-50 bg-moss-50/30 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-moss-400">Mật khẩu Netflix</p>
                {pwd ? (
                  <button
                    type="button"
                    onClick={() => setShowNetflixPassword((v) => !v)}
                    aria-pressed={showNetflixPassword}
                    aria-label={showNetflixPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="inline-flex items-center gap-1 rounded-lg border border-moss-100 bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wider text-moss-600 hover:bg-moss-50"
                  >
                    {showNetflixPassword ? (
                      <>
                        <EyeOff className="size-3.5" aria-hidden />
                        Ẩn
                      </>
                    ) : (
                      <>
                        <Eye className="size-3.5" aria-hidden />
                        Hiện
                      </>
                    )}
                  </button>
                ) : null}
              </div>
              <p className="mt-1 font-mono text-sm font-bold text-moss-900 break-all">
                {pwd ? (showNetflixPassword ? pwd : maskedPwd) : "—"}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {subscription.notes ? (
        <div className="rounded-2xl border border-moss-100 bg-white p-6 shadow-card">
          <h3 className="text-lg font-black text-moss-900">Ghi chú</h3>
          <p className="mt-3 text-sm leading-relaxed text-moss-600 whitespace-pre-wrap">{subscription.notes}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-4 text-xs text-moss-400">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden />
          Tạo: {formatDateTimeVi(subscription.createdAtISO)}
        </span>
        <span className="text-moss-200">·</span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden />
          Cập nhật: {formatDateTimeVi(subscription.updatedAtISO)}
        </span>
      </div>

      <RenewSubscriptionModal
        open={renewOpen}
        onClose={() => setRenewOpen(false)}
        draft={renewDraft}
        onUpdated={() => {
          toast.success("Đã cập nhật lịch gia hạn.");
          void reload();
        }}
      />

      <SubscriptionFormModal
        open={formOpen}
        mode="edit"
        initial={subscription}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSaved={() => void reload()}
      />

      <SubscriptionDeleteModal
        open={deleteOpen}
        subscriptionId={subscription?.id ?? null}
        title={subscription?.title ?? ""}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          router.push("/trading/subscriptions");
        }}
      />
      </motion.div>
      )}
    </>
  );
}
