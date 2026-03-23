import type { Metadata } from "next";

import { SubscriptionsPageClient } from "@/features/trading/ui/SubscriptionsPageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dịch vụ & nhắc hạn | Quản lý mua bán",
  description: "Theo dõi các gói dịch vụ và nhận email nhắc hạn.",
};

export default function TradingSubscriptionsPage() {
  return <SubscriptionsPageClient />;
}

