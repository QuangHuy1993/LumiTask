import { listFinanceCategoriesAction } from "@/features/expenses/actions/financeCategoryActions";
import { listGoalsAction } from "@/features/expenses/actions/financeSavingsGoalActions";
import { listWalletsAction } from "@/features/expenses/actions/financeWalletActions";
import { FinanceSavingsGoalsClient } from "@/features/expenses/ui/FinanceSavingsGoalsClient";

export const metadata = {
  title: "Mục tiêu tiết kiệm | LumiTask",
};

export default async function FinanceSavingsGoalsPage() {
  const [goalsRes, categoriesRes, walletsRes] = await Promise.all([
    listGoalsAction(),
    listFinanceCategoriesAction({ kind: "EXPENSE", limit: 100, isActive: true }),
    listWalletsAction({ limit: 100 }),
  ]);

  return (
    <FinanceSavingsGoalsClient
      initialGoals={goalsRes.success ? goalsRes.items : []}
      expenseCategories={categoriesRes.success ? categoriesRes.items : []}
      wallets={walletsRes.success ? walletsRes.items : []}
    />
  );
}
