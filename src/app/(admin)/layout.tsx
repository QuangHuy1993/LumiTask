import React from "react";
import { AdminHeader } from "@/features/admin/ui/AdminHeader";
import { AdminSidebar } from "@/features/admin/ui/AdminSidebar";
import { sessionService } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await sessionService.getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="h-screen bg-background-light text-moss-900 flex flex-col overflow-hidden">
      <AdminHeader user={user} />
      <div className="flex flex-1 overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
