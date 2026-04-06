import { ExpensesSubNav } from "@/features/expenses/ui/ExpensesSubNav";

export const metadata = {
  title: "Chuyển ví | LumiTask",
};

export default function FinanceTransfersPlaceholderPage() {
  return (
    <main className="mx-auto max-w-[1200px] flex-1 space-y-6 bg-slate-50 p-4 sm:p-6 lg:p-8">
      <ExpensesSubNav />
      <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-2xl font-black tracking-tight text-on-surface">Chuyển ví</h1>
        <p className="text-sm font-medium leading-relaxed text-on-surface-variant">
          Tính năng đang được phát triển. Tại đây bạn sẽ ghi nhận các lần chuyển tiền giữa các ví trong cùng hệ
          thống.
        </p>
      </div>
    </main>
  );
}
