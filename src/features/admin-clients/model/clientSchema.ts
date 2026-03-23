import { z } from "zod";

export const ClientSchema = z.object({
  name: z.string().min(2, "Tên khách hàng phải có ít nhất 2 ký tự"),
  email: z.string().email("Địa chỉ email không hợp lệ").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  zalo: z.string().optional().or(z.literal("")),
  note: z.string().optional().or(z.literal("")),
});

export type ClientInput = z.infer<typeof ClientSchema>;

export interface ClientDTO {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  zalo: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    jobs: number;
  };
}

export interface ClientStats {
  total: number;
  active: number;
  monthNew: number;
  online: number;
}
