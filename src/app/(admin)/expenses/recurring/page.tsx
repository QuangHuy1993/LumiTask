import { loadFinanceRecurringPageDataAction } from "@/features/expenses/actions/financeRecurringActions";
import { FinanceRecurringClient } from "@/features/expenses/ui/FinanceRecurringClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Định kỳ | LumiTask",
};

export default async function FinanceRecurringPage() {
  const res = await loadFinanceRecurringPageDataAction();

  const initialRules = res.success ? res.rules : [];
  const initialWallets = res.success
    ? res.wallets.map((w) => ({ id: w.id, name: w.name, currency: w.currency }))
    : [];
  const initialCategories = res.success
    ? res.categories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        kind: c.kind,
      }))
    : [];

  return (
    <FinanceRecurringClient
      initialRules={initialRules}
      initialWallets={initialWallets}
      initialCategories={initialCategories}
      revalidateOnMount={!res.success}
    />
  );
}
