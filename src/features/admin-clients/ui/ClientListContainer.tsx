"use client";

import React, { useState, useMemo } from "react";
import { Plus, Search, RefreshCw, ChevronLeft, ChevronRight, UserCircle } from "lucide-react";
import { ClientDTO, ClientInput, ClientStats as ClientStatsType } from "../model/clientSchema";
import { ClientTable } from "./ClientTable";
import { ClientForm } from "./ClientForm";
import { ClientStats } from "./ClientStats";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { 
  createClientAction, 
  updateClientAction, 
  deleteClientAction 
} from "../actions/clientActions";
import { toast } from "sonner";

interface ClientListContainerProps {
  initialClients: ClientDTO[];
  initialStats: ClientStatsType;
}

export function ClientListContainer({ initialClients, initialStats }: ClientListContainerProps) {
  const [clients, setClients] = useState<ClientDTO[]>(initialClients);
  const [stats, setStats] = useState<ClientStatsType>(initialStats);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientDTO | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<number | null>(null);

  // Filter & Search Logic
  const filteredClients = useMemo(() => {
    return clients.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(searchTerm)) ||
      (c.zalo && c.zalo.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [clients, searchTerm]);

  // Paginated data
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(start, start + itemsPerPage);
  }, [filteredClients, currentPage]);

  // Handlers
  const handleAdd = () => {
    setEditingClient(null);
    setIsModalOpen(true);
  };

  const handleEdit = (client: ClientDTO) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: ClientInput) => {
    setIsLoading(true);
    try {
      if (editingClient) {
        const res = await updateClientAction(editingClient.id, data);
        if (res.success && res.data) {
          setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...res.data } as ClientDTO : c));
          toast.success("Đã cập nhật thông tin khách hàng");
          setIsModalOpen(false);
        } else {
          toast.error(res.error || "Lỗi khi cập nhật");
        }
      } else {
        const res = await createClientAction(data);
        if (res.success && res.data) {
          setClients(prev => [res.data as ClientDTO, ...prev]);
          setStats(prev => ({ ...prev, total: prev.total + 1, monthNew: prev.monthNew + 1 }));
          toast.success("Đã thêm khách hàng mới");
          setIsModalOpen(false);
        } else {
          toast.error(res.error || "Lỗi khi tạo mới");
        }
      }
    } catch (error) {
      toast.error("Lỗi kết nối máy chủ");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setClientToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    setIsLoading(true);
    const id = clientToDelete;
    const previousClients = [...clients];
    setClients(prev => prev.filter(c => c.id !== id));
    setDeleteDialogOpen(false);
    
    try {
      const res = await deleteClientAction(id);
      if (res.success) {
        setStats(prev => ({ ...prev, total: prev.total - 1 }));
        toast.success("Đã xóa khách hàng thành công");
      } else {
        setClients(previousClients);
        toast.error(res.error || "Lỗi khi xóa");
      }
    } catch (error) {
      setClients(previousClients);
      toast.error("Lỗi hệ thống");
    } finally {
      setIsLoading(false);
      setClientToDelete(null);
    }
  };

  return (
    <div className="space-y-10">
      {/* Stats Section */}
      <ClientStats stats={stats} />

      {/* Main List Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-1 gap-3 w-full max-w-2xl">
            <div className="relative flex-1 group">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-300 group-focus-within:text-primary transition-colors">
                <Search className="size-5" />
              </span>
              <input
                type="text"
                placeholder="Tìm khách hàng theo tên, email hoặc số điện thoại..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="block w-full pl-11 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-slate-800 shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold placeholder:text-slate-300"
              />
            </div>
          </div>
          
          <button 
            onClick={handleAdd}
            className="flex items-center justify-center gap-2 py-4 px-10 rounded-2xl bg-primary hover:bg-primary-hover text-white font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-primary/20 w-full md:w-auto transform active:scale-[0.98]"
          >
            <Plus className="size-5" />
            Thêm đối tác
          </button>
        </div>

        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
            <UserCircle className="size-3" />
            <span>Hiển thị {paginatedClients.length} / {filteredClients.length} khách hàng</span>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-1 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] hover:text-primary transition-colors"
          >
            <RefreshCw className="size-3" /> Làm mới
          </button>
        </div>

        <ClientTable 
          clients={paginatedClients} 
          onEdit={handleEdit} 
          onDelete={handleDeleteClick} 
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-3 border border-slate-100 rounded-2xl hover:bg-slate-50 disabled:opacity-30 transition-all text-slate-400"
            >
              <ChevronLeft className="size-6" />
            </button>
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
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
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-3 border border-slate-100 rounded-2xl hover:bg-slate-50 disabled:opacity-30 transition-all text-slate-400"
            >
              <ChevronRight className="size-6" />
            </button>
          </div>
        )}
      </div>

      <ClientForm
        show={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingClient ? {
          name: editingClient.name,
          email: editingClient.email || "",
          phone: editingClient.phone || "",
          zalo: editingClient.zalo || "",
          note: editingClient.note || ""
        } : null}
        isLoading={isLoading}
      />

      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Xóa vĩnh viễn khách hàng?"
        description="Thông tin sẽ được đưa vào thùng rác. Mọi công việc (Job) liên quan sẽ bị treo nếu không có khách hàng đại diện."
        confirmText="Đồng ý xóa"
        variant="danger"
        isLoading={isLoading}
      />
    </div>
  );
}
