"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { getJobPaymentHistoryAction } from "@/features/jobs/actions/jobPaymentActions";

type Props = {
  jobId: number;
  reloadKey?: number;
  onNewTransaction?: () => void;
};

type TxStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
type TxItem = {
  id: number;
  transactionDate: string;
  amountText: string;
  content: string;
  status: TxStatus;
  bankAccount: null | { bankId: string; accountNo: string; accountName: string };
};

function statusBadgeClasses(status: TxStatus): string {
  if (status === "COMPLETED") return "bg-mint-100 text-mint-700";
  if (status === "PENDING") return "bg-sand-50 text-sand-700";
  if (status === "FAILED") return "bg-coral-50 text-coral-600";
  return "bg-slate-100 text-slate-600";
}

function statusLabel(status: TxStatus): string {
  if (status === "COMPLETED") return "Hoàn tất";
  if (status === "PENDING") return "Chờ";
  if (status === "FAILED") return "Thất bại";
  return "Hủy";
}

export function JobPaymentHistory({ jobId, reloadKey = 0, onNewTransaction }: Props) {
  const [items, setItems] = useState<TxItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastTopIdRef = useRef<number | null>(null);

  const hasItems = items.length > 0;
  const latestId = hasItems ? items[0]?.id ?? null : null;

  const highlightIds = useMemo(() => {
    if (lastTopIdRef.current === null || latestId === null) return new Set<number>();
    if (latestId === lastTopIdRef.current) return new Set<number>();
    const ids = new Set<number>();
    for (const t of items) {
      if (t.id === lastTopIdRef.current) break;
      ids.add(t.id);
    }
    return ids;
  }, [items, latestId]);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      const res = await getJobPaymentHistoryAction(jobId);
      if (isMounted) {
        if (res.success && res.data) {
          const nextItems = res.data as TxItem[];
          const nextTopId = nextItems[0]?.id ?? null;
          const prevTopId = lastTopIdRef.current;
          setItems(nextItems);
          if (prevTopId !== null && nextTopId !== null && nextTopId !== prevTopId) {
            if (typeof onNewTransaction === "function") {
              onNewTransaction();
            }
          }
          lastTopIdRef.current = nextTopId;
        }
        setIsLoading(false);
      }
    }
    void load();
    return () => {
      isMounted = false;
    };
  }, [jobId, reloadKey, onNewTransaction]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-moss-500">
        <Loader2 className="size-4 animate-spin" /> Đang tải lịch sử thanh toán...
      </div>
    );
  }

  if (items.length === 0) {
    return <div className="text-xs text-moss-400">Chưa có giao dịch nào cho job này.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full text-left border-collapse">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Thời gian</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Số tiền</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Nội dung</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tài khoản</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((t) => {
            const dt = new Date(t.transactionDate);
            return (
              <tr
                key={t.id}
                className={`hover:bg-slate-50 transition-colors ${
                  highlightIds.has(t.id) ? "animate-pulse bg-mint-50" : ""
                }`}
              >
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-slate-900">
                    {dt.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                  </p>
                  <p className="text-xs text-slate-500">
                    {dt.toLocaleTimeString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </p>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-mint-600">{t.amountText}</td>
                <td className="px-6 py-4 text-sm text-slate-600">{t.content}</td>
                <td className="px-6 py-4 text-sm text-slate-700">
                  {t.bankAccount ? `${t.bankAccount.bankId} - ${t.bankAccount.accountNo}` : "—"}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${statusBadgeClasses(t.status)}`}
                  >
                    {statusLabel(t.status)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

