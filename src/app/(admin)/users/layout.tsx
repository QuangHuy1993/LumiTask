import React from "react";
import { redirect } from "next/navigation";
import { sessionService } from "@/lib/auth/session";

export default async function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await sessionService.getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "OWNER") redirect("/expenses/dashboard");

  return <>{children}</>;
}
