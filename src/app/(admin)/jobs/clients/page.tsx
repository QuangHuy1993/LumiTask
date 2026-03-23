import React, { Suspense } from "react";
import { Users } from "lucide-react";
import { getClientsAction, getClientStatsAction } from "@/features/admin-clients/actions/clientActions";
import { ClientListContainer } from "@/features/admin-clients/ui/ClientListContainer";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Quản lý khách hàng | LumiTask",
  description: "Quản lý thông tin đối tác và khách hàng thân thiết.",
};

export default async function ClientsPage() {
  const [clientsRes, statsRes] = await Promise.all([
    getClientsAction(),
    getClientStatsAction()
  ]);

  const clients = clientsRes.success ? clientsRes.data || [] : [];
  const stats = statsRes.success ? statsRes.data || { total: 0, active: 0, monthNew: 0, online: 0 } : { total: 0, active: 0, monthNew: 0, online: 0 };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-10 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-glow-mint">
              <Users size={32} />
            </div>
            Quản lý khách hàng
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs mt-3 ml-1">
            Danh sách đối tác & Khách hàng tiềm năng của hệ thống
          </p>
        </div>
      </div>

      <Suspense fallback={<LoadingSkeleton message="Đang tải danh sách khách hàng..." />}>
        <ClientListContainer initialClients={clients} initialStats={stats} />
      </Suspense>
    </div>
  );
}
