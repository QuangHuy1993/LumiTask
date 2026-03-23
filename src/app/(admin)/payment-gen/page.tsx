import { VietQRGenerator } from "@/features/payments/ui/VietQRGenerator";
import { getUserBankAccountsAction } from "@/features/payments/actions/paymentActions";
import { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "VietQR Generator | LumiTask Admin",
  description: "Tạo mã QR thanh toán nhanh chóng cho Napas247",
};

export default async function PaymentGeneratorPage() {
  const accountsRes = (await getUserBankAccountsAction()) || { success: false };
  const initialAccounts = accountsRes.success && accountsRes.data ? accountsRes.data : [];

  return (
    <div className="bg-background-light min-h-full">
      <VietQRGenerator initialAccounts={initialAccounts || []} />
    </div>
  );
}
