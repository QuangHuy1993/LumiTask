import { Loader2, QrCode } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 animate-in fade-in duration-500">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
        <div className="relative bg-white p-6 rounded-3xl shadow-xl border border-moss-100 flex items-center justify-center">
          <QrCode size={48} className="text-primary opacity-20" />
          <Loader2 className="absolute size-10 animate-spin text-primary" />
        </div>
      </div>
      <div className="space-y-4 text-center">
        <p className="text-sm font-black text-moss-900 uppercase tracking-[0.2em]">Đang thiết lập cổng thanh toán</p>
        <div className="h-1 w-32 bg-moss-100 rounded-full mx-auto overflow-hidden">
          <div className="h-full bg-primary w-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
