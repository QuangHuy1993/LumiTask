import React from "react";
import { TransactionStatsDTO } from "../model/transactionTypes";
import { ArrowUpRight, ArrowDownRight, RefreshCcw, Wallet } from "lucide-react";

const formatVND = (amount: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

interface TransactionSummaryProps {
  stats: TransactionStatsDTO;
}

export function TransactionSummary({ stats }: TransactionSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <SummaryCard 
        title="TỔNG GIAO DỊCH"
        value={stats.totalCount.toString()}
        subtitle="+12% so với tháng trước"
        subtitleColor="text-mint-600"
        icon={<RefreshCcw size={20} className="text-mint-500" />}
      />

      <SummaryCard 
        title="TỔNG TIỀN VÀO"
        value={formatVND(stats.totalIncoming)}
        subtitle="↑ 8.4%"
        subtitleColor="text-mint-600"
        icon={<span className="text-mint-500 font-bold text-lg">V</span>}
      />

      <SummaryCard 
        title="TỔNG TIỀN RA"
        value={formatVND(stats.totalOutgoing)}
        subtitle="Đã sử dụng ngân sách: 64%"
        subtitleColor="text-moss-500"
        icon={<span className="text-coral-500 font-bold text-lg">R</span>}
        borderColor="border-coral-100"
        indicatorClass="bg-coral-500"
      />

      <SummaryCard 
        title="CHÊNH LỆCH"
        value={formatVND(stats.netDifference)}
        subtitle="Ước tính lãi ròng"
        subtitleColor="text-mint-800/80"
        icon={<Wallet size={20} className="text-mint-800" />}
        gradient="bg-gradient-to-br from-mint-400 to-mint-500 text-white"
        titleColor="text-white/90"
        valueColor="text-white"
      />
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: string;
  subtitle: string;
  subtitleColor?: string;
  icon: React.ReactNode;
  gradient?: string;
  titleColor?: string;
  valueColor?: string;
  borderColor?: string;
  indicatorClass?: string;
}

function SummaryCard({ 
  title, value, subtitle, subtitleColor, icon, 
  gradient, titleColor = "text-moss-500", valueColor = "text-gray-900", 
  borderColor = "border-moss-100", indicatorClass
}: SummaryCardProps) {
  const isSolid = !!gradient;

  return (
    <div className={`relative flex flex-col justify-between p-6 rounded-2xl shadow-card
      ${isSolid ? gradient : 'bg-surface'} border ${isSolid ? 'border-transparent' : borderColor}
      transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden group`}
    >
      {/* Decorative side indicator */}
      {!isSolid && indicatorClass && (
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${indicatorClass}`} />
      )}
      
      <div className="flex justify-between items-start mb-4">
        <h3 className={`text-xs font-bold uppercase tracking-wider ${titleColor}`}>
          {title}
        </h3>
        <div className={`p-2 rounded-xl bg-opacity-10 transition-colors ${isSolid ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-gray-200'}`}>
          {icon}
        </div>
      </div>
      
      <div>
        <div className={`text-2xl font-extrabold tracking-tight mb-2 ${valueColor}`}>
          {value}
        </div>
        <div className={`text-xs font-medium ${subtitleColor || 'text-moss-500'}`}>
          {subtitle}
        </div>
      </div>
    </div>
  );
}
