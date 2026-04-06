import { redirect } from "next/navigation";
import { dashboardQueryOrDefault } from "@/features/expenses/api/parseDashboardRangeFromSearchParams";
import { FinanceExpensesDashboardClient } from "@/features/expenses/ui/FinanceExpensesDashboardClient";
import { sessionService } from "@/lib/auth/session";
import { financeDashboardService } from "@/features/expenses/services/financeDashboardService";

export const metadata = {
  title: "Tổng quan chi tiêu | LumiTask",
};

export const revalidate = 60;

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExpensesDashboardPage({ searchParams }: Props) {
  const user = await sessionService.getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const query = dashboardQueryOrDefault(sp);
  const bundle = await financeDashboardService.getDashboardBundle(user.id, query);

  const periodLabel =
    query.from && query.to
      ? `${query.from} → ${query.to}`
      : query.preset === "thisMonth"
        ? "Tháng này"
        : "30 ngày qua";

  const periodToggleHref =
    query.from && query.to
      ? "/expenses/dashboard?preset=last30d"
      : query.preset === "thisMonth"
        ? "/expenses/dashboard?preset=last30d"
        : "/expenses/dashboard?preset=thisMonth";

  return (
    <FinanceExpensesDashboardClient
      bundle={bundle}
      periodLabel={periodLabel}
      periodToggleHref={periodToggleHref}
    />
  );
}
