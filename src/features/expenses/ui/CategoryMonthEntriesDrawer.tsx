"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { getCategoryMonthEntriesLiteAction } from "@/features/expenses/actions/financeEntryActions";
import type { EntryListItemDTO } from "@/features/expenses/model/financeEntryTypes";

type CategoryMeta = {
  id: number;
  name: string;
  icon?: string | null;
  color?: string | null;
};

type HeaderStats = {
  spent?: number;
  limit?: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  periodKey: string; // YYYY-MM
  category: CategoryMeta | null;
  headerStats?: HeaderStats;
};

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(Math.round(n));

function monthLabelFromPeriodKey(periodKey: string): string {
  const [y, m] = periodKey.split("-").map(Number);
  if (!y || !m) return periodKey;
  return `Tháng ${m}/${y}`;
}

function titleFromEntry(e: EntryListItemDTO): string {
  const note = e.note?.trim();
  if (note) return note;
  if (e.entryKind === "EXPENSE") return "Chi tiêu";
  if (e.entryKind === "INCOME") return "Thu nhập";
  return "Giao dịch";
}

export function CategoryMonthEntriesDrawer({ open, onClose, periodKey, category, headerStats }: Props) {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<EntryListItemDTO[]>([]);
  const [nextCursorId, setNextCursorId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestedKeyRef = useRef<string>("");

  const categoryId = category?.id ?? null;
  const drawerTitle = category ? category.name : "Danh mục";
  const monthLabel = useMemo(() => monthLabelFromPeriodKey(periodKey), [periodKey]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const fetchPage = useCallback(
    async (opts?: { cursorId?: number; append?: boolean }) => {
      if (!categoryId) return;
      const isAppend = Boolean(opts?.append);
      if (isAppend) setLoadingMore(true);
      else setLoading(true);

      try {
        const res = await getCategoryMonthEntriesLiteAction({
          periodKey,
          categoryId,
          limit: 20,
          cursorId: opts?.cursorId,
        });

        if (!res.success) {
          toast.error("Không tải được giao dịch danh mục", {
            description: res.error === "UNAUTHENTICATED" ? "Bạn cần đăng nhập lại." : "Thử lại sau.",
          });
          return;
        }

        setNextCursorId(res.nextCursorId ?? null);
        setItems((prev) => (isAppend ? [...prev, ...(res.items ?? [])] : (res.items ?? [])));
      } finally {
        if (isAppend) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [categoryId, periodKey],
  );

  useEffect(() => {
    if (!open) return;
    if (!categoryId) return;
    const key = `${periodKey}:${categoryId}`;
    if (requestedKeyRef.current === key) return;
    requestedKeyRef.current = key;
    setItems([]);
    setNextCursorId(null);
    void fetchPage();
  }, [open, categoryId, periodKey, fetchPage]);

  if (!mounted) return null;
  if (!open) return null;

  const spent = headerStats?.spent;
  const limit = headerStats?.limit;
  const remaining =
    limit != null && Number.isFinite(limit) && spent != null && Number.isFinite(spent) ? Math.round(limit - spent) : null;

  const content = (
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-label="Chi tiết danh mục">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" onMouseDown={onClose} />

      <div
        className="absolute right-0 top-0 h-full w-full sm:max-w-[680px] bg-white shadow-2xl border-l border-outline-variant/20 flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-outline-variant/15">
          <div className="px-4 sm:px-6 py-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl text-lg"
                  style={category?.color ? { backgroundColor: `${category.color}22`, color: category.color } : undefined}
                >
                  {category?.icon ?? "📁"}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-on-surface truncate">{drawerTitle}</h3>
                  <p className="text-[10px] sm:text-xs text-on-surface-variant font-bold uppercase tracking-widest opacity-70">
                    {monthLabel}
                  </p>
                </div>
              </div>

              {(spent != null || limit != null) && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-on-surface-variant">
                  {spent != null ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1">
                      Đã chi <span className="text-error tabular-nums">{fmt(spent)} đ</span>
                    </span>
                  ) : null}
                  {limit != null ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1">
                      Hạn mức <span className="text-on-surface tabular-nums">{fmt(limit)} đ</span>
                    </span>
                  ) : null}
                  {remaining != null ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-low px-3 py-1">
                      {remaining >= 0 ? "Còn lại" : "Vượt mức"}{" "}
                      <span className={remaining >= 0 ? "text-primary tabular-nums" : "text-error tabular-nums"}>
                        {remaining >= 0 ? fmt(remaining) : `-${fmt(Math.abs(remaining))}`} đ
                      </span>
                    </span>
                  ) : null}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-outline-variant/20 bg-white hover:bg-surface-container-low transition-colors"
              aria-label="Đóng"
            >
              <X className="size-4 text-on-surface-variant" />
            </button>
          </div>

          <div className="px-4 sm:px-6 pb-3 flex items-center justify-between gap-3">
            <p className="text-[10px] sm:text-xs font-bold text-on-surface-variant/70 uppercase tracking-widest">
              Danh sách giao dịch (chi)
            </p>
            {loading ? (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                <Loader2 className="size-4 animate-spin" />
                Đang tải...
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!categoryId ? (
            <div className="p-6 text-sm text-on-surface-variant">Không có danh mục.</div>
          ) : loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 rounded-2xl bg-surface-container-low animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto mb-3 size-14 rounded-2xl bg-surface-container-low flex items-center justify-center">
                <ChevronRight className="size-6 text-on-surface-variant/40" />
              </div>
              <p className="text-sm font-bold text-on-surface-variant/70">Chưa có giao dịch chi trong danh mục này.</p>
              <p className="text-xs text-on-surface-variant/50 mt-1">Thử chọn danh mục khác hoặc kiểm tra lại tháng.</p>
            </div>
          ) : (
            <>
              <div className="hidden sm:block">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white">
                    <tr className="border-b border-outline-variant/10">
                      {["Ngày", "Ghi chú", "Ví", "Số tiền"].map((h, i) => (
                        <th
                          key={h}
                          className={`px-6 py-3 text-[10px] font-black text-on-surface-variant uppercase tracking-widest ${
                            i === 3 ? "text-right" : ""
                          }`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5">
                    {items.map((e) => {
                      const dateStr = new Intl.DateTimeFormat("vi-VN", {
                        day: "2-digit",
                        month: "2-digit",
                      }).format(new Date(e.occurredAt));
                      return (
                        <tr key={e.id} className="hover:bg-surface-container-low/30 transition-colors">
                          <td className="px-6 py-3">
                            <span className="text-xs font-bold text-on-surface tabular-nums">{dateStr}</span>
                          </td>
                          <td className="px-4 py-3 min-w-0">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-on-surface line-clamp-1">{titleFromEntry(e)}</p>
                              {e.note?.trim() ? null : (
                                <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest mt-0.5">
                                  {e.categoryName ?? "—"}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex max-w-[220px] truncate rounded-lg bg-surface-container-low px-2.5 py-1 text-[10px] font-bold text-on-surface">
                              {e.walletName}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right">
                            <span className="text-sm font-black text-error tabular-nums">-{fmt(e.amountRaw)} đ</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="sm:hidden divide-y divide-outline-variant/10">
                {items.map((e) => {
                  const dateStr = new Intl.DateTimeFormat("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "2-digit",
                  }).format(new Date(e.occurredAt));
                  return (
                    <div key={e.id} className="p-4 active:bg-surface-container-low transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-on-surface line-clamp-1">{titleFromEntry(e)}</p>
                          <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest mt-1 line-clamp-1">
                            {dateStr} • {e.walletName}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-black text-error tabular-nums">-{fmt(e.amountRaw)} đ</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 sm:p-6 flex items-center justify-between gap-3 border-t border-outline-variant/10 bg-white">
                <p className="text-[10px] sm:text-xs font-medium text-on-surface-variant">
                  {items.length} giao dịch
                </p>
                {nextCursorId ? (
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={() => void fetchPage({ cursorId: nextCursorId, append: true })}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black text-white shadow-lg shadow-primary/20 hover:brightness-105 disabled:opacity-60"
                  >
                    {loadingMore ? <Loader2 className="size-4 animate-spin" /> : null}
                    Tải thêm
                  </button>
                ) : (
                  <span className="text-[10px] sm:text-xs font-bold text-on-surface-variant/60 uppercase tracking-widest">
                    Hết
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}

