"use client";

import React, { useState, useMemo } from "react";
import { Plus, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import {
  createUserAction,
  updateUserAction,
  disableUserAction,
  enableUserAction,
} from "../actions/adminUsersActions";
import { UsersTable } from "./UsersTable";
import { UserForm } from "./UserForm";
import type {
  UserDTO,
  CreateUserFormValues,
  UpdateUserFormValues,
} from "../model/userSchema";

interface UsersListContainerProps {
  initialUsers: UserDTO[];
  currentUserId: number;
}

const ITEMS_PER_PAGE = 10;

export function UsersListContainer({ initialUsers, currentUserId }: UsersListContainerProps) {
  const [users, setUsers] = useState<UserDTO[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<UserDTO | null>(null);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return users.filter(
      (u) =>
        u.username.toLowerCase().includes(term) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.fullName && u.fullName.toLowerCase().includes(term))
    );
  }, [users, searchTerm]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const handleAdd = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: UserDTO) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: CreateUserFormValues | UpdateUserFormValues) => {
    setIsLoading(true);
    try {
      if (editingUser) {
        const res = await updateUserAction(editingUser.id, data);
        if (res.success && res.data) {
          setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? (res.data as UserDTO) : u)));
          toast.success("Đã cập nhật người dùng");
          setIsModalOpen(false);
        } else {
          toast.error(res.error || "Lỗi khi cập nhật");
        }
      } else {
        const res = await createUserAction(data);
        if (res.success && res.data) {
          setUsers((prev) => [res.data as UserDTO, ...prev]);
          toast.success("Đã tạo tài khoản mới");
          setIsModalOpen(false);
        } else {
          toast.error(res.error || "Lỗi khi tạo tài khoản");
        }
      }
    } catch {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableClick = (user: UserDTO) => {
    setTargetUser(user);
    setDisableDialogOpen(true);
  };

  const handleConfirmDisable = async () => {
    if (!targetUser) return;
    setIsLoading(true);
    const id = targetUser.id;
    setDisableDialogOpen(false);
    try {
      const res = await disableUserAction(id);
      if (res.success) {
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isActive: false } : u)));
        toast.success("Đã tắt tài khoản người dùng");
      } else {
        toast.error(res.error || "Lỗi khi tắt tài khoản");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsLoading(false);
      setTargetUser(null);
    }
  };

  const handleEnable = async (user: UserDTO) => {
    setIsLoading(true);
    try {
      const res = await enableUserAction(user.id);
      if (res.success) {
        setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, isActive: true } : u)));
        toast.success("Đã kích hoạt tài khoản");
      } else {
        toast.error(res.error || "Lỗi khi kích hoạt");
      }
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Tổng tài khoản", value: users.length, color: "text-slate-700" },
          { label: "Đang hoạt động", value: users.filter((u) => u.isActive).length, color: "text-primary" },
          { label: "Đã tắt", value: users.filter((u) => !u.isActive).length, color: "text-coral-500" },
          { label: "Chủ sở hữu", value: users.filter((u) => u.role === "OWNER").length, color: "text-amber-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <p className={`text-3xl font-black mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-sm group">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-300 group-focus-within:text-primary transition-colors">
            <Search className="size-5" />
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên đăng nhập hoặc họ tên..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="block w-full pl-11 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-slate-800 shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-5 py-4 border border-slate-100 bg-white rounded-2xl text-slate-500 font-bold text-xs hover:bg-slate-50 transition-all shadow-sm"
          >
            <RefreshCw className="size-4" />
            Làm mới
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center justify-center gap-2 py-4 px-8 rounded-2xl bg-primary hover:bg-primary-hover text-white font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-primary/20 w-full md:w-auto active:scale-[0.98]"
          >
            <Plus className="size-5" />
            Thêm người dùng
          </button>
        </div>
      </div>

      {/* Count */}
      <div className="flex items-center justify-between px-2 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
        <span>Hiển thị {paginatedUsers.length} / {filteredUsers.length} người dùng</span>
      </div>

      {/* Table */}
      <UsersTable
        users={paginatedUsers}
        currentUserId={currentUserId}
        onEdit={handleEdit}
        onDisable={handleDisableClick}
        onEnable={handleEnable}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="p-3 border border-slate-100 rounded-2xl hover:bg-slate-50 disabled:opacity-30 transition-all text-slate-400"
          >
            <ChevronLeft className="size-6" />
          </button>
          <div className="flex gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`size-12 rounded-2xl text-xs font-black transition-all ${
                  currentPage === page
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "bg-white border border-slate-100 text-slate-400 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="p-3 border border-slate-100 rounded-2xl hover:bg-slate-50 disabled:opacity-30 transition-all text-slate-400"
          >
            <ChevronRight className="size-6" />
          </button>
        </div>
      )}

      {/* Form modal */}
      <UserForm
        show={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        editingUser={editingUser}
        isLoading={isLoading}
      />

      {/* Disable confirmation */}
      <ConfirmationDialog
        isOpen={disableDialogOpen}
        onClose={() => setDisableDialogOpen(false)}
        onConfirm={handleConfirmDisable}
        title="Tắt tài khoản người dùng?"
        description={`Tài khoản "@${targetUser?.username}" sẽ bị tắt và bị đăng xuất khỏi tất cả thiết bị. Bạn có thể kích hoạt lại sau.`}
        confirmText="Tắt tài khoản"
        variant="danger"
        isLoading={isLoading}
      />
    </div>
  );
}
