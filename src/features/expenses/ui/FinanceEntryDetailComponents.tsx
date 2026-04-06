import React from "react";
import { X, Pencil, Trash2, CheckCircle2, Clock3, BanIcon } from "lucide-react";

import type { EntryListItemDTO } from "@/features/expenses/model/financeEntryTypes";

function KindBadge({ kind }: { kind: string }) {
  if (kind === "INCOME") return <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">Thu nhập</span>;
  if (kind === "EXPENSE") return <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-error/10 text-error text-[10px] font-bold uppercase tracking-wider">Chi tiêu</span>;
  return <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-on-surface-variant/10 text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">Chuyển khoản</span>;
}

function LifecycleBadge({ status }: { status: string }) {
  if (status === "POSTED") return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary"><CheckCircle2 className="size-3" /> Đã thực hiện</span>;
  if (status === "PLANNED") return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#7a5900]"><Clock3 className="size-3" /> Dự kiến</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] font-bold text-on-surface-variant"><BanIcon className="size-3" /> Đã hủy</span>;
}

export function AmountText({ entry }: { entry: EntryListItemDTO }) {
  if (entry.lifecycleStatus === "VOIDED") return <span className="text-sm font-black text-on-surface-variant line-through">{entry.amountText}</span>;
  if (entry.entryKind === "INCOME") return <span className="text-sm font-black text-primary">+{entry.amountText}</span>;
  if (entry.entryKind === "EXPENSE") return <span className="text-sm font-black text-error">-{entry.amountText}</span>;
  return <span className="text-sm font-black text-on-surface-variant">{entry.amountText}</span>;
}

export function FinanceEntryDetailDrawer({ entry, onClose, onEdit, onDelete }: { entry: EntryListItemDTO; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  if (!entry) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-moss-900/70" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal
        className="relative z-10 flex w-full max-w-lg md:max-w-xl flex-col max-h-[min(92vh,800px)] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
      >
        <div className={`shrink-0 px-5 pt-4 pb-3 md:px-6 md:pt-5 md:pb-4 ${entry.entryKind === "INCOME" ? "bg-primary/5" : entry.entryKind === "EXPENSE" ? "bg-error/5" : "bg-surface-container-low"}`}>
          <div className="flex items-start justify-between gap-3">
            <KindBadge kind={entry.entryKind} />
            <button type="button" onClick={onClose} className="shrink-0 p-2 hover:bg-white/60 rounded-xl transition-colors" aria-label="Đóng">
              <X className="size-5 text-on-surface-variant" />
            </button>
          </div>
          <div className="mt-3 flex items-start gap-3">
            <div className="text-3xl md:text-4xl leading-none">{entry.categoryIcon}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-on-surface-variant line-clamp-2">
                {entry.categoryName ?? (entry.isTransfer ? "Chuyển khoản" : "Không có danh mục")}
              </p>
              <div className="mt-1 text-xl md:text-2xl font-black">
                <AmountText entry={entry} />
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6 scrollbar-primary-thin">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {[
              ["Ngày", `${entry.occurredAtText ?? entry.occurredAt}`],
              ["Ví", entry.walletName],
              ["Trạng thái", ""],
              ["Tiền tệ", entry.currency],
            ].map(([label, val], idx) => (
              <div key={idx} className="bg-surface-container-low p-2.5 sm:p-3 rounded-xl">
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1">{label}</p>
                {label === "Trạng thái"
                  ? <LifecycleBadge status={entry.lifecycleStatus} />
                  : <p className="text-xs sm:text-sm font-bold text-on-surface break-words">{val}</p>
                }
              </div>
            ))}
          </div>
          {entry.note && (
            <div className="mt-3 bg-surface-container-low p-3 rounded-xl">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-1.5">Ghi chú</p>
              <p className="text-xs sm:text-sm text-on-surface italic leading-relaxed">{entry.note}</p>
            </div>
          )}
          {entry.tagNames?.length > 0 && (
            <div className="mt-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {entry.tagNames.map((t: string) => (
                  <span key={t} className="px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-[11px] font-bold">#{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 flex gap-2 sm:gap-3 border-t border-outline-variant/10 p-3 sm:p-4 md:px-6">
          <button type="button" onClick={onEdit} className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 bg-surface-container-low rounded-xl text-xs sm:text-sm font-bold text-on-surface hover:bg-surface-container transition-colors">
            <Pencil className="size-4 shrink-0" /> Sửa
          </button>
          <button type="button" onClick={onDelete} className="flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 bg-error/10 rounded-xl text-xs sm:text-sm font-bold text-error hover:bg-error/15 transition-colors">
            <Trash2 className="size-4 shrink-0" /> Xóa
          </button>
        </div>
      </div>
    </div>
  );
}

export function FinanceDeleteConfirmModal({ entry, onClose, onConfirm }: { entry: EntryListItemDTO; onClose: () => void; onConfirm: () => void }) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isClosing, setIsClosing] = React.useState(false);

  if (!entry) return null;

  const handleConfirmClick = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await onConfirm();
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 220);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-moss-900/70" onClick={isSubmitting ? undefined : onClose} />
      <div
        className={`relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 transform transition-all duration-200 ${
          isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        <div className="w-12 h-12 bg-error/10 rounded-2xl flex items-center justify-center text-error mb-4">
          <Trash2 className="size-6" />
        </div>
        <h3 className="text-lg font-bold text-on-surface mb-2">Xóa giao dịch?</h3>
        <p className="text-sm text-on-surface-variant mb-6">
          Bạn chắc chắn muốn xóa giao dịch{" "}
          <span className="font-bold">&quot;{entry.categoryName ?? "Chuyển khoản"}&quot;</span> —{" "}
          <AmountText entry={entry} />?
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              if (isSubmitting) return;
              onClose();
            }}
            className="flex-1 py-3 bg-surface-container-low rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            onClick={() => { void handleConfirmClick(); }}
            className="flex-1 py-3 bg-error text-white rounded-xl text-sm font-bold shadow-lg active:scale-95 transition-all disabled:opacity-60"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Đang xóa..." : "Xóa"}
          </button>
        </div>
      </div>
    </div>
  );
}
