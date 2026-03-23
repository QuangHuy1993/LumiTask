"use client";

import React, { useState } from "react";
import { Eye, ChevronDown, Sparkles, Key, BarChart2, Loader2, Save, User, MessageCircle, Link2, Mail } from "lucide-react";
import { upsertAdminContactSettingsAction, upsertAppSettingAction, upsertAISettingAction } from "../actions/appSettingActions";
import { toast } from "sonner";

interface AppSetting {
  key: string;
  value: string;
}

interface AISetting {
  name: string;
  provider: string;
  model: string;
  apiKey: string | null;
  temperature: number;
}

interface AppSettingsPaneProps {
  initialSettings: AppSetting[];
  initialAISettings: AISetting[];
}

export function AppSettingsPane({ initialSettings, initialAISettings }: AppSettingsPaneProps) {
  const [isAiConfigOpen, setIsAiConfigOpen] = useState(false);
  const [isAdminConfigOpen, setIsAdminConfigOpen] = useState(true);
  const [isPending, setIsPending] = useState<string | null>(null);

  // Helper to get setting value
  const getSetting = (key: string) => initialSettings.find(s => s.key === key)?.value ?? "";
  const getSettingBool = (key: string) => getSetting(key) === "true";

  const [adminName, setAdminName] = useState(getSetting("trading_admin_name"));
  const [adminZalo, setAdminZalo] = useState(getSetting("trading_admin_zalo"));
  const [adminFacebookUrl, setAdminFacebookUrl] = useState(getSetting("trading_admin_facebook_url"));
  const [adminEmail, setAdminEmail] = useState(getSetting("trading_admin_email"));
  
  const handleToggle = async (key: string, currentValue: boolean) => {
    setIsPending(key);
    const newValue = currentValue ? "false" : "true";
    try {
      const res = await upsertAppSettingAction({ key, value: newValue });
      if (res.success) toast.success("Đã cập nhật");
      else toast.error("Có lỗi xảy ra");
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsPending(null);
    }
  };

  const handleAISave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending("ai");
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());
    
    try {
      const res = await upsertAISettingAction({
        name: "Default Profile",
        provider: "OPENAI", // Simplified for now
        model: "gpt-4o",
        apiKey: data.apiKey,
        temperature: parseFloat(data.temperature as string),
      });
      if (res.success) toast.success("Đã lưu cấu hình AI");
      else toast.error("Có lỗi xảy ra");
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsPending(null);
    }
  };

  const showBalance = getSettingBool("show_dashboard_balance");
  const aiConfig = initialAISettings[0] || { apiKey: "", temperature: 0.7 };

  const saveAdminContact = async () => {
    setIsPending("admin_contact");
    try {
      const res = await upsertAdminContactSettingsAction({
        adminName,
        adminZalo,
        adminFacebookUrl,
        adminEmail,
      });
      if (!res.success) {
        toast.error("Không thể lưu thông tin ADMIN.");
        return;
      }
      toast.success("Đã lưu thông tin ADMIN cho email reminder.");
    } catch {
      toast.error("Lỗi hệ thống khi lưu thông tin ADMIN.");
    } finally {
      setIsPending(null);
    }
  };

  return (
    <section className="space-y-6 animate-fade-in-up">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold text-moss-900 tracking-tight">Cài đặt ứng dụng</h2>
        <p className="text-moss-500 text-sm">Tinh chỉnh các tùy chọn hiển thị và cấu hình nâng cao.</p>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-moss-100 p-6 space-y-6">
        {/* Dashboard Balance Toggle */}
        <div className="flex items-center justify-between group">
          <div className="flex gap-4">
            <div className="p-2.5 bg-moss-50 text-moss-600 rounded-xl group-hover:text-primary transition-colors">
              <Eye className="size-5" />
            </div>
            <div>
              <p className="font-bold text-moss-900">Hiển thị số dư Dashboard</p>
              <p className="text-xs text-moss-500 mt-0.5">Hiểu thị nhanh số dư khả dụng ở màn hình chính.</p>
            </div>
          </div>
          <button 
            disabled={isPending === "show_dashboard_balance"}
            onClick={() => handleToggle("show_dashboard_balance", showBalance)}
            className={`w-12 h-6 rounded-full relative transition-all duration-300 focus:outline-none ring-offset-2 focus:ring-2 focus:ring-primary/20 ${
              showBalance ? "bg-primary" : "bg-moss-200"
            }`}
          >
            <span className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform duration-300 ${
              showBalance ? "translate-x-6" : ""
            }`}></span>
          </button>
        </div>

        <div className="h-px bg-moss-50" />

        {/* Trading Admin Contact (for buyer reminder email) */}
        <div className="rounded-xl border border-moss-100 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsAdminConfigOpen(!isAdminConfigOpen)}
            className="flex items-center justify-between w-full p-4 bg-moss-50/50 hover:bg-moss-50 transition-colors group"
          >
            <span className="font-bold text-moss-900 flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                <User className="size-4 text-primary" />
              </div>
              Thông tin ADMIN cho email nhắc hạn
            </span>
            <ChevronDown className={`size-5 text-moss-400 transition-transform duration-300 ${isAdminConfigOpen ? "rotate-180" : ""}`} />
          </button>

          <div className={`transition-all duration-300 ease-in-out ${isAdminConfigOpen ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
            <div className="space-y-4 border-t border-moss-100 bg-white p-4">
              <p className="text-xs text-moss-500">Buyer sẽ thấy thông tin này để liên hệ gia hạn dịch vụ.</p>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-moss-600 flex items-center gap-2">
                    <User className="size-3.5" />
                    Tên ADMIN
                  </label>
                  <input
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full rounded-xl border border-moss-200 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-primary/20"
                    placeholder="Ví dụ: Lâm Nguyễn"
                    maxLength={120}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-moss-600 flex items-center gap-2">
                    <MessageCircle className="size-3.5" />
                    Zalo
                  </label>
                  <input
                    value={adminZalo}
                    onChange={(e) => setAdminZalo(e.target.value)}
                    className="w-full rounded-xl border border-moss-200 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-primary/20"
                    placeholder="Ví dụ: 0901 234 567"
                    maxLength={50}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-moss-600 flex items-center gap-2">
                    <Mail className="size-3.5" />
                    Email ADMIN nhận nhắc hạn
                  </label>
                  <input
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full rounded-xl border border-moss-200 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-primary/20"
                    placeholder="no-reply@tiemtruyenmeobeo.me"
                    maxLength={255}
                    type="email"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-moss-600 flex items-center gap-2">
                    <Link2 className="size-3.5" />
                    Link Facebook
                  </label>
                  <input
                    value={adminFacebookUrl}
                    onChange={(e) => setAdminFacebookUrl(e.target.value)}
                    className="w-full rounded-xl border border-moss-200 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-primary focus:ring-primary/20"
                    placeholder="https://facebook.com/..."
                    maxLength={500}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Tạm thời hệ thống cố định rule nhắc hạn: dịch vụ cá nhân gửi cho ADMIN, dịch vụ mua bán gửi cho ADMIN và khách hàng.
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={isPending === "admin_contact"}
                  onClick={() => void saveAdminContact()}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white transition-all hover:bg-primary-hover disabled:opacity-60"
                >
                  {isPending === "admin_contact" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Lưu thông tin ADMIN
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="h-px bg-moss-50" />

        {/* AI Config Accordion */}
        <div className="rounded-xl border border-moss-100 overflow-hidden">
          <button 
            onClick={() => setIsAiConfigOpen(!isAiConfigOpen)}
            className="flex items-center justify-between w-full p-4 bg-moss-50/50 hover:bg-moss-50 transition-colors group"
          >
            <span className="font-bold text-moss-900 flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                <Sparkles className="size-4 text-primary" />
              </div>
              Cấu hình Trợ lý AI (Nâng cao)
            </span>
            <ChevronDown className={`size-5 text-moss-400 transition-transform duration-300 ${isAiConfigOpen ? 'rotate-180' : ''}`} />
          </button>
          
          <div className={`transition-all duration-300 ease-in-out ${isAiConfigOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
            <form onSubmit={handleAISave} className="p-6 space-y-5 border-t border-moss-100 bg-white">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-moss-600 flex items-center gap-2">
                  <Key className="size-3" />
                  API Key
                </label>
                <input 
                  name="apiKey"
                  defaultValue={aiConfig.apiKey || ""}
                  className="w-full rounded-xl border-moss-200 bg-moss-50/30 focus:border-primary focus:ring-primary/20 transition-all px-4 py-2.5 outline-none text-sm font-mono" 
                  placeholder="sk-••••••••••••••••" 
                  type="password"
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-xs font-bold text-moss-600 flex items-center gap-2">
                  <BarChart2 className="size-3" />
                  Mức độ sáng tạo (Temperature): {aiConfig.temperature}
                </label>
                <input 
                  name="temperature"
                  defaultValue={aiConfig.temperature}
                  className="w-full h-1.5 bg-moss-100 rounded-lg appearance-none cursor-pointer accent-primary" 
                  max="1.5" 
                  min="0" 
                  step="0.1" 
                  type="range"
                />
                <div className="flex justify-between text-[10px] text-moss-400 font-bold uppercase tracking-tighter">
                  <span>Chính xác</span>
                  <span>Sáng tạo</span>
                </div>
              </div>

              <div className="p-3 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-[10px] text-primary leading-relaxed font-medium">
                  Lưu ý: Bạn cần cấu hình API Key hợp lệ để sử dụng các tính năng liên quan đến AI như phân tích chi tiêu hoặc gợi ý việc làm.
                </p>
              </div>

              <button 
                disabled={isPending === "ai"}
                className="w-full py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
              >
                {isPending === "ai" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Lưu cấu hình AI
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
