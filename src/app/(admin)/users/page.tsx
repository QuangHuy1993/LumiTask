import React from "react";
import { UserCog } from "lucide-react";
import { sessionService } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getUsersAction } from "@/features/admin-users/actions/adminUsersActions";
import { UsersListContainer } from "@/features/admin-users/ui/UsersListContainer";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Quản lý người dùng | LumiTask",
  description: "Tạo và quản lý tài khoản người dùng hệ thống.",
};

export default async function UsersPage() {
  const me = await sessionService.getCurrentUser();
  if (!me) redirect("/login");

  const res = await getUsersAction();
  const users = res.success ? (res.data ?? []) : [];

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-10 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl text-primary shadow-glow-mint">
              <UserCog size={32} />
            </div>
            Quản lý người dùng
          </h1>
          <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs mt-3 ml-1">
            Tạo tài khoản, phân quyền và quản lý truy cập hệ thống
          </p>
        </div>
      </div>

      <UsersListContainer initialUsers={users} currentUserId={me.id} />
    </div>
  );
}
