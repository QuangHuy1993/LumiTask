import React from "react";
// Force re-compile
import { SettingsNavigation } from "@/features/settings/ui/SettingsNavigation";
import { AccountSettingsPane } from "@/features/settings/ui/AccountSettingsPane";
import { BillingSettingsPane } from "@/features/settings/ui/BillingSettingsPane";
import { SessionsSettingsPane } from "@/features/settings/ui/SessionsSettingsPane";
import { AppSettingsPane } from "@/features/settings/ui/AppSettingsPane";
import { ChevronRight } from "lucide-react";
import { bankingService } from "@/features/settings/services/bankingService";
import { sessionService } from "@/lib/auth/session";
import { sessionService as settingsSessionService } from "@/features/settings/services/sessionService";
import { appSettingService } from "@/features/settings/services/appSettingService";
import { redirect } from "next/navigation";

type SettingsTab = 'account' | 'billing' | 'sessions' | 'app';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  const user = await sessionService.getCurrentUser();
  if (!user) redirect("/login");

  const resolvedParams = await searchParams;
  const requestedTab = (resolvedParams.tab as SettingsTab) || 'account';
  const allowedTabs: SettingsTab[] = user.role === "OWNER"
    ? ["account", "billing", "sessions", "app"]
    : ["account", "billing", "sessions"];
  const activeTab = allowedTabs.includes(requestedTab) ? requestedTab : "account";
  const page = Number(resolvedParams.page) || 1;

  const renderContent = async () => {
    switch (activeTab) {
      case 'account': {
        const { securityService } = await import("@/features/settings/services/securityService");
        const is2FAEnabled = await securityService.get2FAStatus(user.id);
        return <AccountSettingsPane is2FAEnabledInitial={is2FAEnabled} />;
      }
      case 'billing': {
        const { accounts, total, totalPages } = await bankingService.getBankAccounts(user.id, page, 5);
        return (
          <BillingSettingsPane 
            initialAccounts={accounts} 
            pagination={{ total, totalPages, currentPage: page }} 
          />
        );
      }
      case 'sessions': {
        const sessions = await settingsSessionService.getSessions(user.id);
        return <SessionsSettingsPane initialSessions={sessions} />;
      }
      case 'app': {
        const settings = await appSettingService.getAllAppSettings();
        const aiSettings = await appSettingService.getAISettings(user.id);
        // UI expects `temperature: number`; Prisma may return `temperature: number | null`.
        const normalizedAISettings = aiSettings.map((s) => ({
          ...s,
          temperature: s.temperature ?? 0.7,
          maxTokens: s.maxTokens ?? 4096,
        }));
        return <AppSettingsPane initialSettings={settings} initialAISettings={normalizedAISettings} />;
      }
      default: {
        const { securityService } = await import("@/features/settings/services/securityService");
        const is2FAEnabled = await securityService.get2FAStatus(user.id);
        return <AccountSettingsPane is2FAEnabledInitial={is2FAEnabled} />;
      }
    }
  };

  const currentTabLabel = {
    account: "Tài khoản & bảo mật",
    billing: "Ngân hàng & thanh toán",
    sessions: "Phiên đăng nhập",
    app: "Cài đặt ứng dụng"
  }[activeTab];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 h-full flex flex-col">
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 text-sm text-moss-400">
        <span className="hover:text-moss-600 cursor-pointer transition-colors">Cài đặt</span>
        <ChevronRight className="size-4" />
        <span className="text-primary font-semibold">{currentTabLabel}</span>
      </div>

      <div className="flex flex-col md:flex-row gap-8 flex-1 overflow-hidden">
        {/* Settings Sub-Sidebar */}
        <SettingsNavigation activeTab={activeTab} role={user.role} />

        {/* Settings Content Area */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10">
          {await renderContent()}
        </div>
      </div>
    </div>
  );
}
