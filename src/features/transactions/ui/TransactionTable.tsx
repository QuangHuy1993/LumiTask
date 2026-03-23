"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, Copy, Link, AlignLeft } from "lucide-react";
import { TransactionListItemDTO } from "../model/transactionTypes";

const formatVND = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

interface TransactionTableProps {
  transactions: TransactionListItemDTO[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const router = useRouter();
  
  return (
    <div className="bg-surface rounded-xl shadow-card overflow-hidden border border-moss-200">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-moss-900 whitespace-nowrap">
          <thead className="bg-moss-50 text-moss-600 font-semibold uppercase tracking-wider text-xs border-b border-moss-200">
            <tr>
              <th className="px-6 py-4">Thời gian</th>
              <th className="px-6 py-4 text-right">Số tiền (VND)</th>
              <th className="px-6 py-4 text-center">Hướng</th>
              <th className="px-6 py-4">Nội dung</th>
              <th className="px-6 py-4">Việc làm / Khách hàng</th>
              <th className="px-6 py-4">Tài khoản</th>
              <th className="px-6 py-4 text-center">Nguồn</th>
              <th className="px-6 py-4 text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((tx) => {
              const isIncoming = tx.direction === "INCOMING";
              const isSepay = tx.gatewayTransId !== null;

              return (
                <tr
                  key={tx.id}
                  onClick={() => {
                    window.dispatchEvent(new Event("trigger-page-transition"));
                    router.push(`/jobs/transactions/${tx.id}`);
                  }}
                  className="group hover:bg-mint-50/50 transition-colors duration-200 ease-in-out cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-moss-900">
                      {new Date(tx.transactionDate).toLocaleDateString("vi-VN")}
                    </div>
                    <div className="text-xs text-moss-400 mt-1">
                      {new Date(tx.transactionDate).toLocaleTimeString("vi-VN")}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-bold text-[15px]">{formatVND(tx.amount)}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {isIncoming ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-mint-50 text-mint-700 border border-mint-200">
                        VÀO
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-coral-50 text-coral-700 border border-coral-200">
                        RA
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-md text-xs font-mono tracking-tight shadow-sm border border-gray-200">
                         {tx.content}
                       </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {tx.job ? (
                      <div className="flex flex-col">
                        <a href={`/jobs/list/${tx.job.id}`} className="font-semibold text-mint-600 hover:text-mint-700 hover:underline transition-colors">
                          {tx.job.name}
                        </a>
                        <span className="text-xs text-moss-500 mt-0.5">{tx.job.client?.name || "No Client"}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col text-xs">
                        <span className="text-moss-400 italic">Unlinked Job</span>
                        <a href="#" className="mt-1 text-mint-500 hover:text-mint-600 hover:underline flex items-center gap-1 transition-colors">
                          <Link size={12} /> Gắn vào job
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-moss-800 text-sm">
                    {tx.bankAccount ? `${tx.bankAccount.bankId} - ${tx.bankAccount.accountNo}` : "—"}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {isSepay ? (
                      <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-medium bg-mint-50 text-mint-600 border border-mint-100">
                        Sepay
                      </span>
                    ) : (
                      <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-medium bg-moss-100 text-moss-600 border border-moss-200">
                        Thủ công
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StatusBadge status={tx.status} />
                  </td>
                </tr>
              );
            })}
            
            {transactions.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-moss-500 bg-white">
                  Không có giao dịch nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "COMPLETED":
      return <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-mint-100 text-mint-700">Hoàn tất</span>;
    case "PENDING":
      return <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-sand-100 text-sand-700">Chờ</span>;
    case "FAILED":
      return <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-coral-100 text-coral-700">Thất bại</span>;
    case "CANCELLED":
      return <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">Hủy</span>;
    default:
      return <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">{status}</span>;
  }
}
