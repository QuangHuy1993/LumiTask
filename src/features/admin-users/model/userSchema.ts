import { z } from "zod";
import type { UserRole } from "@/lib/auth/session";

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/;

const emailInputSchema = z
  .string()
  .trim()
  .max(255, "Email quá dài")
  .refine((v) => v === "" || z.string().email().safeParse(v).success, "Email không hợp lệ")
  .transform((v) => (v === "" ? "" : v.toLowerCase()));

export const createUserSchema = z.object({
  username: z
    .string()
    .min(3, "Tên đăng nhập tối thiểu 3 ký tự")
    .max(50, "Tên đăng nhập quá dài")
    .regex(/^[a-zA-Z0-9_]+$/, "Tên đăng nhập chỉ được dùng chữ cái, số và _"),
  email: emailInputSchema.default(""),
  password: z
    .string()
    .min(8, "Mật khẩu tối thiểu 8 ký tự")
    .max(128, "Mật khẩu quá dài")
    .regex(PASSWORD_REGEX, "Mật khẩu cần chứa chữ hoa, số và ký tự đặc biệt"),
  fullName: z.string().max(100, "Họ tên quá dài").optional().default(""),
  role: z.enum(["OWNER", "LIMITED"] as [UserRole, UserRole]),
});

export const updateUserSchema = z.object({
  fullName: z.string().max(100, "Họ tên quá dài").optional().default(""),
  email: emailInputSchema.default(""),
  role: z.enum(["OWNER", "LIMITED"] as [UserRole, UserRole]),
  password: z
    .string()
    .max(128, "Mật khẩu quá dài")
    .refine(
      (val) => val === "" || (val.length >= 8 && PASSWORD_REGEX.test(val)),
      "Mật khẩu cần ít nhất 8 ký tự, chữ hoa, số và ký tự đặc biệt"
    )
    .optional()
    .default(""),
});

// Form value types (raw inputs used in React forms)
export type CreateUserFormValues = z.input<typeof createUserSchema>;
export type UpdateUserFormValues = z.input<typeof updateUserSchema>;

// Parsed DTO types used in services/actions after Zod validation
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export type UserDTO = {
  id: number;
  username: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  lastLoginAt: Date | null;
};
