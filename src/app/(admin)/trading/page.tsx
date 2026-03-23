import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Quản lý mua bán | LumiTask",
  description: "Quản lý contacts, dịch vụ và nhắc hạn theo chu kỳ.",
};

export default function TradingRootPage() {
  redirect("/trading/subscriptions");
}

