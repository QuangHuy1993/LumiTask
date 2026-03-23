"use client";

import React, { useMemo, useState } from "react";

import {
  ReminderEmailTemplate,
  type ReminderEmailData,
  type ReminderEmailAudience,
  type ReminderEmailStage,
} from "@/features/trading/ui/email/ReminderEmailTemplate";
import type { SubscriptionListItemDTO } from "@/features/trading/model/subscriptionTypes";

type ReminderEmailPreviewPageClientProps = {
  subscriptions: SubscriptionListItemDTO[];
  ownerName: string;
  adminContact: {
    name: string;
    zalo: string;
    facebookUrl: string;
  };
};

function formatDateText(input?: string | null): string {
  if (!input) return "—";
  const isoDate = input.split("T")[0] ?? input;
  const [year, month, day] = isoDate.split("-");
  if (!year || !month || !day) return input;
  return `${day}/${month}/${year}`;
}

function formatCurrencyText(raw?: string | null, currency = "VND"): string {
  const value = Number(raw ?? 0);
  if (!Number.isFinite(value) || value <= 0) return "—";
  return `${value.toLocaleString("vi-VN")} ${currency === "VND" ? "đ" : currency}`;
}

function formatSentAt(now: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
}

export function ReminderEmailPreviewPageClient({
  subscriptions,
  ownerName,
  adminContact,
}: ReminderEmailPreviewPageClientProps) {
  const [audience, setAudience] = useState<ReminderEmailAudience>("OWNER");
  const [stage, setStage] = useState<ReminderEmailStage>("LEAD");
  const [mobileMode, setMobileMode] = useState(true);
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<number | null>(subscriptions[0]?.id ?? null);

  const selectedSubscription = useMemo(
    () => subscriptions.find((item) => item.id === selectedSubscriptionId) ?? subscriptions[0] ?? null,
    [selectedSubscriptionId, subscriptions],
  );

  const frameClass = useMemo(
    () =>
      mobileMode
        ? "mx-auto w-[360px] max-w-full rounded-[28px] border border-slate-300 bg-slate-200/60 p-3 shadow-xl"
        : "mx-auto w-full max-w-[760px] rounded-2xl border border-slate-200 bg-slate-100/60 p-4 shadow",
    [mobileMode],
  );

  const previewData = useMemo<ReminderEmailData>(() => {
    const now = new Date();
    if (!selectedSubscription) {
      return {
        serviceTitle: "Chưa có dịch vụ sắp hết hạn",
        categoryName: "—",
        renewalDateText: "—",
        purchaseDateText: "—",
        expiryDateText: "—",
        remindDaysBefore: 0,
        remindAfterDays: 0,
        salePriceText: "—",
        purchasePriceText: "—",
        profitText: "—",
        recipientName: audience === "BUYER" ? "Khách hàng" : ownerName,
        adminContactName: adminContact.name || "ADMIN",
        adminZalo: adminContact.zalo || "—",
        adminFacebookUrl: adminContact.facebookUrl || "",
        ctaUrl: "https://localhost:3000/trading/subscriptions",
        sentAtText: formatSentAt(now),
      };
    }

    const purchasePrice = Number(selectedSubscription.purchasePriceRaw ?? 0);
    const salePrice = Number(selectedSubscription.salePriceRaw ?? 0);
    const profitValue = salePrice - purchasePrice;

    return {
      serviceTitle: selectedSubscription.title,
      categoryName: selectedSubscription.categoryName,
      renewalDateText: formatDateText(selectedSubscription.renewalOrExpiryAtISO),
      purchaseDateText: formatDateText(selectedSubscription.purchaseStartAtISO),
      expiryDateText: formatDateText(selectedSubscription.renewalOrExpiryAtISO),
      remindDaysBefore: selectedSubscription.remindDaysBefore,
      remindAfterDays: selectedSubscription.remindAfterExpiryDays,
      salePriceText: formatCurrencyText(selectedSubscription.salePriceRaw, selectedSubscription.currency),
      purchasePriceText: formatCurrencyText(selectedSubscription.purchasePriceRaw, selectedSubscription.currency),
      profitText: profitValue > 0 ? formatCurrencyText(String(profitValue), selectedSubscription.currency) : "—",
      recipientName: audience === "BUYER" ? selectedSubscription.contactName ?? "Khách hàng" : ownerName,
      adminContactName: adminContact.name || "ADMIN",
      adminZalo: adminContact.zalo || "—",
      adminFacebookUrl: adminContact.facebookUrl || "",
      ctaUrl: `/trading/subscriptions/${selectedSubscription.id}`,
      sentAtText: formatSentAt(now),
    };
  }, [adminContact.facebookUrl, adminContact.name, adminContact.zalo, audience, ownerName, selectedSubscription]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 p-4 md:p-8">
      <div className="rounded-2xl border border-moss-100 bg-white p-4 shadow-card md:p-5">
        <h1 className="text-xl font-black text-moss-900 md:text-2xl">Preview Email Nhắc Hạn</h1>
        <p className="mt-1 text-sm text-moss-500">
          Dữ liệu bên dưới lấy từ dịch vụ sắp hết hạn thực tế để bạn xem đúng giao diện email trước khi gửi.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="rounded-xl border border-moss-100 bg-moss-50/50 p-2 md:col-span-4">
            <p className="px-2 pb-1 text-[11px] font-black uppercase tracking-[0.16em] text-moss-500">Dịch vụ thực tế</p>
            <select
              className="w-full rounded-lg border border-moss-200 bg-white px-3 py-2 text-sm text-moss-700 outline-none focus:border-primary"
              value={selectedSubscriptionId ?? ""}
              onChange={(e) => setSelectedSubscriptionId(Number(e.target.value))}
              disabled={subscriptions.length === 0}
            >
              {subscriptions.length === 0 ? (
                <option value="">Không có dữ liệu dịch vụ sắp hết hạn</option>
              ) : (
                subscriptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    #{item.id} · {item.title} · Hết hạn {formatDateText(item.renewalOrExpiryAtISO)}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="rounded-xl border border-moss-100 bg-moss-50/50 p-2">
            <p className="px-2 pb-1 text-[11px] font-black uppercase tracking-[0.16em] text-moss-500">Đối tượng</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAudience("OWNER")}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${
                  audience === "OWNER" ? "bg-primary text-white" : "bg-white text-moss-600"
                }`}
              >
                Chủ dịch vụ
              </button>
              <button
                type="button"
                onClick={() => setAudience("BUYER")}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${
                  audience === "BUYER" ? "bg-primary text-white" : "bg-white text-moss-600"
                }`}
              >
                Người mua
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-moss-100 bg-moss-50/50 p-2">
            <p className="px-2 pb-1 text-[11px] font-black uppercase tracking-[0.16em] text-moss-500">Giai đoạn</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setStage("LEAD")}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${
                  stage === "LEAD" ? "bg-primary text-white" : "bg-white text-moss-600"
                }`}
              >
                LEAD
              </button>
              <button
                type="button"
                onClick={() => setStage("AFTER")}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${
                  stage === "AFTER" ? "bg-primary text-white" : "bg-white text-moss-600"
                }`}
              >
                AFTER
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-moss-100 bg-moss-50/50 p-2">
            <p className="px-2 pb-1 text-[11px] font-black uppercase tracking-[0.16em] text-moss-500">Màn hình</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMobileMode(true)}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${
                  mobileMode ? "bg-primary text-white" : "bg-white text-moss-600"
                }`}
              >
                Điện thoại
              </button>
              <button
                type="button"
                onClick={() => setMobileMode(false)}
                className={`rounded-lg px-3 py-2 text-xs font-bold ${
                  !mobileMode ? "bg-primary text-white" : "bg-white text-moss-600"
                }`}
              >
                Máy tính
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className={frameClass}>
        <ReminderEmailTemplate audience={audience} stage={stage} data={previewData} />
      </div>
    </div>
  );
}

