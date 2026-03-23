import React from "react";
import type { Metadata } from "next";
import { TransactionDetailClient } from "@/features/transactions/ui/TransactionDetailClient";
import { fetchTransactionDetailAction } from "@/features/transactions/actions/transactionActions";

export const metadata: Metadata = {
  title: "Chi tiết giao dịch - LumiTask",
  description: "Chi tiết giao dịch và đối soát.",
};

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const id = Number(resolvedParams.id);
  
  const transaction = isNaN(id) ? null : await fetchTransactionDetailAction(id);

  return <TransactionDetailClient initialData={transaction} />;
}
