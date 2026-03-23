import type { Metadata } from "next";

import { SubscriptionDetailPageClient } from "@/features/trading/ui/SubscriptionDetailPageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chi tiết dịch vụ | Quản lý mua bán",
  description: "Gia hạn và cập nhật giá gói theo chu kỳ.",
};

export default async function TradingSubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SubscriptionDetailPageClient subscriptionId={Number(id)} />;
}

