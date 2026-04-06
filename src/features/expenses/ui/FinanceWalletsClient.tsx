"use client";

import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Wallet,
  Star,
  CreditCard,
  RefreshCw,
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Banknote,
  Landmark,
  PiggyBank,
  Smartphone,
} from "lucide-react";

import {
  listWalletsAction,
  createWalletAction,
  updateWalletAction,
  deleteWalletAction,
} from "@/features/expenses/actions/financeWalletActions";
import type { FinanceWalletListItemDTO } from "@/features/expenses/model/financeWalletTypes";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FinanceWallet {
  id: number;
  name: string;
  currency: string;
  sortOrder: number;
  isDefault: boolean;
  icon: "cash" | "bank" | "ewallet" | "savings";
}

const ICON_MAP: Record<FinanceWallet["icon"], React.ElementType> = {
  cash: Banknote,
  bank: Landmark,
  ewallet: Smartphone,
  savings: PiggyBank,
};

const ICON_OPTIONS: { value: FinanceWallet["icon"]; label: string }[] = [
  { value: "cash", label: "Tiền mặt" },
  { value: "bank", label: "Ngân hàng" },
  { value: "ewallet", label: "Ví điện tử" },
  { value: "savings", label: "Tiết kiệm" },
];

const CURRENCIES = ["VND", "USD", "EUR", "JPY", "SGD"];

// ─── Modal ────────────────────────────────────────────────────────────────────

function WalletModal({
  mode,
  initial,
  onClose,
  onSave,
}: {
  mode: "add" | "edit";
  initial?: Partial<FinanceWallet>;
  onClose: () => void;
  onSave: (data: Partial<FinanceWallet>) => void;
}) {
  const [form, setForm] = useState<Partial<FinanceWallet>>({
    name: "",
    currency: "VND",
    icon: "cash",
    isDefault: false,
    sortOrder: 1,
    ...initial,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-moss-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-moss-100">
          <h3 className="text-lg font-bold text-on-surface">
            {mode === "add" ? "Thêm ví mới" : "Chỉnh sửa ví"}
          </h3>
          <button onClick={onClose} className="p-2 text-moss-400 hover:text-moss-700 hover:bg-moss-50 rounded-xl transition-colors">
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Tên ví</label>
            <input
              type="text"
              value={form.name || ""}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="VD: Tiền mặt"
              className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Tiền tệ</label>
            <div className="flex flex-wrap gap-2">
              {CURRENCIES.map((cur) => (
                <button
                  key={cur}
                  onClick={() => setForm((f) => ({ ...f, currency: cur }))}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    form.currency === cur
                      ? "bg-primary text-white shadow-lg shadow-primary/20"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  {cur}
                </button>
              ))}
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Loại ví</label>
            <div className="grid grid-cols-4 gap-2">
              {ICON_OPTIONS.map(({ value, label }) => {
                const Icon = ICON_MAP[value];
                return (
                  <button
                    key={value}
                    onClick={() => setForm((f) => ({ ...f, icon: value }))}
                    className={`flex flex-col items-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${
                      form.icon === value
                        ? "bg-primary/10 text-primary ring-2 ring-primary"
                        : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                    }`}
                  >
                    <Icon className="size-5" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort order + Default */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Thứ tự</label>
              <input
                type="number"
                min={1}
                value={form.sortOrder ?? 1}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                className="w-full bg-surface-container-low border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 block">Mặc định</label>
              <button
                onClick={() => setForm((f) => ({ ...f, isDefault: !f.isDefault }))}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  form.isDefault
                    ? "bg-[#F0C05A]/20 text-[#7a5900]"
                    : "bg-surface-container-low text-on-surface-variant"
                }`}
              >
                <Star className={`size-4 ${form.isDefault ? "fill-[#F0C05A] text-[#7a5900]" : ""}`} />
                {form.isDefault ? "Mặc định" : "Không"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-3 bg-surface-container-low text-on-surface-variant rounded-xl text-sm font-bold hover:bg-surface-container transition-colors">
            Hủy
          </button>
          <button
            onClick={() => { onSave(form); onClose(); }}
            className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all"
          >
            {mode === "add" ? "Thêm ví" : "Lưu thay đổi"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FinanceWalletsClient() {
  const [wallets, setWallets] = useState<FinanceWalletListItemDTO[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<FinanceWalletListItemDTO | null>(null);

  const PAGE_SIZE = 8;

  const fetchWallets = async (q: string) => {
    setIsLoading(true);
    const res = await listWalletsAction({ limit: 200, search: q || undefined });
    if (res.success) {
      setWallets(res.items);
      setTotalCount(res.totalCount);
    } else if (res.error === "UNAUTHENTICATED") toast.error("Bạn cần đăng nhập lại.");
    else toast.error("Không thể tải danh sách ví");
    setIsLoading(false);
  };

  useEffect(() => {
    void fetchWallets(search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultWallet = wallets.find((w) => w.isDefault);

  const filtered = wallets.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => a.sortOrder - b.sortOrder || b.id - a.id);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleSave = async (data: Partial<FinanceWallet>) => {
    if (modalMode === "add") {
      const res = await createWalletAction(data);
      if (res.success) {
        toast.success("Thêm ví thành công");
        void fetchWallets(search);
      } else {
        const message =
          res.error === "UNAUTHENTICATED"
            ? "Bạn cần đăng nhập lại."
            : res.message ?? "Lỗi khi thêm ví";
        toast.error(message);
      }
    } else if (modalMode === "edit" && editTarget) {
      const res = await updateWalletAction(editTarget.id, data);
      if (res.success) {
        toast.success("Cập nhật ví thành công");
        void fetchWallets(search);
      } else {
        const message =
          res.error === "UNAUTHENTICATED"
            ? "Bạn cần đăng nhập lại."
            : res.message ?? "Lỗi khi cập nhật ví";
        toast.error(message);
      }
    }
    setModalMode(null);
    setEditTarget(null);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc chắn muốn xóa ví này?")) return;
    const res = await deleteWalletAction(id);
    if (res.success) {
      toast.success("Xóa ví thành công");
      void fetchWallets(search);
    } else {
      const message =
        res.error === "UNAUTHENTICATED"
          ? "Bạn cần đăng nhập lại."
          : "Lỗi khi xóa ví";
      toast.error(message);
    }
  };

  const handleSetDefault = async (id: number) => {
    const res = await updateWalletAction(id, { isDefault: true });
    if (res.success) {
      toast.success("Đã đặt làm ví mặc định");
      void fetchWallets(search);
    } else {
      const message =
        res.error === "UNAUTHENTICATED"
          ? "Bạn cần đăng nhập lại."
          : res.message ?? "Lỗi khi đặt mặc định";
      toast.error(message);
    }
  };

  const openEdit = (wallet: FinanceWalletListItemDTO) => {
    setEditTarget(wallet);
    setModalMode("edit");
  };

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8">
      {/* Modal */}
      {modalMode && (
        <WalletModal
          mode={modalMode}
          initial={
            editTarget
              ? {
                  id: editTarget.id,
                  name: editTarget.name,
                  currency: editTarget.currency,
                  sortOrder: editTarget.sortOrder,
                  isDefault: editTarget.isDefault,
                  icon: (editTarget.icon ?? "cash") as FinanceWallet["icon"],
                }
              : undefined
          }
          onClose={() => { setModalMode(null); setEditTarget(null); }}
          onSave={handleSave}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-on-surface">Quản lý ví</h1>
          <p className="text-on-surface-variant text-sm mt-0.5">Theo dõi nguồn tiền của bạn</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => void fetchWallets(search)}
            disabled={isLoading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-primary border border-primary/20 rounded-xl font-bold text-xs sm:text-sm hover:bg-primary/5 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="whitespace-nowrap">Làm mới</span>
          </button>
          <button
            onClick={() => { setEditTarget(null); setModalMode("add"); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs sm:text-sm shadow-lg shadow-primary/20 hover:brightness-105 active:scale-95 transition-all"
          >
            <Plus className="size-4" />
            <span className="whitespace-nowrap">Thêm ví</span>
          </button>
        </div>
      </div>

      {/* KPI Cards - Super Optimized for Mobile */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-surface-container-low p-3.5 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] flex items-center gap-3 sm:gap-5 border border-white hover:shadow-lg transition-shadow">
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Wallet className="size-5 sm:size-7" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-0.5 opacity-60">Tổng số ví</p>
            <p className="text-xl sm:text-3xl font-black text-on-surface leading-none">{wallets.length}</p>
          </div>
        </div>

        <div className="bg-surface-container-low p-3.5 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] flex items-center gap-3 sm:gap-5 border border-white hover:shadow-lg transition-shadow">
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-[#F0C05A]/20 flex items-center justify-center text-[#7a5900] shrink-0">
            <Star className="size-5 sm:size-7 fill-[#F0C05A] text-[#7a5900]" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-0.5 opacity-60">Mặc định</p>
            <p className="text-sm sm:text-xl font-black text-on-surface leading-tight truncate">{defaultWallet?.name ?? "—"}</p>
          </div>
        </div>

        <div className="bg-surface-container-low p-3.5 sm:p-6 rounded-[1.25rem] sm:rounded-[2rem] flex items-center gap-3 sm:gap-5 border border-white hover:shadow-lg transition-shadow col-span-2 lg:col-span-1">
          <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary shrink-0">
            <CreditCard className="size-5 sm:size-7" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant mb-0.5 opacity-60">Tiền tệ chính</p>
            <p className="text-xl sm:text-3xl font-black text-on-surface leading-none font-mono">VND</p>
          </div>
        </div>
      </div>

      {/* Wallets Display */}
      <div className="bg-white rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-8 shadow-card border border-outline-variant/10">
        {/* Filter Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 sm:mb-8 gap-4">
          <h3 className="text-lg sm:text-xl font-black text-on-surface tracking-tight">Danh sách ví của bạn</h3>
          <div className="relative w-full lg:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant/50" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm..."
              className="w-full bg-surface-container-low border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            />
          </div>
        </div>

        {/* List Content */}
        {isLoading ? (
          <div className="py-16 text-center">
            <RefreshCw className="size-7 text-primary/40 animate-spin mx-auto mb-3" />
            <p className="text-on-surface-variant/60 text-sm font-medium">Đang tải...</p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-on-surface-variant/40 text-sm font-medium">Không tìm thấy ví nào phù hợp</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-on-surface-variant/50">
                    {["Thứ tự", "Tên ví", "Tiền tệ", "Trạng thái", "Thao tác"].map((h, i) => (
                      <th key={h} className={`px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] ${i === 4 ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {paged.map((wallet) => {
                    const Icon = ICON_MAP[(wallet.icon ?? "cash") as FinanceWallet["icon"]];
                    return (
                      <tr key={wallet.id} className="group hover:translate-x-1 transition-transform">
                        <td className="px-6 py-5 bg-surface-container-low/40 rounded-l-2xl font-mono font-bold text-primary/70">{String(wallet.sortOrder).padStart(2, "0")}</td>
                        <td className="px-6 py-5 bg-surface-container-low/40">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${wallet.isDefault ? "bg-primary/10 text-primary" : "bg-surface-container-highest text-on-surface-variant"}`}><Icon className="size-5" /></div>
                            <div>
                              <span className="font-bold text-on-surface">{wallet.name}</span>
                              {wallet.isDefault && <span className="ml-2 px-2 py-0.5 bg-primary text-white text-[9px] font-black rounded-full tracking-widest uppercase">Mặc định</span>}
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-5 bg-surface-container-low/40 font-bold text-xs ${wallet.currency !== "VND" ? "text-tertiary" : ""}`}>{wallet.currency}</td>
                        <td className="px-6 py-5 bg-surface-container-low/40">
                          {wallet.isDefault ? (
                            <div className="flex items-center gap-2 text-primary text-[10px] font-bold uppercase tracking-tight">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                              Mặc định
                            </div>
                          ) : <span className="text-on-surface-variant/30">—</span>}
                        </td>
                        <td className="px-6 py-5 bg-surface-container-low/40 rounded-r-2xl text-right">
                          <div className="flex justify-end gap-1 sm:opacity-0 group-hover:opacity-100 transition-all duration-200">
                            {!wallet.isDefault && <button onClick={() => handleSetDefault(wallet.id)} className="p-2 text-on-surface-variant hover:text-[#7a5900] hover:bg-[#F0C05A]/15 rounded-xl"><Star className="size-4" /></button>}
                            <button onClick={() => openEdit(wallet)} className="p-2 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl"><Pencil className="size-4" /></button>
                            <button onClick={() => handleDelete(wallet.id)} disabled={wallet.isDefault} className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-xl disabled:opacity-20"><Trash2 className="size-4" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="sm:hidden grid grid-cols-1 gap-3">
              {paged.map((wallet) => {
                const Icon = ICON_MAP[(wallet.icon ?? "cash") as FinanceWallet["icon"]];
                return (
                  <div key={wallet.id} className="p-4 bg-surface-container-low/40 rounded-2xl border border-outline-variant/10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${wallet.isDefault ? "bg-primary text-white shadow-lg" : "bg-white text-on-surface-variant shadow-sm"}`}>
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-on-surface truncate">{wallet.name}</p>
                          <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">{wallet.currency}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(wallet)} className="p-2 text-on-surface-variant"><Pencil className="size-4" /></button>
                        <button onClick={() => handleDelete(wallet.id)} disabled={wallet.isDefault} className="p-2 text-on-surface-variant disabled:opacity-20"><Trash2 className="size-4" /></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      {wallet.isDefault ? (
                        <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full tracking-widest uppercase">Mặc định</span>
                      ) : (
                        <button onClick={() => handleSetDefault(wallet.id)} className="text-[10px] font-bold text-on-surface-variant flex items-center gap-1.5 hover:text-primary transition-colors">
                          <Star className="size-3.5" /> Đặt mặc định
                        </button>
                      )}
                      <span className="text-[10px] font-mono font-bold text-on-surface-variant/40">#{String(wallet.sortOrder).padStart(2, "0")}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="mt-6 sm:mt-8 pt-6 border-t border-outline-variant/5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
                {Math.min((page - 1) * PAGE_SIZE + 1, sorted.length)}–{Math.min(page * PAGE_SIZE, sorted.length)} / {sorted.length} (tổng {totalCount})
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-low/50 text-on-surface-variant disabled:opacity-30"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary text-white text-xs font-bold shadow-md">
                  {page}
                </div>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-low/50 text-on-surface-variant disabled:opacity-30"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tip Card */}
      <div className="bg-primary/5 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-8 border border-primary/10 flex flex-col sm:flex-row items-start justify-between overflow-hidden relative gap-6">
        <div className="max-w-lg relative z-10">
          <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-full tracking-widest mb-4 inline-block">
            MẸO QUẢN LÝ
          </span>
          <h4 className="text-xl sm:text-2xl font-bold text-on-surface mb-2 sm:mb-3 tracking-tight">
            Tối ưu hóa nguồn tiền
          </h4>
          <p className="text-on-surface-variant leading-relaxed text-sm">
            Phân loại ví rõ ràng giữa chi tiêu và tiết kiệm giúp bạn kiểm soát ngân sách tốt hơn tới 25%.
          </p>
        </div>
        <div className="sm:absolute sm:right-6 sm:top-1/2 sm:-translate-y-1/2 opacity-20 sm:opacity-5 pointer-events-none select-none self-end sm:self-auto">
          <Wallet className="size-24 sm:size-52 text-primary" />
        </div>
      </div>
    </main>
  );
}
