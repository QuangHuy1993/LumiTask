"use client";

import React, { useState, useMemo } from "react";
import { Plus, Search, Filter, RefreshCw, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { SubjectDTO, SubjectInput, SUBJECT_COLORS } from "@/features/admin-subjects/model/subjectSchema";
import { SubjectTable } from "./SubjectTable";
import { SubjectForm } from "./SubjectForm";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { 
  createSubjectAction, 
  updateSubjectAction, 
  deleteSubjectAction 
} from "@/features/admin-subjects/actions/subjectActions";
import { toast } from "sonner";

interface SubjectListContainerProps {
  initialSubjects: SubjectDTO[];
}

export function SubjectListContainer({ initialSubjects }: SubjectListContainerProps) {
  const [subjects, setSubjects] = useState<SubjectDTO[]>(initialSubjects);
  const [searchTerm, setSearchTerm] = useState("");
  const [colorFilter, setColorFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectDTO | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<number | null>(null);

  // Filter & Search Logic
  const filteredSubjects = useMemo(() => {
    return subjects.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchColor = colorFilter ? s.color === colorFilter : true;
      return matchSearch && matchColor;
    });
  }, [subjects, searchTerm, colorFilter]);

  // Paginated data
  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage);
  const paginatedSubjects = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSubjects.slice(start, start + itemsPerPage);
  }, [filteredSubjects, currentPage]);

  // Reset page when filtering
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setCurrentPage(1);
  };

  const handleColorFilter = (hex: string | null) => {
    setColorFilter(prev => prev === hex ? null : hex);
    setCurrentPage(1);
  };

  // Handlers
  const handleAdd = () => {
    setEditingSubject(null);
    setIsModalOpen(true);
  };

  const handleEdit = (subject: SubjectDTO) => {
    setEditingSubject(subject);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: SubjectInput) => {
    setIsLoading(true);
    try {
      if (editingSubject) {
        const res = await updateSubjectAction(editingSubject.id, data);
        if (res.success && res.data) {
          setSubjects(prev => prev.map(s => s.id === editingSubject.id ? { ...s, ...res.data } as SubjectDTO : s));
          toast.success("Đã cập nhật môn học");
          setIsModalOpen(false);
        } else {
          toast.error(res.error || "Lỗi khi cập nhật");
        }
      } else {
        const res = await createSubjectAction(data);
        if (res.success && res.data) {
          setSubjects(prev => [res.data as SubjectDTO, ...prev]);
          toast.success("Đã thêm môn học mới");
          setIsModalOpen(false);
        } else {
          toast.error(res.error || "Lỗi khi tạo mới");
        }
      }
    } catch (error) {
      toast.error("Lỗi kết nối");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setSubjectToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!subjectToDelete) return;
    setIsLoading(true);
    const id = subjectToDelete;
    const previousSubjects = [...subjects];
    setSubjects(prev => prev.filter(s => s.id !== id));
    setDeleteDialogOpen(false);
    
    try {
      const res = await deleteSubjectAction(id);
      if (res.success) {
        toast.success("Đã xóa môn học thành công");
      } else {
        setSubjects(previousSubjects);
        toast.error(res.error || "Lỗi khi xóa");
      }
    } catch (error) {
      setSubjects(previousSubjects);
      toast.error("Lỗi máy chủ");
    } finally {
      setIsLoading(false);
      setSubjectToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 gap-3 w-full max-w-2xl">
          <div className="relative flex-1 group">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-primary transition-colors">
              <Search className="size-5" />
            </span>
            <input
              type="text"
              placeholder="Tìm tên hoặc mã môn học..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="block w-full pl-11 pr-4 py-4 bg-white border border-slate-200 rounded-xl text-slate-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-medium"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-6 py-4 border rounded-xl font-bold transition-all shadow-sm ${
              showFilters || colorFilter 
                ? "bg-primary/5 border-primary text-primary" 
                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Filter className="size-4" />
            Bộ lọc
          </button>
        </div>
        
        <button 
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 py-4 px-8 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-all shadow-lg shadow-primary/20 w-full md:w-auto transform active:scale-[0.98]"
        >
          <Plus className="size-5" />
          Thêm môn học
        </button>
      </div>

      {/* Advanced Filters Overlay */}
      {showFilters && (
        <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Lọc theo màu sắc</p>
          <div className="flex flex-wrap gap-3">
            <button
               onClick={() => handleColorFilter(null)}
               className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                 !colorFilter ? "bg-primary text-white border-primary shadow-glow-mint" : "bg-white border-slate-200 text-slate-600 hover:border-primary"
               }`}
            >
              Tất cả
            </button>
            {SUBJECT_COLORS.map(color => (
              <button
                key={color.hex}
                onClick={() => handleColorFilter(color.hex)}
                className={`size-8 rounded-full border-2 transition-all hover:scale-110 flex items-center justify-center ${
                  colorFilter === color.hex ? "border-primary scale-110 shadow-md" : "border-white"
                }`}
                style={{ backgroundColor: color.hex }}
              >
                {colorFilter === color.hex && <div className="size-1.5 bg-white rounded-full" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="flex items-center justify-between px-2 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
        <span>Hiển thị {paginatedSubjects.length} / {filteredSubjects.length} kết quả</span>
        <button 
          onClick={() => window.location.reload()}
          className="flex items-center gap-1 hover:text-primary transition-all"
        >
          <RefreshCw className="size-3" /> Làm mới dữ liệu
        </button>
      </div>

      {/* Table Content */}
      <SubjectTable 
        subjects={paginatedSubjects} 
        onEdit={handleEdit} 
        onDelete={handleDeleteClick} 
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 transition-all text-slate-600"
          >
            <ChevronLeft className="size-5" />
          </button>
          
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`size-11 rounded-xl text-sm font-bold transition-all ${
                  currentPage === page 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "bg-white border border-slate-100 text-slate-500 hover:bg-slate-50"
                }`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-30 transition-all text-slate-600"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      )}

      {/* Form Modal */}
      <SubjectForm
        show={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingSubject ? {
          name: editingSubject.name,
          code: editingSubject.code || "",
          color: editingSubject.color || "#3B82F6"
        } : null}
        isLoading={isLoading}
      />

      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Xác nhận xóa môn học"
        description="Dữ liệu sẽ được chuyển vào mục lưu trữ. Các công việc đang dùng môn học này vẫn sẽ giữ nguyên giá trị."
        confirmText="Đồng ý xóa"
        variant="danger"
        isLoading={isLoading}
      />
    </div>
  );
}
