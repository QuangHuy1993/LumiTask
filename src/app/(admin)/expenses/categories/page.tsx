import type { Metadata } from "next";

import { FinanceCategoriesClient } from "@/features/expenses/ui/FinanceCategoriesClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Danh mục thu/chi | LumiTask",
  description: "Quản lý danh mục thu nhập và chi tiêu cá nhân.",
};

export default function FinanceCategoriesPage() {
  return <FinanceCategoriesClient />;
}
