"use client";

import React from "react";
import { Edit2, UserX, UserCheck, UserCog, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type { UserDTO } from "../model/userSchema";

interface UsersTableProps {
  users: UserDTO[];
  currentUserId: number;
  onEdit: (user: UserDTO) => void;
  onDisable: (user: UserDTO) => void;
  onEnable: (user: UserDTO) => void;
}

export function UsersTable({ users, currentUserId, onEdit, onDisable, onEnable }: UsersTableProps) {
  if (users.length === 0) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-100 p-20 text-center">
        <div className="size-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-6">
          <UserCog className="size-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Chưa có người dùng nào</h3>
        <p className="text-slate-500 max-w-sm mx-auto">
          Hãy tạo tài khoản người dùng mới để cấp quyền truy cập hệ thống.
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
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tài khoản</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Email</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Họ tên</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Quyền hạn</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Trạng thái</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Đăng nhập cuối</th>
              <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              return (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-black text-xs shrink-0">
                        {(user.fullName || user.username).slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm">{user.username}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">#{user.id.toString().padStart(3, "0")}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-[12px] text-slate-600 font-medium">
                      {user.email || <span className="text-slate-300 italic text-xs">Chưa có</span>}
                    </p>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm text-slate-700 font-medium">
                      {user.fullName || <span className="text-slate-300 italic text-xs">Chưa cài đặt</span>}
                    </p>
                    {isSelf && (
                      <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                        Bạn
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        user.role === "OWNER"
                          ? "bg-amber-50 text-amber-600 border-amber-200"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                    >
                      {user.role === "OWNER" ? "Chủ sở hữu" : "Hạn chế"}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        user.isActive
                          ? "bg-primary/5 text-primary border-primary/20"
                          : "bg-coral-50 text-coral-500 border-coral-100"
                      }`}
                    >
                      <span className={`size-1.5 rounded-full ${user.isActive ? "bg-primary" : "bg-coral-500"}`} />
                      {user.isActive ? "Hoạt động" : "Đã tắt"}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {user.lastLoginAt ? (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="size-3.5" />
                        <span className="text-[11px] font-medium">
                          {format(new Date(user.lastLoginAt), "HH:mm, dd/MM/yyyy", { locale: vi })}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Calendar className="size-3.5" />
                        <span className="text-[11px] italic">Chưa đăng nhập</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit(user)}
                        className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="size-4" />
                      </button>
                      {!isSelf && (
                        user.isActive ? (
                          <button
                            onClick={() => onDisable(user)}
                            className="p-2.5 text-slate-400 hover:text-coral-500 hover:bg-coral-50 rounded-xl transition-all"
                            title="Tắt tài khoản"
                          >
                            <UserX className="size-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => onEnable(user)}
                            className="p-2.5 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                            title="Kích hoạt lại"
                          >
                            <UserCheck className="size-4" />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
