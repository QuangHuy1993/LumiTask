"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { upsertFinanceBudgetPeriodAction } from "@/features/expenses/actions/financeBudgetActions";
import type { FinanceBudgetPeriodDetailDTO } from "@/features/expenses/model/financeBudgetTypes";
import type { FinanceCategoryListItemDTO } from "@/features/expenses/model/financeCategoryTypes";
import { formatVndDigits, parseVndDigits } from "@/features/expenses/utils/vndInputFormat";

export type BudgetLineForm = {
  categoryId: number;
  limitAmount: number;
};

export function FinanceBudgetPeriodEditorModal({
  open,
  onClose,
  periodKey,
  existingDetail,
  expenseCategories,
  activeCategoriesForNewLine,
  rawExpenseCategoryCount,
  categoriesLoading,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  periodKey: string;
  existingDetail: FinanceBudgetPeriodDetailDTO | null;
  expenseCategories: FinanceCategoryListItemDTO[];
  /** Chỉ danh mục đang hoạt động — dùng khi thêm dòng mới */
  activeCategoriesForNewLine: FinanceCategoryListItemDTO[];
  /** Số danh mục chi (EXPENSE) từ API — để phát hiện “có danh mục nhưng đều tắt” */
  rawExpenseCategoryCount: number;
  categoriesLoading: boolean;
  onSaved: (result: { detail: FinanceBudgetPeriodDetailDTO | null; created: boolean }) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [overallLimit, setOverallLimit] = useState<number | "">("");
  const [lines, setLines] = useState<BudgetLineForm[]>([]);

  useEffect(() => {
    if (!open) return;
    if (existingDetail) {
      setNote(existingDetail.note ?? "");
      setOverallLimit(
        existingDetail.overallLimitAmount !== null ? existingDetail.overallLimitAmount : "",
      );
      setLines(
        existingDetail.lines.map((l) => ({
          categoryId: l.categoryId,
          limitAmount: l.limitAmount,
        })),
      );
    } else {
      setNote("");
      setOverallLimit("");
      setLines([]);
    }
  }, [open, existingDetail, periodKey]);

  const usedCategoryIds = useMemo(() => new Set(lines.map((l) => l.categoryId)), [lines]);

  const totalLineLimits = useMemo(
    () => lines.reduce((s, l) => s + Math.max(0, l.limitAmount), 0),
    [lines],
  );

  const overallCapNum = overallLimit === "" ? null : overallLimit;
  const hasOverallCap = overallCapNum !== null && overallCapNum > 0;
  const unallocatedToCategories = hasOverallCap
    ? Math.max(0, overallCapNum - totalLineLimits)
    : null;
  const categoryLimitsExceedOverall = hasOverallCap && totalLineLimits > overallCapNum;

  const allExpenseCategoriesInactive =
    !categoriesLoading &&
    rawExpenseCategoryCount > 0 &&
    activeCategoriesForNewLine.length === 0;

  const addLineDisabled =
    categoriesLoading || activeCategoriesForNewLine.length === 0;

  const addLine = () => {
    const next = activeCategoriesForNewLine.find((c) => !usedCategoryIds.has(c.id));
    if (!next) {
      if (allExpenseCategoriesInactive) {
        toast.message("Không có danh mục chi đang bật", {
          description: "Bật lại danh mục trong Danh mục thu chi hoặc tạo danh mục chi mới.",
        });
      } else {
        toast.message("Không còn danh mục chi để thêm", {
          description: "Tạo thêm danh mục loại Chi tại Danh mục thu chi.",
        });
      }
      return;
    }
    setLines((prev) => [...prev, { categoryId: next.id, limitAmount: 0 }]);
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, patch: Partial<BudgetLineForm>) => {
    setLines((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const res = await upsertFinanceBudgetPeriodAction({
        periodKey,
        currency: "VND",
        overallLimitAmount:
          overallLimit === "" ? null : Number(overallLimit),
        note: note.trim() || null,
        lines: lines
          .filter((l) => l.limitAmount > 0)
          .map((l) => ({
            categoryId: l.categoryId,
            limitAmount: l.limitAmount,
          })),
      });
      if (!res.success) {
        if (res.error === "INVALID_CATEGORY") {
          toast.error("Danh mục không hợp lệ", {
            description: "Chỉ dùng danh mục chi đang hoạt động.",
          });
        } else {
          toast.error("Không lưu được ngân sách");
        }
        return;
      }
      toast.success(existingDetail ? "Đã cập nhật ngân sách" : "Đã tạo ngân sách");
      onSaved({ detail: res.detail, created: res.created });
      onClose();
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-moss-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-moss-100 shrink-0">
          <div>
            <h3 className="text-lg font-bold text-on-surface">
              {existingDetail ? "Sửa ngân sách" : "Lập ngân sách"} — {periodKey}
            </h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Chỉ dùng danh mục <span className="font-semibold text-on-surface">Chi</span> (chi tiêu), VND.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-moss-400 hover:text-moss-700 hover:bg-moss-50 rounded-xl transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 min-h-0">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">
              Ghi chú (tuỳ chọn)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none resize-none"
              placeholder="VD: Tháng Tết, chi tiêu cao hơn..."
            />
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">
              Hạn mức tổng tháng (tuỳ chọn)
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
              <div className="min-w-0">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">
                  Nhập tổng
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={overallLimit === "" ? "" : formatVndDigits(overallLimit)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw.replace(/\D/g, "") === "") {
                      setOverallLimit("");
                      return;
                    }
                    setOverallLimit(parseVndDigits(raw));
                  }}
                  className="w-full bg-surface-container-low border-none rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm tabular-nums focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder="Để trống = không giới hạn"
                />
              </div>
              <div className="min-w-0">
                <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1 block">
                  Chưa gán vào danh mục
                </label>
                <div
                  className={`flex min-h-[42px] items-center rounded-xl border px-3 py-2.5 text-sm tabular-nums sm:min-h-[46px] sm:px-4 sm:py-3 ${
                    hasOverallCap
                      ? categoryLimitsExceedOverall
                        ? "border-error/30 bg-error/5 font-semibold text-error"
                        : "border-outline-variant/15 bg-surface-container-low/80 font-semibold text-on-surface"
                      : "border-outline-variant/10 bg-surface-container-low/50 text-on-surface-variant"
                  }`}
                  aria-live="polite"
                >
                  {hasOverallCap && unallocatedToCategories !== null
                    ? formatVndDigits(unallocatedToCategories, { showZero: true })
                    : "—"}
                  {hasOverallCap ? <span className="ml-1 text-xs font-medium text-on-surface-variant">đ</span> : null}
                </div>
                {!hasOverallCap ? (
                  <p className="mt-1 text-[10px] leading-snug text-on-surface-variant">
                    Nhập hạn mức tổng để xem phần còn lại chưa phân bổ cho các danh mục.
                  </p>
                ) : null}
                {categoryLimitsExceedOverall ? (
                  <p className="mt-1 text-[11px] font-semibold text-error">
                    Tổng hạn mức danh mục đang vượt hạn mức tổng.
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                Theo danh mục
              </span>
              <button
                type="button"
                onClick={addLine}
                disabled={addLineDisabled}
                title={
                  addLineDisabled
                    ? activeCategoriesForNewLine.length === 0 && rawExpenseCategoryCount > 0
                      ? "Tất cả danh mục chi đang tắt — bật trong Danh mục thu chi"
                      : "Không có danh mục chi khả dụng để thêm"
                    : "Thêm hạn mức theo một danh mục chi"
                }
                aria-disabled={addLineDisabled}
                className="text-xs font-bold text-primary flex items-center gap-1 hover:underline disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              >
                <Plus className="size-3.5" />
                Thêm dòng
              </button>
            </div>

            {allExpenseCategoriesInactive ? (
              <div className="rounded-xl border border-error/25 bg-error/5 px-3 py-2.5 text-sm text-on-surface">
                <p className="font-semibold text-error">Danh mục chi đang tắt</p>
                <p className="text-on-surface-variant mt-1 text-xs leading-relaxed">
                  Bạn có danh mục loại Chi nhưng chưa bật hiển thị. Vào{" "}
                  <Link href="/expenses/categories" className="text-primary font-bold underline">
                    Danh mục thu chi
                  </Link>{" "}
                  và bật trạng thái hoạt động cho từng danh mục cần đặt hạn mức.
                </p>
              </div>
            ) : null}

            {categoriesLoading ? (
              <p className="text-sm text-on-surface-variant py-2 flex items-center gap-2">
                <Loader2 className="size-4 animate-spin shrink-0" />
                Đang tải danh mục chi...
              </p>
            ) : expenseCategories.length === 0 ? (
              <p className="text-sm text-on-surface-variant py-2">
                Chưa có danh mục <span className="font-semibold text-on-surface">Chi</span> (chi tiêu). Danh mục Thu
                không dùng cho ngân sách.{" "}
                <Link href="/expenses/categories" className="text-primary font-bold underline">
                  Tạo danh mục chi
                </Link>
                .
              </p>
            ) : lines.length === 0 && !allExpenseCategoriesInactive ? (
              <p className="text-sm text-on-surface-variant py-2">Chưa có dòng nào — bấm &quot;Thêm dòng&quot;.</p>
            ) : lines.length === 0 ? null : (
              <ul className="space-y-2 sm:space-y-3">
                {lines.map((row, index) => (
                  <li
                    key={`${row.categoryId}-${index}`}
                    className="rounded-xl border border-outline-variant/10 bg-surface-container-low/50 p-2.5 sm:p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2 sm:hidden">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Dòng {index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="min-h-11 min-w-11 -mr-1 flex shrink-0 items-center justify-center rounded-lg p-2 text-error hover:bg-error/10 touch-manipulation"
                        aria-label={`Xóa dòng ${index + 1}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2 min-[480px]:grid-cols-2 sm:flex sm:flex-row sm:items-end sm:gap-2">
                      <div className="min-w-0 flex-1">
                        <label className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant sm:mb-1">
                          Danh mục
                        </label>
                        <select
                          value={row.categoryId}
                          onChange={(e) =>
                            updateLine(index, { categoryId: Number(e.target.value) })
                          }
                          className="w-full rounded-lg border border-outline-variant/20 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          {expenseCategories
                            .filter(
                              (c) =>
                                c.id === row.categoryId ||
                                !lines.some((l, j) => j !== index && l.categoryId === c.id),
                            )
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      <div className="min-w-0 sm:w-36">
                        <label className="mb-1 block text-[10px] font-bold uppercase text-on-surface-variant sm:mb-1">
                          Hạn mức (đ)
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={formatVndDigits(row.limitAmount, { showZero: true })}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw.replace(/\D/g, "") === "") {
                              updateLine(index, { limitAmount: 0 });
                              return;
                            }
                            const n = parseVndDigits(raw);
                            updateLine(index, { limitAmount: Math.max(0, n) });
                          }}
                          className="w-full rounded-lg border border-outline-variant/20 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLine(index)}
                        className="hidden min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-error hover:bg-error/10 sm:flex touch-manipulation"
                        aria-label={`Xóa dòng ${index + 1}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex gap-3 px-4 sm:px-6 py-4 border-t border-moss-100 shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-surface-container-low text-on-surface-variant rounded-xl text-sm font-bold hover:bg-surface-container transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleSubmit}
            className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-105 disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}
