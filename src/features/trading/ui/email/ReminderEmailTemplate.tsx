"use client";

import React from "react";

export type ReminderEmailAudience = "OWNER" | "BUYER";
export type ReminderEmailStage = "LEAD" | "AFTER";

export type ReminderEmailData = {
  serviceTitle: string;
  categoryName: string;
  renewalDateText: string;
  purchaseDateText?: string;
  expiryDateText?: string;
  remindDaysBefore: number;
  remindAfterDays: number;
  salePriceText: string;
  purchasePriceText?: string;
  profitText?: string;
  recipientName: string;
  adminContactName?: string;
  adminZalo?: string;
  adminFacebookUrl?: string;
  ctaUrl: string;
  sentAtText: string;
};

function stageBadge(stage: ReminderEmailStage): { label: string; tone: string } {
  if (stage === "AFTER") {
    return { label: "QUÁ HẠN", tone: "bg-rose-50 text-rose-700 border-rose-200" };
  }
  return { label: "SẮP ĐẾN HẠN", tone: "bg-amber-50 text-amber-700 border-amber-200" };
}

export function ReminderEmailTemplate({
  audience,
  stage,
  data,
}: {
  audience: ReminderEmailAudience;
  stage: ReminderEmailStage;
  data: ReminderEmailData;
}) {
  const badge = stageBadge(stage);
  const subjectText =
    stage === "LEAD"
      ? `[Nhắc hạn] ${data.serviceTitle} đến hạn ${data.renewalDateText}`
      : `[Quá hạn] ${data.serviceTitle} cần xử lý ngay`;

  return (
    <div className="mx-auto w-full max-w-[600px] rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="rounded-t-2xl border-b border-slate-100 bg-gradient-to-r from-emerald-600 to-emerald-500 px-5 py-4 text-white">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-100">LumiTask Reminder</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <h2 className="text-base font-bold sm:text-lg">{subjectText}</h2>
          <span className={`inline-flex shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${badge.tone}`}>
            {badge.label}
          </span>
        </div>
      </div>

      <div className="space-y-4 px-5 py-5 text-sm text-slate-700">
        <p>
          Xin chào <span className="font-bold">{data.recipientName}</span>,{" "}
          {stage === "AFTER" ? "đã quá hạn dịch vụ sẽ sớm dừng hoạt động nhé." : "khách hàng sắp hết hạn rồi nhé."}
        </p>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Thông tin dịch vụ</p>
          <p className="mt-2 text-base font-bold text-slate-900">{data.serviceTitle}</p>
          <p className="text-xs text-slate-500">{data.categoryName}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-lg bg-white px-3 py-2">
              <p className="text-slate-500">Ngày mua</p>
              <p className="font-bold text-slate-800">{data.purchaseDateText ?? "—"}</p>
            </div>
            <div className="rounded-lg bg-white px-3 py-2">
              <p className="text-slate-500">Ngày hết hạn</p>
              <p className="font-bold text-slate-800">{data.expiryDateText ?? data.renewalDateText}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {audience === "OWNER" ? "Tóm tắt cho chủ dịch vụ" : "Thông tin cho người mua"}
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            <li>
              {audience === "BUYER" ? "Giá dịch vụ" : "Giá bán"}: <span className="font-bold text-slate-900">{data.salePriceText}</span>
            </li>
            {audience === "OWNER" ? (
              <>
                <li>
                  Giá nhập: <span className="font-bold text-slate-900">{data.purchasePriceText ?? "—"}</span>
                </li>
                <li>
                  Lợi nhuận ước tính: <span className="font-bold text-emerald-700">{data.profitText ?? "—"}</span>
                </li>
              </>
            ) : (
              <>
                <li>
                  Liên hệ với ADMIN: <span className="font-bold text-slate-900">{data.adminContactName ?? "ADMIN"}</span>
                </li>
                <li>
                  Zalo: <span className="font-bold text-slate-900">{data.adminZalo ?? "—"}</span>
                </li>
                {data.adminFacebookUrl ? (
                  <li>
                    Facebook:{" "}
                    <a href={data.adminFacebookUrl} className="font-bold text-emerald-700 underline">
                      Liên hệ qua Facebook
                    </a>
                  </li>
                ) : null}
              </>
            )}
          </ul>
        </div>

        {audience === "OWNER" ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs text-slate-600">
              {stage === "LEAD" ? "ADMIN ơi khách hàng sắp hết hạn rồi, kiểm tra và gia hạn giúp nhé." : "ADMIN ơi khách hàng đã quá hạn rồi, xử lý sớm giúp nhé."}
            </p>
          </div>
        ) : null}
      </div>

      <div className="rounded-b-2xl border-t border-slate-100 bg-slate-50 px-5 py-4 text-[11px] text-slate-500">
        <p>Email tự động bởi LumiTask · {data.sentAtText}. Vui lòng không phản hồi email này.</p>
      </div>
    </div>
  );
}

