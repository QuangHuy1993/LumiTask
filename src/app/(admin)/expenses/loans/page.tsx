import { financeLoanService } from "@/features/expenses/services/financeLoanService";
import { sessionService } from "@/lib/auth/session";
import { FinanceLoansClient } from "@/features/expenses/ui/FinanceLoansClient";

export const metadata = {
  title: "Quản lý khoản nợ | LumiTask",
};

export default async function FinanceLoansPage() {
  const user = await sessionService.getCurrentUser();
  if (!user) return <div className="p-6">Vui lòng đăng nhập.</div>;

  const [loansRes, stats] = await Promise.all([
    financeLoanService.listLoans({
      ownerId: user.id,
      limit: 200,
      direction: "ALL",
      status: "ALL",
    }),
    financeLoanService.getStats(user.id),
  ]);

  return <FinanceLoansClient initialLoans={loansRes.items} initialStats={stats} />;
}
