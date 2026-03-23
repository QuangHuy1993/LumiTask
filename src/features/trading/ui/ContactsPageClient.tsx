"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Edit2,
  ExternalLink,
  Globe,
  Plus,
  MessageSquare,
  Users,
  Search,
  Trash2,
} from "lucide-react";

import { getContactsAction } from "@/features/trading/actions/contactActions";
import type { ContactMethod, ContactStatus, SaleContactListItemDTO } from "@/features/trading/model/contactTypes";
import { ContactFormModal } from "@/features/trading/ui/ContactFormModal";
import { ContactDeleteModal } from "@/features/trading/ui/ContactDeleteModal";

const statusPillClasses = (s: ContactStatus) => {
  switch (s) {
    case "ACTIVE":
      return "bg-primary/10 text-primary border border-primary/20";
    case "PAUSED":
      return "bg-sand/50 text-sand-700 border border-sand-100";
    case "DORMANT":
    default:
      return "bg-tertiary/10 text-tertiary border border-tertiary/20";
  }
};

const methodPill = (m: ContactMethod) => {
  if (m === "ZALO") {
    return {
      label: "Zalo",
      icon: MessageSquare,
      pill: "bg-primary/10 text-primary border border-primary/20",
    };
  }
  return {
    label: "Facebook",
    icon: Globe,
    pill: "bg-sand/50 text-sand-700 border border-sand-100",
  };
};

function listLoadErrorMessage(error: string, message?: string): string {
  if (error === "VALIDATION_ERROR") return message ?? "Tham số tìm kiếm không hợp lệ.";
  if (error === "UNAUTHENTICATED") return "Bạn cần đăng nhập lại.";
  return "Không thể tải danh sách contacts.";
}

export function ContactsPageClient() {
  const [q, setQ] = useState("");

  const [contactMethodFilter, setContactMethodFilter] = useState<ContactMethod | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "ALL">("ALL");

  const [contacts, setContacts] = useState<SaleContactListItemDTO[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<SaleContactListItemDTO | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SaleContactListItemDTO | null>(null);

  async function reloadList() {
    setIsLoading(true);
    try {
      const res = await getContactsAction({
        limit: 200,
        search: q.trim() ? q.trim() : undefined,
        contactMethod: contactMethodFilter,
        status: statusFilter,
      });
      if (!res.success) {
        toast.error(listLoadErrorMessage(res.error, res.message));
        return;
      }
      setContacts(res.items);
      setTotalCount(res.totalCount);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const t = window.setTimeout(() => {
      void reloadList();
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, contactMethodFilter, statusFilter]);

  const openCreate = () => {
    setFormMode("create");
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: SaleContactListItemDTO) => {
    setFormMode("edit");
    setEditing(row);
    setFormOpen(true);
  };

  const openDelete = (row: SaleContactListItemDTO) => {
    setDeleteTarget(row);
    setDeleteOpen(true);
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shadow-card">
            <Users className="size-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-moss-900">Danh bạ (Zalo/Facebook)</h1>
            <p className="text-moss-500 text-sm">Lưu tệp liên hệ phục vụ bán lại và nhắc hạn theo dịch vụ.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
        >
          <Plus className="size-4" />
          Thêm contact
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-moss-100 p-4 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
          <div className="relative lg:col-span-5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-moss-400 size-5" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full bg-moss-50 border-none rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
              placeholder="Tìm theo tên hoặc định danh..."
            />
          </div>

          <div className="lg:col-span-3">
            <select
              value={contactMethodFilter}
              onChange={(e) => setContactMethodFilter(e.target.value as ContactMethod | "ALL")}
              className="w-full bg-moss-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
              aria-label="Lọc theo phương thức liên hệ"
            >
              <option value="ALL">Tất cả phương thức</option>
              <option value="ZALO">Zalo</option>
              <option value="FACEBOOK">Facebook</option>
            </select>
          </div>

          <div className="lg:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ContactStatus | "ALL")}
              className="w-full bg-moss-50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
              aria-label="Lọc theo trạng thái"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="PAUSED">Tạm dừng</option>
              <option value="DORMANT">Ngưng hoạt động</option>
            </select>
          </div>

          <div className="lg:col-span-1 text-right">
            <div className="text-xs font-bold uppercase tracking-widest text-moss-400">
              {isLoading ? "…" : `${contacts.length} / ${totalCount}`}
            </div>
            <div className="text-[10px] text-moss-400">kết quả</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-card border border-moss-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-moss-100 flex items-center justify-between">
          <h3 className="text-lg font-bold">Danh sách liên hệ</h3>
          <div className="text-sm text-moss-500">
            {isLoading ? "Đang tải..." : "Phục vụ bán lại và nhắc hạn theo dịch vụ."}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tên liên hệ</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Phương thức</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Định danh</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                  Trạng thái
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="text-slate-500 text-sm italic">Đang tải...</div>
                  </td>
                </tr>
              ) : contacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="text-slate-500 text-sm italic">Không có contact phù hợp.</div>
                  </td>
                </tr>
              ) : (
                contacts.map((c) => {
                  const MethodIcon = methodPill(c.contactMethod).icon;
                  const methodLabel = methodPill(c.contactMethod).label;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{c.name}</td>
                      <td className="px-6 py-4">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl text-[11px] font-bold border">
                          <MethodIcon className="size-4" />
                          {methodLabel}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="font-mono text-xs text-slate-600">{c.identification}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-tight inline-flex items-center justify-center ${statusPillClasses(
                            c.status,
                          )}`}
                        >
                          {c.status === "ACTIVE"
                            ? "Đang hoạt động"
                            : c.status === "PAUSED"
                              ? "Tạm dừng"
                              : "Ngưng hoạt động"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {c.facebookUrl ? (
                            <a
                              href={c.facebookUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-xl text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors"
                              title="Mở trang Facebook"
                            >
                              <ExternalLink className="size-4" />
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            className="p-2 rounded-xl text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openDelete(c)}
                            className="p-2 rounded-xl text-slate-500 hover:text-tertiary hover:bg-tertiary/5 transition-colors"
                            title="Xoá"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ContactFormModal
        open={formOpen}
        mode={formMode}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => void reloadList()}
      />

      <ContactDeleteModal
        open={deleteOpen}
        contactId={deleteTarget?.id ?? null}
        contactName={deleteTarget?.name ?? ""}
        onClose={() => {
          setDeleteOpen(false);
          setDeleteTarget(null);
        }}
        onDeleted={() => void reloadList()}
      />
    </div>
  );
}
