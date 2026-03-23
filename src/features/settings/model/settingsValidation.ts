import { z } from "zod";

// --- Tab 1: Security ---

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: z
      .string()
      .min(8, "Mật khẩu mới tối thiểu 8 ký tự")
      .max(128, "Mật khẩu quá dài")
      .regex(
        /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/,
        "Mật khẩu cần chứa chữ hoa, số và ký tự đặc biệt"
      ),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Xác nhận mật khẩu không khớp",
    path: ["confirmPassword"],
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    message: "Mật khẩu mới không được trùng mật khẩu cũ",
    path: ["newPassword"],
  });

export const totpCodeSchema = z.object({
  code: z
    .string()
    .regex(/^\d{6}$/, "Mã xác thực phải gồm đúng 6 chữ số"),
});

export const disableTwoFactorSchema = z.object({
  confirmPassword: z.string().min(1, "Vui lòng nhập mật khẩu để xác nhận"),
  code: z.string().regex(/^\d{6}$/, "Mã xác thực phải gồm đúng 6 chữ số"),
});

import { SUPPORTED_BANKS } from "./bankList";

const bankIds = [SUPPORTED_BANKS[0].id, ...SUPPORTED_BANKS.slice(1).map((b) => b.id)] as [
  (typeof SUPPORTED_BANKS)[number]["id"],
  ...(typeof SUPPORTED_BANKS)[number]["id"][]
];

export const bankAccountSchema = z.object({
  bankId: z.enum(bankIds).refine((val) => bankIds.includes(val), {
    message: "Ngân hàng không nằm trong danh sách hỗ trợ",
  }),
  accountNo: z
    .string()
    .regex(/^\d{6,20}$/, "Số tài khoản chỉ chứa số, từ 6 - 20 ký tự"),
  accountName: z
    .string()
    .trim()
    .min(2, "Tên chủ tài khoản tối thiểu 2 ký tự")
    .max(100, "Tên chủ tài khoản quá dài")
    .transform(val => val.toUpperCase()),
  logoURL: z.string().url("URL logo không hợp lệ").optional().or(z.literal("")),
  isDefault: z.boolean().optional().default(false),
});

// --- Tab 4: App Settings ---

export const appSettingSchema = z.object({
  key: z
    .string()
    .min(1, "Key là bắt buộc")
    .max(100, "Key quá dài")
    .regex(/^[a-z][a-z0-9_]*$/, "Key phải theo định dạng snake_case"),
  value: z.string().min(1, "Value là bắt buộc").max(10000, "Value quá dài"),
  description: z.string().max(500).optional(),
}).superRefine((data, ctx) => {
  if (data.key === "trading_admin_email") {
    const emailCheck = z.string().trim().email("Email admin không hợp lệ").safeParse(data.value);
    if (!emailCheck.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Email admin không hợp lệ",
      });
    }
  }
});

export const aiSettingSchema = z.object({
  name: z.string().min(2, "Tên profile tối thiểu 2 ký tự").max(100),
  provider: z.enum(["OPENAI", "GROQ", "ANTHROPIC", "CUSTOM"]),
  model: z.string().min(1, "Vui lòng chọn hoặc nhập model"),
  baseUrl: z.string().url("URL không hợp lệ").optional().or(z.literal("")),
  apiKey: z.string().max(512, "API Key quá dài").optional().or(z.literal("")),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().int().min(1).max(128000).optional().default(4096),
  isDefault: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});
