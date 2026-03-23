import React, { Suspense } from "react";
import type { Metadata } from "next";
import { TransactionFilterBar } from "@/features/transactions/ui/TransactionFilterBar";
import { TransactionSummary } from "@/features/transactions/ui/TransactionSummary";
import { TransactionTable } from "@/features/transactions/ui/TransactionTable";
import { fetchTransactionsAction, fetchTransactionStatsAction } from "@/features/transactions/actions/transactionActions";
import { TransactionListQuery } from "@/features/transactions/model/transactionTypes";
import { FileText } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản lý giao dịch - LumiTask",
  description: "Tra cứu & đối soát lịch sử giao dịch theo thời gian.",
};

type SearchParamValue = string | string[] | undefined;

function getSingleParam(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value ?? undefined;
}

function coerceDirection(value: SearchParamValue): TransactionListQuery["direction"] | undefined {
  const v = getSingleParam(value);
  if (!v) return undefined;
  if (v === "ALL" || v === "INCOMING" || v === "OUTGOING") return v;
  return undefined;
}

function coerceStatus(value: SearchParamValue): TransactionListQuery["status"] | undefined {
  const v = getSingleParam(value);
  if (!v) return undefined;
  if (v === "ALL" || v === "COMPLETED" || v === "PENDING" || v === "FAILED" || v === "CANCELLED") return v;
  return undefined;
}

function coerceSource(value: SearchParamValue): TransactionListQuery["source"] | undefined {
  const v = getSingleParam(value);
  if (!v) return undefined;
  if (v === "ALL" || v === "SEPAY" || v === "MANUAL") return v;
  return undefined;
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TransactionsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  
  const query: TransactionListQuery = {
    searchContent: resolvedParams.searchContent as string,
    direction: coerceDirection(resolvedParams.direction),
    status: coerceStatus(resolvedParams.status),
    source: coerceSource(resolvedParams.source),
    startDate: resolvedParams.startDate as string,
    endDate: resolvedParams.endDate as string,
    bankAccountId: resolvedParams.bankAccountId && resolvedParams.bankAccountId !== "ALL" ? Number(resolvedParams.bankAccountId) : undefined,
    cursor: resolvedParams.cursor ? Number(resolvedParams.cursor) : undefined,
  };

  // Import prisma to fetch bank accounts just for the filter drop down
  const { prisma } = await import("@/lib/db/prisma");

  const [transactions, stats, bankAccounts] = await Promise.all([
    fetchTransactionsAction(query),
    fetchTransactionStatsAction(query),
    prisma.bankAccount.findMany({
      select: { id: true, bankId: true, accountNo: true },
    })
  ]);

  return (
    <div className="p-4 md:p-8 pt-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-moss-900 mb-1 font-display">
            Quản lý giao dịch
          </h1>
          <p className="text-moss-500 text-sm">Tra cứu & đối soát lịch sử giao dịch theo thời gian</p>
        </div>

        <a 
          href="/jobs/reports" 
          className="mt-4 sm:mt-0 flex items-center gap-2 bg-surface border border-moss-200 text-mint-700 hover:text-mint-800 hover:bg-mint-50/50 hover:border-mint-300 transition-all px-4 py-2.5 rounded-xl font-semibold shadow-sm text-sm"
        >
          <FileText size={18} />
          Báo cáo chi tiết
        </a>
      </div>

      <Suspense fallback={<div className="h-24 bg-surface rounded-xl animate-pulse"></div>}>
        <TransactionSummary stats={stats} />
      </Suspense>

      <Suspense fallback={<div className="h-24 bg-surface rounded-xl animate-pulse"></div>}>
        <TransactionFilterBar bankAccounts={bankAccounts} />
      </Suspense>

      <Suspense fallback={<div className="h-64 bg-surface rounded-xl animate-pulse"></div>}>
        <TransactionTable transactions={transactions.items} />
      </Suspense>
      
      {/* Pagination Simple Placeholder */}
      <div className="flex justify-between items-center mt-4 px-2">
        <span className="text-sm text-moss-500">
          Hiển thị kết quả của trang hiện tại.
        </span>
        <div className="flex gap-2">
           <button 
             className="px-4 py-2 bg-white border border-moss-200 rounded-lg text-sm font-medium hover:bg-moss-50 disabled:opacity-50 transition-colors"
             disabled={!query.cursor}
           >
             Trở lại
           </button>
           <button 
             className="px-4 py-2 bg-mint-500 text-white rounded-lg text-sm font-medium hover:bg-mint-600 disabled:opacity-50 shadow-sm transition-colors"
             disabled={!transactions.hasMore}
           >
             Trang sau
           </button>
        </div>
      </div>
    </div>
  );
}
