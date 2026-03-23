import type { Metadata } from "next";

import { CategoriesPageClient } from "@/features/trading/ui/CategoriesPageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Danh mục dịch vụ | Quản lý mua bán",
  description: "Quản lý categories để mở rộng các dịch vụ như Spotify, Locket Gold...",
};

export default function TradingCategoriesPage() {
  return <CategoriesPageClient />;
}

