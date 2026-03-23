"use server";

import { getTransactionList, getTransactionStats } from "../services/transactionService";
import { TransactionListQuery } from "../model/transactionTypes";

export async function fetchTransactionsAction(query: TransactionListQuery) {
  try {
    return await getTransactionList(query);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    throw new Error("Không thể tải danh sách giao dịch");
  }
}

export async function fetchTransactionStatsAction(query: TransactionListQuery) {
  try {
    return await getTransactionStats(query);
  } catch (error) {
    console.error("Error fetching transaction stats:", error);
    throw new Error("Không thể tải thống kê giao dịch");
  }
}

export async function fetchTransactionDetailAction(id: number) {
  try {
    const { getTransactionById } = await import("../services/transactionService");
    return await getTransactionById(id);
  } catch (error) {
    console.error("Error fetching transaction detail:", error);
    throw new Error("Không thể tải chi tiết giao dịch");
  }
}
