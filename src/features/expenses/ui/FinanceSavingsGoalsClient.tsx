"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet,
  Target,
  CalendarCheck2,
  Plus,
  Eye,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Calendar,
  Brain,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import {
  contributeToGoalAction,
  createGoalAction,
  deleteContributionAction,
  deleteGoalAction,
  getGoalDetailAction,
  updateGoalAction,
} from "@/features/expenses/actions/financeSavingsGoalActions";
import type { FinanceCategoryListItemDTO } from "@/features/expenses/model/financeCategoryTypes";
import type { SavingsGoalDetailDTO, SavingsGoalListItemDTO } from "@/features/expenses/model/financeSavingsGoalTypes";
import type { FinanceWalletListItemDTO } from "@/features/expenses/model/financeWalletTypes";

type GoalStatus = "IN_PROGRESS" | "COMPLETED";

const fmt = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

const compactFmt = (n: number) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toString();
};

function formatDeadline(targetDate: string | null): string {
  if (!targetDate) return "Không có hạn";
  const d = new Date(targetDate);
  return `Hạn: ${d.toLocaleDateString("vi-VN")}`;
}

function goalStatus(goal: SavingsGoalListItemDTO): GoalStatus {
  return goal.savedAmount >= goal.targetAmount ? "COMPLETED" : "IN_PROGRESS";
}

function StatusBadge({ status }: { status: GoalStatus }) {
  if (status === "COMPLETED")
    return (
      <span className="bg-[#F0C05A]/20 text-[#7a5900] text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-full">
        Hoàn thành
      </span>
    );
  return (
    <span className="bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-full">
      Đang thực hiện
    </span>
  );
}

function AddGoalModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState(10_000_000);
  const [deadline, setDeadline] = useState("");
  const [icon, setIcon] = useState("🎯");
  const ICONS = ["🎯", "🏠", "💻", "✈️", "🛡️", "📚", "🚗", "💊", "🎓", "💍", "🏋️", "🌱"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-moss-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-5 border-b border-moss-100">
          <h3 className="text-lg font-bold text-on-surface">Thêm mục tiêu tiết kiệm</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-moss-400 hover:text-moss-700 hover:bg-moss-50 rounded-xl transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Tên mục tiêu</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Mua nhà"
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Số tiền mục tiêu (VND)</label>
            <input
              type="number"
              min={0}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Hạn chót</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Biểu tượng</label>
            <div className="grid grid-cols-6 gap-2">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    icon === ic ? "bg-primary/15 ring-2 ring-primary" : "bg-surface-container-low hover:bg-surface-container"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
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
            onClick={() => {
              if (!title.trim()) {
                toast.error("Vui lòng nhập tên mục tiêu");
                return;
              }
              startTransition(async () => {
                const res = await createGoalAction({
                  title: title.trim(),
                  icon,
                  targetAmount: target,
                  currency: "VND",
                  targetDate: deadline || undefined,
                  sortOrder: 0,
                });
                if (!res.success) {
                  toast.error("Không thể tạo mục tiêu");
                  return;
                }
                toast.success("Đã thêm mục tiêu");
                onCreated();
                onClose();
              });
            }}
            className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Thêm mục tiêu
          </button>
        </div>
      </div>
    </div>
  );
}

function EditGoalModal({
  goal,
  onClose,
  onUpdated,
}: {
  goal: SavingsGoalListItemDTO;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(goal.title);
  const [target, setTarget] = useState(goal.targetAmount);
  const [deadline, setDeadline] = useState(
    goal.targetDate ? goal.targetDate.slice(0, 10) : "",
  );
  const [icon, setIcon] = useState(goal.icon ?? "🎯");
  const ICONS = ["🎯", "🏠", "💻", "✈️", "🛡️", "📚", "🚗", "💊", "🎓", "💍", "🏋️", "🌱"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-moss-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-moss-100">
          <h3 className="text-lg font-bold text-on-surface">Sửa mục tiêu</h3>
          <button type="button" onClick={onClose} className="p-2 text-moss-400 hover:text-moss-700 hover:bg-moss-50 rounded-xl transition-colors">
            <X className="size-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Tên mục tiêu</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Số tiền mục tiêu (VND)</label>
            <input
              type="number"
              min={0}
              value={target}
              onChange={(e) => setTarget(Number(e.target.value))}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Hạn chót</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Biểu tượng</label>
            <div className="grid grid-cols-6 gap-2">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={`h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    icon === ic ? "bg-primary/15 ring-2 ring-primary" : "bg-surface-container-low hover:bg-surface-container"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
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
            onClick={() => {
              if (!title.trim()) {
                toast.error("Vui lòng nhập tên mục tiêu");
                return;
              }
              startTransition(async () => {
                const res = await updateGoalAction(goal.id, {
                  title: title.trim(),
                  icon,
                  targetAmount: target,
                  currency: goal.currency,
                  targetDate: deadline === "" ? null : deadline,
                  sortOrder: goal.sortOrder,
                });
                if (!res.success) {
                  toast.error("Không thể cập nhật");
                  return;
                }
                toast.success("Đã cập nhật mục tiêu");
                onUpdated();
                onClose();
              });
            }}
            className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
}

function ContributeModal({
  goal,
  expenseCategories,
  wallets,
  onClose,
  onDone,
}: {
  goal: SavingsGoalListItemDTO;
  expenseCategories: FinanceCategoryListItemDTO[];
  wallets: FinanceWalletListItemDTO[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(500_000);
  const [linkEntry, setLinkEntry] = useState(true);
  const [walletId, setWalletId] = useState(wallets[0]?.id ?? 0);
  const [categoryId, setCategoryId] = useState(expenseCategories[0]?.id ?? 0);
  const [note, setNote] = useState("");
  const remaining = goal.targetAmount - goal.savedAmount;
  const nowLocal = new Date();
  const defaultDt = new Date(nowLocal.getTime() - nowLocal.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const [contributedAtLocal, setContributedAtLocal] = useState(defaultDt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-moss-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-moss-100">
          <h3 className="text-lg font-bold text-on-surface">Góp tiền vào mục tiêu</h3>
          <button type="button" onClick={onClose} className="p-2 text-moss-400 hover:text-moss-700 hover:bg-moss-50 rounded-xl transition-colors">
            <X className="size-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-surface-container-low rounded-xl">
            <span className="text-2xl">{goal.icon ?? "🎯"}</span>
            <div>
              <p className="font-bold text-on-surface">{goal.title}</p>
              <p className="text-xs text-on-surface-variant">Còn thiếu: {fmt(Math.max(0, remaining))} VND</p>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-on-surface cursor-pointer">
            <input
              type="checkbox"
              checked={linkEntry}
              onChange={(e) => setLinkEntry(e.target.checked)}
              className="rounded border-moss-300 text-primary focus:ring-primary"
            />
            Ghi nhận vào sổ thu chi (tạo giao dịch chi)
          </label>

          {linkEntry && (
            <>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Ví</label>
                <select
                  value={walletId || ""}
                  onChange={(e) => setWalletId(Number(e.target.value))}
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  {wallets.length === 0 ? (
                    <option value="">Chưa có ví</option>
                  ) : (
                    wallets.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Danh mục chi</label>
                <select
                  value={categoryId || ""}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                >
                  {expenseCategories.length === 0 ? (
                    <option value="">Chưa có danh mục chi</option>
                  ) : (
                    expenseCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Thời điểm</label>
            <input
              type="datetime-local"
              value={contributedAtLocal}
              onChange={(e) => setContributedAtLocal(e.target.value)}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Ghi chú (tuỳ chọn)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Góp tháng 4"
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Số tiền góp (VND)</label>
            <input
              type="number"
              min={1}
              max={remaining > 0 ? remaining : undefined}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[500_000, 1_000_000, 2_000_000, 5_000_000].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  amount === v ? "bg-primary text-white" : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {fmt(v)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button type="button" onClick={onClose} className="flex-1 py-3 bg-surface-container-low text-on-surface-variant rounded-xl text-sm font-bold hover:bg-surface-container transition-colors">
            Hủy
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (amount <= 0) {
                toast.error("Số tiền không hợp lệ");
                return;
              }
              if (linkEntry && (!walletId || !categoryId)) {
                toast.error("Vui lòng chọn ví và danh mục chi");
                return;
              }
              const iso = new Date(contributedAtLocal).toISOString();
              startTransition(async () => {
                const res = await contributeToGoalAction({
                  goalId: goal.id,
                  amount,
                  contributedAt: iso,
                  note: note.trim() || undefined,
                  linkEntry,
                  walletId: linkEntry ? walletId : undefined,
                  categoryId: linkEntry ? categoryId : undefined,
                });
                if (!res.success) {
                  toast.error("Không thể ghi nhận góp tiền");
                  return;
                }
                toast.success("Đã ghi nhận góp tiền");
                onDone();
                onClose();
              });
            }}
            className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            Xác nhận góp tiền
          </button>
        </div>
      </div>
    </div>
  );
}

function GoalDetailModal({
  goalId,
  onClose,
  onChanged,
}: {
  goalId: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<SavingsGoalDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getGoalDetailAction(goalId).then((res) => {
      if (cancelled) return;
      if (res.success) setDetail(res.detail);
      else toast.error("Không tải được chi tiết");
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [goalId]);

  if (loading || !detail) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-moss-900/30 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 bg-white rounded-2xl p-12 shadow-2xl">
          <Loader2 className="size-8 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-moss-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-moss-100 shrink-0">
          <h3 className="text-lg font-bold text-on-surface">Chi tiết góp tiền</h3>
          <button type="button" onClick={onClose} className="p-2 text-moss-400 hover:text-moss-700 rounded-xl">
            <X className="size-5" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          <p className="font-bold text-on-surface flex items-center gap-2">
            <span className="text-2xl">{detail.icon ?? "🎯"}</span> {detail.title}
          </p>
          <p className="text-sm text-on-surface-variant">
            Đã góp {fmt(detail.savedAmount)} / {fmt(detail.targetAmount)} {detail.currency}
          </p>
          <ul className="space-y-2 mt-4">
            {detail.contributions.length === 0 ? (
              <li className="text-sm text-on-surface-variant">Chưa có lần góp nào.</li>
            ) : (
              detail.contributions.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 p-3 bg-surface-container-low rounded-xl text-sm">
                  <div>
                    <p className="font-bold">{fmt(c.amount)} VND</p>
                    <p className="text-xs text-on-surface-variant">
                      {new Date(c.contributedAt).toLocaleString("vi-VN")}
                      {c.entryId ? " · Đã ghi sổ thu chi" : " · Chỉ trong mục tiêu"}
                    </p>
                    {c.note ? <p className="text-xs mt-1">{c.note}</p> : null}
                  </div>
                  <button
                    type="button"
                    disabled={pendingId === c.id}
                    onClick={() => {
                      if (!confirm("Xóa lần góp này?")) return;
                      setPendingId(c.id);
                      void deleteContributionAction(c.id).then((res) => {
                        setPendingId(null);
                        if (!res.success) {
                          toast.error("Không xóa được");
                          return;
                        }
                        toast.success("Đã xóa");
                        onChanged();
                        void getGoalDetailAction(goalId).then((r) => {
                          if (r.success) setDetail(r.detail);
                        });
                      });
                    }}
                    className="p-2 text-error hover:bg-error/10 rounded-lg shrink-0"
                    title="Xóa"
                  >
                    {pendingId === c.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function GoalCard({
  goal,
  onContribute,
  onEdit,
  onDelete,
  onDetail,
}: {
  goal: SavingsGoalListItemDTO;
  onContribute: (g: SavingsGoalListItemDTO) => void;
  onEdit: (g: SavingsGoalListItemDTO) => void;
  onDelete: (id: number) => void;
  onDetail: (id: number) => void;
}) {
  const status = goalStatus(goal);
  const pct = goal.targetAmount > 0 ? Math.min((goal.savedAmount / goal.targetAmount) * 100, 100) : 0;
  const remaining = goal.targetAmount - goal.savedAmount;
  const isCompleted = status === "COMPLETED";

  return (
    <div className="group bg-white rounded-2xl p-4 border border-outline-variant/10 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-300">
      <div className="flex justify-between items-start mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">{goal.icon ?? "🎯"}</div>
        <StatusBadge status={status} />
      </div>

      <h3 className="text-xl font-bold mb-1 text-on-surface group-hover:text-primary transition-colors">{goal.title}</h3>

      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end mb-2 gap-0.5 sm:gap-2">
          <span className="text-xl font-black text-on-surface leading-none">{Math.round(pct)}%</span>
          {isCompleted ? (
            <span className="text-xs font-bold text-primary flex items-center gap-1">
              <CheckCircle2 className="size-3" /> Đạt mục tiêu
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs font-bold text-on-surface-variant truncate">Còn {compactFmt(Math.max(0, remaining))} VND</span>
          )}
        </div>
        <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-mint-400 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex flex-col gap-2 mb-4 p-3 sm:p-3.5 bg-surface-container-low rounded-xl">
        <div className="flex justify-between items-center sm:block">
          <p className="text-[9px] uppercase font-bold text-on-surface-variant/60">Đã góp</p>
          <p className="font-bold text-xs sm:text-sm">{compactFmt(goal.savedAmount)}</p>
        </div>
        <div className="flex justify-between items-center sm:text-right border-t border-outline-variant/10 pt-2 sm:pt-0 sm:border-0">
          <p className="text-[9px] uppercase font-bold text-on-surface-variant/60">Mục tiêu</p>
          <p className="font-bold text-xs sm:text-sm">{compactFmt(goal.targetAmount)}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-6 text-on-surface-variant">
        <Calendar className="size-4 shrink-0" />
        <span className="text-sm font-semibold">{formatDeadline(goal.targetDate)}</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => !isCompleted && onContribute(goal)}
          disabled={isCompleted}
          className={`py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 ${
            isCompleted
              ? "bg-surface-container-high text-on-surface-variant opacity-50 cursor-not-allowed"
              : "bg-primary text-white shadow-lg shadow-primary/20 hover:brightness-105"
          }`}
        >
          Góp tiền
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            title="Xem chi tiết"
            onClick={() => onDetail(goal.id)}
            className="flex-1 border border-outline-variant/30 hover:bg-surface-container-low text-on-surface transition-colors py-2.5 rounded-xl flex items-center justify-center"
          >
            <Eye className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onEdit(goal)}
            title="Chỉnh sửa"
            className="flex-1 border border-outline-variant/30 hover:bg-surface-container-low text-on-surface transition-colors py-2.5 rounded-xl flex items-center justify-center"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(goal.id)}
            title="Xóa"
            className="flex-1 border border-outline-variant/30 hover:bg-error/5 hover:text-error hover:border-error/20 text-on-surface-variant transition-colors py-2.5 rounded-xl flex items-center justify-center"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function FinanceSavingsGoalsClient({
  initialGoals,
  expenseCategories,
  wallets,
}: {
  initialGoals: SavingsGoalListItemDTO[];
  expenseCategories: FinanceCategoryListItemDTO[];
  wallets: FinanceWalletListItemDTO[];
}) {
  const router = useRouter();
  const [goals, setGoals] = useState(initialGoals);
  const [showAddModal, setShowAddModal] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<SavingsGoalListItemDTO | null>(null);
  const [editGoal, setEditGoal] = useState<SavingsGoalListItemDTO | null>(null);
  const [detailGoalId, setDetailGoalId] = useState<number | null>(null);

  useEffect(() => {
    setGoals(initialGoals);
  }, [initialGoals]);

  const refresh = () => {
    router.refresh();
  };

  const totalSaved = goals.reduce((s, g) => s + g.savedAmount, 0);
  const activeCount = goals.filter((g) => goalStatus(g) === "IN_PROGRESS").length;
  const completedCount = goals.filter((g) => goalStatus(g) === "COMPLETED").length;

  const handleDelete = (id: number) => {
    if (!confirm("Xóa mục tiêu này?")) return;
    void deleteGoalAction(id).then((res) => {
      if (!res.success) {
        toast.error("Không xóa được mục tiêu");
        return;
      }
      toast.success("Đã xóa mục tiêu");
      setGoals((prev) => prev.filter((g) => g.id !== id));
      refresh();
    });
  };

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-10 max-w-[1400px]">
      {showAddModal && (
        <AddGoalModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => {
            refresh();
          }}
        />
      )}
      {editGoal && (
        <EditGoalModal
          goal={editGoal}
          onClose={() => setEditGoal(null)}
          onUpdated={() => {
            refresh();
          }}
        />
      )}
      {contributeGoal && (
        <ContributeModal
          goal={contributeGoal}
          expenseCategories={expenseCategories}
          wallets={wallets}
          onClose={() => setContributeGoal(null)}
          onDone={() => {
            refresh();
          }}
        />
      )}
      {detailGoalId !== null && (
        <GoalDetailModal
          goalId={detailGoalId}
          onClose={() => setDetailGoalId(null)}
          onChanged={() => {
            refresh();
          }}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-on-surface">Mục tiêu tiết kiệm</h1>
          <p className="text-on-surface-variant text-sm mt-0.5">Xây dựng tương lai tài chính vững chắc</p>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all"
        >
          <Plus className="size-4" />
          Thêm mục tiêu
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        <div className="bg-white p-3.5 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] shadow-card border border-white/40">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Tổng tích lũy</span>
            <Wallet className="size-5 text-primary" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
            <span className="text-xl sm:text-3xl font-black text-on-surface leading-tight">{fmt(totalSaved)}</span>
            <span className="text-[9px] sm:text-[10px] font-bold text-on-surface-variant opacity-60">VND</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs font-bold text-on-surface-variant">
            <TrendingUp className="size-4" />
            <span>Trên tất cả mục tiêu</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] shadow-card border border-white/40">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Mục tiêu đang chạy</span>
            <Target className="size-5 text-primary" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
            <span className="text-xl sm:text-3xl font-black text-on-surface leading-tight">{String(activeCount).padStart(2, "0")}</span>
            <span className="text-[9px] sm:text-[10px] font-bold text-on-surface-variant opacity-60">Tiến độ</span>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] shadow-card border border-white/40 sm:col-span-2 lg:col-span-1">
          <div className="flex justify-between items-start mb-4">
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Đã hoàn thành</span>
            <CalendarCheck2 className="size-5 text-primary" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2">
            <span className="text-xl sm:text-3xl font-black text-on-surface leading-tight">{String(completedCount).padStart(2, "0")}</span>
            <span className="text-[9px] sm:text-[10px] font-bold text-on-surface-variant opacity-60">Mục tiêu</span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[11px] font-bold text-on-surface-variant">
            <AlertCircle className="size-4" />
            <span>Tiến độ theo số tiền đã góp</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-8">
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onContribute={setContributeGoal}
            onEdit={setEditGoal}
            onDelete={handleDelete}
            onDetail={setDetailGoalId}
          />
        ))}

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="border-2 border-dashed border-outline-variant/30 rounded-2xl flex flex-col items-center justify-center text-on-surface-variant hover:border-primary hover:text-primary transition-all cursor-pointer bg-surface-container-low/30 group min-h-[160px]"
        >
          <Plus className="size-12 mb-3 group-hover:scale-110 transition-transform" />
          <span className="font-bold text-sm">Thêm mục tiêu mới</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl overflow-hidden border border-outline-variant/10 shadow-card flex flex-col sm:flex-row">
          <div className="sm:w-1/3 bg-gradient-to-br from-primary/20 to-mint-400/10 flex items-center justify-center min-h-[160px] sm:min-h-0">
            <TrendingUp className="size-16 sm:size-20 text-primary/40" />
          </div>
          <div className="sm:w-2/3 p-6 sm:p-8">
            <h4 className="text-xl sm:text-2xl font-black mb-3 text-on-surface">Tối ưu hóa tích lũy</h4>
            <p className="text-on-surface-variant mb-6 text-sm leading-relaxed">
              Ghi nhận góp tiền kèm danh mục chi để sổ thu chi luôn khớp với tiến độ mục tiêu.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="text-primary font-bold text-sm flex items-center gap-2 hover:gap-3 transition-all group"
            >
              Thêm mục tiêu
              <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        <div className="bg-primary/5 rounded-2xl p-6 sm:p-8 border border-primary/10 flex flex-col justify-center items-center text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-primary to-mint-400 flex items-center justify-center text-white mb-4 sm:mb-6">
            <Brain className="size-6 sm:size-7" />
          </div>
          <h4 className="text-lg font-bold mb-2 text-on-surface">Gợi ý</h4>
          <p className="text-[11px] sm:text-xs text-on-surface-variant mb-6 leading-relaxed">
            Tạo danh mục chi &quot;Tiết kiệm&quot; hoặc &quot;Quỹ dự phòng&quot; để lọc nhanh các giao dịch gắn mục tiêu trong trang Thu chi.
          </p>
        </div>
      </div>
    </main>
  );
}
