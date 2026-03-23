import type { Metadata } from "next";

import { ManualReminderApprovalPageClient } from "@/features/trading/ui/ManualReminderApprovalPageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Duyệt gửi email nhắc hạn | Quản lý mua bán",
  description: "Duyệt từng dịch vụ đến hạn và gửi email nhắc hạn theo lựa chọn.",
};

export default function TradingManualReminderApprovalPage() {
  return <ManualReminderApprovalPageClient />;
}

