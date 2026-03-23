import { z } from "zod";

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email hoặc tên đăng nhập")
    .max(255, "Tên đăng nhập quá dài")
    .refine((val) => val.length >= 3, "Email hoặc tên đăng nhập phải ít nhất 3 ký tự"),
  password: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu")
    .min(6, "Mật khẩu phải ít nhất 6 ký tự")
    .max(128, "Mật khẩu quá dài"),
  rememberMe: z.boolean().optional().default(false),
});

export type LoginSchemaInput = z.infer<typeof loginSchema>;
