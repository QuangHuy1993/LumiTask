type EmailConfig = {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
};

function requireEnv(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required env: ${key}`);
  }
  return value;
}

export function getEmailConfig(): EmailConfig {
  const apiKey = requireEnv("RESEND_API_KEY");
  const fromEmail =
    process.env.RESEND_FROM_EMAIL?.trim() ||
    (process.env.NODE_ENV !== "production" ? "onboarding@resend.dev" : requireEnv("RESEND_FROM_EMAIL"));
  const fromName = process.env.RESEND_FROM_NAME?.trim() || "LumiTask Admin";
  const replyTo = process.env.RESEND_REPLY_TO?.trim() || undefined;

  return { apiKey, fromEmail, fromName, replyTo };
}

export function buildFromAddress(config: EmailConfig): string {
  return `${config.fromName} <${config.fromEmail}>`;
}
