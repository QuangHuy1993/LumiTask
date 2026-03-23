import { z } from "zod";

/**
 * Bảng màu gợi ý cho môn học
 */
export const SUBJECT_COLORS = [
  { name: "Blue", hex: "#3B82F6" },
  { name: "Red", hex: "#EF4444" },
  { name: "Green", hex: "#10B981" },
  { name: "Yellow", hex: "#F59E0B" },
  { name: "Indigo", hex: "#6366F1" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Purple", hex: "#8B5CF6" },
  { name: "Orange", hex: "#F97316" },
];

/**
 * Zod Schema cho Môn học
 */
export const SubjectSchema = z.object({
  name: z.string()
    .trim()
    .min(2, "Tên môn học phải từ 2-100 ký tự")
    .max(100, "Tên môn học quá dài"),
  code: z.string()
    .trim()
    .toUpperCase()
    .min(2, "Mã môn học từ 2-10 ký tự")
    .max(10, "Mã môn học tối đa 10 ký tự")
    .regex(/^[A-Z0-9_\-]+$/, "Mã chỉ chứa chữ, số, gạch ngang và gạch dưới")
    .optional()
    .or(z.literal('')),
  color: z.string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Mã màu Hex không hợp lệ")
});

export type SubjectInput = z.infer<typeof SubjectSchema>;

/**
 * Interface cho dữ liệu trả về từ API/Service
 */
export interface SubjectDTO {
  id: number;
  name: string;
  code: string | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    jobs: number;
  };
}
