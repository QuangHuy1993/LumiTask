"use client";

import React, { useState } from "react";
import { Plus, Trash2, CheckCircle2, Copy, Loader2, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { createBankAccountAction, deleteBankAccountAction, setDefaultBankAccountAction, updateBankAccountAction } from "../actions/bankingActions";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";

import { SUPPORTED_BANKS, getBankById } from "../model/bankList";

interface BankAccount {
  id: number;
  bankId: string;
  accountNo: string;
  accountName: string;
  logoURL: string | null;
  isDefault: boolean;
}

interface BillingSettingsPaneProps {
  initialAccounts: BankAccount[];
  pagination: {
    total: number;
    totalPages: number;
    currentPage: number;
  };
}

export function BillingSettingsPane({ initialAccounts, pagination }: BillingSettingsPaneProps) {
  const [isPending, setIsPending] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/settings?${params.toString()}`);
  };

  const handleSetDefault = async (id: number) => {
    try {
      const res = await setDefaultBankAccountAction(id);
      if (res.success) toast.success("Đã đặt làm mặc định");
      else toast.error("Có lỗi xảy ra");
    } catch (e) {
      toast.error("Lỗi hệ thống");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsPending(true);
    try {
      const res = await deleteBankAccountAction(deletingId);
      if (res.success) {
        toast.success("Đã xóa tài khoản");
        setDeletingId(null);
      } else {
        toast.error("Có lỗi xảy ra");
      }
    } catch (e) {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsPending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    const payload = {
      bankId: data.bankId,
      accountNo: data.accountNo,
      accountName: (data.accountName as string).toUpperCase(),
      isDefault: data.isDefault === "on",
    };

    try {
      let res;
      if (editingAccount) {
        res = await updateBankAccountAction(editingAccount.id, payload);
      } else {
        res = await createBankAccountAction(payload);
      }

      if (res.success) {
        toast.success(editingAccount ? "Cập nhật thành công" : "Thêm tài khoản thành công");
        setShowAddForm(false);
        setEditingAccount(null);
      } else {
        toast.error(res.message || "Có lỗi xảy ra");
      }
    } catch (e) {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section className="space-y-5 animate-fade-in-up">
      <ConfirmationDialog 
        isOpen={!!deletingId}
        isLoading={isPending}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Xác nhận xóa"
        description="Bạn có chắc chắn muốn xóa tài khoản này không? Hành động này không thể hoàn tác và dữ liệu sẽ bị xóa vĩnh viễn."
        confirmText="Xác nhận xóa"
      />

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-bold text-moss-900 tracking-tight">Ngân hàng & thanh toán</h2>
          <p className="text-moss-500 text-xs">Quản lý các tài khoản nhận tiền và thanh toán.</p>
        </div>
        {!showAddForm && !editingAccount && (
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-primary hover:bg-primary-hover text-white px-3.5 py-1.5 rounded-xl font-bold transition-all shadow-glow-mint flex items-center gap-2 text-xs active:scale-95"
          >
            <Plus className="size-4" />
            Thêm mới
          </button>
        )}
      </div>

      {(showAddForm || editingAccount) && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 border border-primary/20 shadow-lg animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-moss-900 text-sm">{editingAccount ? "Sửa tài khoản" : "Thêm tài khoản mới"}</h3>
            <button type="button" onClick={() => { setShowAddForm(false); setEditingAccount(null); }} className="text-xs text-moss-400 hover:text-moss-600">Hủy bỏ</button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-moss-700">Ngân hàng hỗ trợ</label>
              <select 
                name="bankId" 
                required 
                defaultValue={editingAccount?.bankId}
                className="w-full rounded-xl border-moss-200 bg-moss-50/50 focus:border-primary focus:ring-primary/20 transition-all px-3 py-1.5 outline-none appearance-none cursor-pointer text-xs"
              >
                <option value="">Chọn ngân hàng...</option>
                {SUPPORTED_BANKS.map(bank => (
                  <option key={bank.id} value={bank.id}>{bank.shortName}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-moss-700">Số tài khoản</label>
              <input 
                name="accountNo" 
                required 
                defaultValue={editingAccount?.accountNo}
                className="w-full rounded-xl border-moss-200 bg-moss-50/50 focus:border-primary focus:ring-primary/20 transition-all px-3 py-1.5 outline-none text-xs" 
                placeholder=" VD: 123456789" 
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-moss-700">Tên chủ tài khoản (Không dấu)</label>
              <input 
                name="accountName" 
                required 
                defaultValue={editingAccount?.accountName}
                className="w-full rounded-xl border-moss-200 bg-moss-50/50 focus:border-primary focus:ring-primary/20 transition-all px-3 py-1.5 outline-none uppercase text-xs" 
                placeholder="VD: NGUYEN VAN A" 
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input 
                type="checkbox" 
                name="isDefault" 
                id="isDefault" 
                defaultChecked={editingAccount?.isDefault}
                className="rounded text-primary focus:ring-primary/20 size-3" 
              />
              <label htmlFor="isDefault" className="text-xs text-moss-600">Đặt làm mặc định</label>
            </div>
          </div>
          <button 
            disabled={isPending}
            type="submit"
            className="mt-5 w-full bg-primary hover:bg-primary-hover text-white py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-xs"
          >
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {editingAccount ? "Cập nhật" : "Xác nhận thêm"}
          </button>
        </form>
      )}

      <div className="bg-white/50 backdrop-blur-sm rounded-3xl border border-moss-100 p-1.5 min-h-[350px] flex flex-col">
        <div className="grid gap-2.5 p-1.5 flex-1">
          {initialAccounts.map((account) => {
            const bankMeta = getBankById(account.bankId);
            return (
              <div 
                key={account.id} 
                className={`bg-white rounded-2xl p-4 relative group transition-all border ${
                  account.isDefault 
                    ? "border-primary/30 shadow-sm ring-1 ring-primary/10" 
                    : "border-moss-100 shadow-sm hover:border-primary/30 hover:shadow-md"
                }`}
              >
                {account.isDefault && (
                  <span className="absolute top-3 right-3 bg-primary/10 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-primary/20">
                    <CheckCircle2 className="size-2.5" />
                    Mặc định
                  </span>
                )}

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-moss-100 overflow-hidden shadow-inner p-1">
                    {bankMeta?.logoUrl ? (
                      <img src={bankMeta.logoUrl} alt={bankMeta.shortName} className="w-full h-full object-contain" />
                    ) : (
                      <span className="font-bold text-primary text-sm">{account.bankId.slice(0, 3)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-moss-900 tracking-tight text-sm truncate">{bankMeta?.shortName || account.bankId}</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-moss-600 mt-0.5">
                      <span className="font-mono text-xs tracking-tight">{account.accountNo}</span>
                      <button onClick={() => { navigator.clipboard.writeText(account.accountNo); toast.success("Đã sao chép"); }} className="p-0.5 hover:bg-moss-100 rounded transition-colors group/copy opacity-0 group-hover:opacity-100">
                        <Copy className="size-2.5 group-hover:text-primary transition-colors" />
                      </button>
                    </div>
                    <p className="text-[9px] font-bold text-moss-400 mt-1 uppercase tracking-widest leading-none truncate">{account.accountName}</p>
                  </div>
                  
                  <div className={`flex flex-col gap-1.5 items-end ${account.isDefault ? "mt-5" : ""}`}>
                    {!account.isDefault && (
                      <button 
                        onClick={() => handleSetDefault(account.id)}
                        className="hidden group-hover:flex text-[9px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg uppercase tracking-wider items-center gap-1 hover:bg-primary/20 transition-all border border-primary/10"
                      >
                        Đặt mặc định
                      </button>
                    )}
                    <div className="flex gap-1">
                      <button 
                        onClick={() => setEditingAccount(account)}
                        className="p-1.5 text-moss-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                        title="Sửa tài khoản"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button 
                        onClick={() => setDeletingId(account.id)}
                        className="p-1.5 text-moss-300 hover:text-coral-500 hover:bg-coral-50 rounded-lg transition-all"
                        title="Xóa tài khoản"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {initialAccounts.length === 0 && !showAddForm && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-16 bg-moss-50 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-sm text-moss-300">
                <Plus className="size-6" />
              </div>
              <h3 className="text-moss-900 font-bold text-sm">Chưa có tài khoản nào</h3>
              <p className="text-moss-500 text-xs max-w-[200px] mt-1">
                Hãy thêm tài khoản ngân hàng để thực hiện thanh toán.
              </p>
              <button 
                onClick={() => setShowAddForm(true)}
                className="mt-4 text-primary font-bold text-xs hover:underline underline-offset-4 decoration-2"
              >
                Thêm ngay
              </button>
            </div>
          )}
        </div>

        {pagination.totalPages > 1 && (
          <div className="p-3 border-t border-moss-100 flex items-center justify-between">
            <p className="text-[10px] text-moss-400 font-medium">
              <span className="text-moss-900">{initialAccounts.length}</span> / <span className="text-moss-900">{pagination.total}</span> tài khoản
            </p>
            <div className="flex items-center gap-1.5">
              <button 
                disabled={pagination.currentPage <= 1}
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                className="p-1.5 rounded-lg hover:bg-moss-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`size-6 rounded-lg font-bold text-[10px] transition-all ${
                      p === pagination.currentPage 
                        ? "bg-primary text-white shadow-glow-mint" 
                        : "text-moss-500 hover:bg-moss-100"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button 
                disabled={pagination.currentPage >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                className="p-1.5 rounded-lg hover:bg-moss-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
