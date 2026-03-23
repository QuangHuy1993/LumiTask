"use client";

import React from "react";
import { Edit2, Trash2, Mail, Phone, MessageSquare, Calendar, Users } from "lucide-react";
import { ClientDTO } from "../model/clientSchema";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface ClientTableProps {
  clients: ClientDTO[];
  onEdit: (client: ClientDTO) => void;
  onDelete: (id: number) => void;
}

export function ClientTable({ clients, onEdit, onDelete }: ClientTableProps) {
  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-20 text-center">
        <div className="size-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
          <Users className="size-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Chưa có khách hàng nào</h3>
        <p className="text-slate-500 max-w-sm mx-auto">
          Danh sách khách hàng của bạn hiện đang trống. Hãy thêm khách hàng mới để bắt đầu quản lý.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ID & Avatar</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Thông tin chính</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Liên hệ</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Thống kê</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Ngày tạo</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-slate-300 font-bold">#{client.id.toString().padStart(3, '0')}</span>
                    <div className="size-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs">
                      {client.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <div>
                    <p className="font-black text-slate-800 text-sm">{client.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Khách hàng thân thiết</p>
                  </div>
                </td>
                <td className="px-6 py-5 space-y-1">
                  {client.email && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mail className="size-3" />
                      <span className="text-[11px] font-medium">{client.email}</span>
                    </div>
                  )}
                  {(client.phone || client.zalo) && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Phone className="size-3" />
                      <span className="text-[11px] font-medium">{client.phone || client.zalo}</span>
                    </div>
                  )}
                  {!client.email && !client.phone && !client.zalo && (
                    <span className="text-[11px] text-slate-300 italic">Chưa có thông tin</span>
                  )}
                </td>
                <td className="px-6 py-5">
                  <span className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-black bg-primary/5 text-primary border border-primary/10 uppercase tracking-tighter">
                    {client._count?.jobs || 0} công việc
                  </span>
                </td>
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Calendar className="size-3" />
                    <span className="text-[11px] font-bold">
                      {format(new Date(client.createdAt), "dd/MM/yyyy", { locale: vi })}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button 
                      onClick={() => onEdit(client)}
                      className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                    >
                      <Edit2 className="size-4" />
                    </button>
                    <button 
                      onClick={() => onDelete(client.id)}
                      className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
