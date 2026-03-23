"use client";

import React from "react";
import { Edit2, Trash2, Calendar } from "lucide-react";
import { SubjectDTO } from "@/features/admin-subjects/model/subjectSchema";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface SubjectTableProps {
  subjects: SubjectDTO[];
  onEdit: (subject: SubjectDTO) => void;
  onDelete: (id: number) => void;
}

export function SubjectTable({ subjects, onEdit, onDelete }: SubjectTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-moss-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mã môn</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tên môn học</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Công việc</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ngày tạo</th>
              <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-moss-100">
            {subjects.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-moss-400">
                  Chưa có môn học nào được tạo.
                </td>
              </tr>
            ) : (
              subjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-moss-50/30 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-slate-100 rounded text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                      {subject.code || "---"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full shadow-sm" 
                        style={{ backgroundColor: subject.color || "#3B82F6" }}
                      />
                      <span className="text-sm font-bold text-slate-700">
                        {subject.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <span className="text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                        {subject._count?.jobs || 0} công việc
                     </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-400 font-medium">
                    {format(new Date(subject.createdAt), "dd/MM/yyyy", { locale: vi })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEdit(subject)}
                        className="p-1.5 hover:bg-moss-100 rounded-lg text-moss-400 hover:text-primary transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      <button 
                        onClick={() => onDelete(subject.id)}
                        className="p-1.5 hover:bg-coral-50 rounded-lg text-moss-400 hover:text-coral-500 transition-colors"
                        title="Xóa"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
