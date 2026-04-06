import React from "react";
import { AdminShell } from "@/features/admin/ui/AdminShell";
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
    <AdminShell user={user}>
      {children}
    </AdminShell>
  );
}
