/**
 * Chuyển tên hiển thị (UTF-8, có dấu tiếng Việt) thành slug hợp lệ cho FinanceCategory
 * (chữ thường, số, dấu `-`).
 */
export function displayNameToFinanceCategorySlug(raw: string): string {
  const stripped = raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d");
  return stripped
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}
