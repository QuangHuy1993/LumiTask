/** Trần hợp lý cho hạn mức VND (12 chữ số ~ tỷ) */
const MAX_VND_INPUT = 999_999_999_999;

/**
 * Chỉ giữ chữ số, trả về số nguyên (0 nếu rỗng / không hợp lệ).
 */
export function parseVndDigits(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.floor(n), MAX_VND_INPUT);
}

/**
 * Hiển thị nhóm nghìn kiểu vi-VN (dấu chấm). Rỗng nếu n <= 0 và không muốn hiện 0.
 */
export function formatVndDigits(n: number, options?: { showZero?: boolean }): string {
  if (!Number.isFinite(n) || n < 0) return "";
  if (n === 0 && !options?.showZero) return "";
  return new Intl.NumberFormat("vi-VN").format(Math.floor(n));
}
