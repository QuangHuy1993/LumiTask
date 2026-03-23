import type { Metadata } from "next";

import { ContactsPageClient } from "@/features/trading/ui/ContactsPageClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Contacts | Quản lý mua bán",
  description: "Quản lý tệp contacts (Zalo/Facebook) phục vụ giao dịch.",
};

export default function TradingContactsPage() {
  return <ContactsPageClient />;
}

