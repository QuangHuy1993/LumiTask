import { toast } from "sonner";

/** Cho phép xóa hết ô; chỉ giữ chữ số, tối đa 3 ký tự (0–90). */
export function sanitizeReminderDaysDraft(raw: string): string {
  if (raw === "") return "";
  return raw.replace(/\D/g, "").slice(0, 3);
}

export function clampReminderDaysOnBlur(raw: string): string {
  if (raw === "") return "";
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return "";
  return String(Math.min(90, Math.max(0, n)));
}

export function parseReminderDaysForSubmit(raw: string, label: string): number | null {
  if (raw.trim() === "") {
    toast.error(`${label}: nhập số ngày (0–90).`);
    return null;
  }
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0 || n > 90) {
    toast.error(`${label}: giá trị từ 0 đến 90.`);
    return null;
  }
  return n;
}
