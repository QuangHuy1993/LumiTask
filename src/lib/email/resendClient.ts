import { buildFromAddress, getEmailConfig } from "@/lib/email/emailConfig";

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  idempotencyKey: string;
};

export type SendEmailResult =
  | { ok: true; providerId?: string }
  | { ok: false; status: number; code: string; message: string; shouldRetry: boolean };

function classifyRetry(status: number, code: string): boolean {
  if (status === 429) return true;
  if (status === 409 && code === "concurrent_idempotent_requests") return true;
  return false;
}

export async function sendEmailViaResend(input: SendEmailInput): Promise<SendEmailResult> {
  const cfg = getEmailConfig();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": input.idempotencyKey,
    },
    body: JSON.stringify({
      from: buildFromAddress(cfg),
      to: input.to,
      reply_to: cfg.replyTo,
      subject: input.subject,
      html: input.html,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { id?: string; name?: string; message?: string }
    | null;

  if (response.ok) {
    return { ok: true, providerId: payload?.id };
  }

  const code = payload?.name || `http_${response.status}`;
  const message = payload?.message || "Resend request failed";
  return {
    ok: false,
    status: response.status,
    code,
    message,
    shouldRetry: classifyRetry(response.status, code),
  };
}
