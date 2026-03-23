import type { SubscriptionReminderStage, SubscriptionUsageMode } from "@/features/trading/model/subscriptionTypes";

export type ReminderAudience = "OWNER" | "BUYER";

type ReminderAdminContact = {
  name: string;
  zalo?: string;
  facebookUrl?: string;
};

export type ReminderRuntimePayload = {
  subscriptionId: number;
  serviceTitle: string;
  categoryName: string;
  purchaseDateText: string;
  expiryDateText: string;
  remindDaysBefore: number;
  remindAfterDays: number;
  purchasePriceText: string;
  salePriceText: string;
  profitText: string;
  ownerName: string;
  buyerName: string;
  usageMode: SubscriptionUsageMode;
  stage: SubscriptionReminderStage;
  adminContact: ReminderAdminContact;
};

export function ymdToViDate(input: string | null): string {
  if (!input) return "—";
  const [year, month, day] = input.split("-");
  if (!year || !month || !day) return input;
  return `${day}/${month}/${year}`;
}

export function formatMoney(raw: string | null, currency: string): string {
  if (!raw) return "—";
  const value = Number(raw);
  if (!Number.isFinite(value)) return "—";
  return `${value.toLocaleString("vi-VN")} ${currency === "VND" ? "đ" : currency}`;
}

export function buildReminderSubject(input: {
  stage: SubscriptionReminderStage;
  audience: ReminderAudience;
  serviceTitle: string;
  expiryDateText: string;
}): string {
  if (input.stage === "AFTER") {
    return `[Quá hạn] ${input.serviceTitle} đã quá hạn từ ${input.expiryDateText}`;
  }
  return `[Nhắc hạn] ${input.serviceTitle} sẽ đến hạn vào ${input.expiryDateText}`;
}

export function buildReminderHtml(input: {
  payload: ReminderRuntimePayload;
  audience: ReminderAudience;
}): string {
  const { payload, audience } = input;
  const stageSentence =
    payload.stage === "AFTER"
      ? "đã quá hạn dịch vụ sẽ sớm dừng hoạt động nhé."
      : "khách hàng sắp hết hạn rồi nhé.";
  const greetingName = audience === "BUYER" ? payload.buyerName : payload.ownerName;
  const showBuyerBlock = audience === "BUYER";

  const buyerContactRows = showBuyerBlock
    ? `
      <tr><td style="padding:4px 0;color:#334155;">Liên hệ với ADMIN: <strong>${payload.adminContact.name || "ADMIN"}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#334155;">Zalo: <strong>${payload.adminContact.zalo || "—"}</strong></td></tr>
      ${
        payload.adminContact.facebookUrl
          ? `<tr><td style="padding:4px 0;color:#334155;">Facebook: <a href="${payload.adminContact.facebookUrl}" style="color:#059669;font-weight:700;text-decoration:underline;">Liên hệ qua Facebook</a></td></tr>`
          : ""
      }
    `
    : `
      <tr><td style="padding:4px 0;color:#334155;">Giá nhập: <strong>${payload.purchasePriceText}</strong></td></tr>
      <tr><td style="padding:4px 0;color:#334155;">Lợi nhuận ước tính: <strong style="color:#047857;">${payload.profitText}</strong></td></tr>
    `;

  return `
<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:16px 20px;background:linear-gradient(90deg,#059669,#10b981);color:#ffffff;">
                <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;opacity:.9;">LumiTask Reminder</div>
                <div style="margin-top:8px;font-size:18px;font-weight:700;line-height:1.4;">
                  ${payload.stage === "AFTER" ? "QUÁ HẠN" : "SẮP ĐẾN HẠN"} · ${payload.serviceTitle}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 20px;color:#334155;font-size:14px;line-height:1.65;">
                <p style="margin:0 0 12px 0;">Xin chào <strong>${greetingName}</strong>, ${stageSentence}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc;padding:12px;">
                  <tr><td style="padding:4px 0;color:#0f172a;font-size:16px;font-weight:700;">${payload.serviceTitle}</td></tr>
                  <tr><td style="padding:0 0 8px 0;color:#64748b;font-size:12px;">${payload.categoryName}</td></tr>
                  <tr><td style="padding:4px 0;color:#334155;">Ngày mua: <strong>${payload.purchaseDateText}</strong></td></tr>
                  <tr><td style="padding:4px 0;color:#334155;">Ngày hết hạn: <strong>${payload.expiryDateText}</strong></td></tr>
                </table>
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff;padding:12px;">
                  <tr><td style="padding:4px 0;color:#334155;">Giá dịch vụ: <strong>${payload.salePriceText}</strong></td></tr>
                  ${buyerContactRows}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 20px;border-top:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:11px;">
                Email tự động bởi LumiTask. Vui lòng không phản hồi email này.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
