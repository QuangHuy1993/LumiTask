"use client";

import React from "react";
import { MoreVertical } from "lucide-react";
import Link from "next/link";

export type PriorityJob = {
  id: number;
  name: string;
  client: string;
  deadline: string;
  status: string;
  statusColor: string;
  budget: string;
};

export function PriorityJobsTable({ data }: { data: PriorityJob[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-moss-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-moss-100 flex items-center justify-between">
        <h3 className="text-lg font-bold">Danh sách việc ưu tiên</h3>
        <Link href="/jobs" className="text-sm text-primary font-semibold hover:underline">Quản lý job</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-moss-50 text-moss-500 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Tên công việc</th>
              <th className="px-6 py-4">Khách hàng</th>
              <th className="px-6 py-4">Thời hạn</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4">Ngân sách</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-moss-100">
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-sm text-moss-500 italic">
                  Không có việc làm nào
                </td>
              </tr>
            ) : data.map((job, index) => (
              <tr key={index} className="hover:bg-moss-50/50 transition-all">
                <td className="px-6 py-4 font-semibold text-sm">{job.name}</td>
                <td className="px-6 py-4 text-sm text-moss-600">{job.client}</td>
                <td className="px-6 py-4 text-sm">{job.deadline}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${
                    job.statusColor === 'primary' ? 'bg-primary/10 text-primary' :
                    job.statusColor === 'amber' ? 'bg-amber-100 text-amber-600' :
                    'bg-red-100 text-red-500'
                  }`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-bold">{job.budget}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
