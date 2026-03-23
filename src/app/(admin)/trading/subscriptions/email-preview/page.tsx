import type { Metadata } from "next";

import { getSubscriptionsAction } from "@/features/trading/actions/subscriptionActions";
import { ReminderEmailPreviewPageClient } from "@/features/trading/ui/email/ReminderEmailPreviewPageClient";
import { appSettingService } from "@/features/settings/services/appSettingService";
import { sessionService } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Preview email nhac han | Quan ly mua ban",
  description: "Mobile-first preview cho email nhac han dich vu.",
};

export default async function TradingSubscriptionEmailPreviewPage() {
  const [subscriptionRes, settings, currentUser] = await Promise.all([
    getSubscriptionsAction({ limit: 50, page: 1, status: "UPCOMING", activeOnly: true }),
    appSettingService.getAllAppSettings(),
    sessionService.getCurrentUser(),
  ]);

  const settingsMap = new Map(settings.map((item) => [item.key, item.value]));
  const adminContact = {
    name: settingsMap.get("trading_admin_name") ?? "ADMIN",
    zalo: settingsMap.get("trading_admin_zalo") ?? "",
    facebookUrl: settingsMap.get("trading_admin_facebook_url") ?? "",
  };

  const subscriptions = subscriptionRes.success ? subscriptionRes.data.items : [];

  return (
    <ReminderEmailPreviewPageClient
      subscriptions={subscriptions}
      adminContact={adminContact}
      ownerName={currentUser?.fullName ?? currentUser?.username ?? "ADMIN"}
    />
  );
}

