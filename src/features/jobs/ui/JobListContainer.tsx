"use client";

import React, { useEffect, useState } from "react";
import { Briefcase, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import type { JobDetailDTO, JobListItemDTO, JobListStatsDTO } from "@/features/jobs/model/jobTypes";
import type { PaymentStatus } from "@prisma/client";
import { JobTable } from "@/features/jobs/ui/JobTable";
import { JobFilterBar } from "@/features/jobs/ui/JobFilterBar";
import { useJobFilters } from "@/features/jobs/ui/useJobFilters";
import { deleteJobAction, getJobDetailAction, getJobsAction } from "@/features/jobs/actions/jobActions";
import { getJobFormOptionsAction } from "@/features/jobs/actions/jobPaymentActions";
import { JobFormModal } from "@/features/jobs/ui/JobFormModal";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { JobPaymentQRModal } from "@/features/jobs/ui/JobPaymentQRModal";

type Props = {
  initialItems: JobListItemDTO[];
  initialStats: JobListStatsDTO;
};

function toMoneyNumber(v: string): number {
  const digits = v.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

export function JobListContainer({ initialItems, initialStats }: Props) {
  const [items, setItems] = useState<JobListItemDTO[]>(initialItems);
  const [stats, setStats] = useState<JobListStatsDTO>(initialStats);
  const [isLoading, setIsLoading] = useState(false);
  const [nextCursorId, setNextCursorId] = useState<number | null>(null);
  const [currentCursorId, setCurrentCursorId] = useState<number | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<number[]>([]);

  const filters = useJobFilters();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [editingInitial, setEditingInitial] = useState<JobDetailDTO | null>(null);
  const [formOptions, setFormOptions] = useState<{
    clients: { id: number; name: string; phone?: string | null }[];
    subjects: { id: number; name: string }[];
    batches: { id: number; name: string }[];
  }>({ clients: [], subjects: [], batches: [] });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<number | null>(null);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrJobId, setQrJobId] = useState<number | null>(null);
  const [qrJobName, setQrJobName] = useState<string | null>(null);
  const [qrPaymentStatus, setQrPaymentStatus] = useState<PaymentStatus | null>(null);
  const [qrAmount, setQrAmount] = useState(0);
  const [qrDeposit, setQrDeposit] = useState(0);
  const [qrTotalPaid, setQrTotalPaid] = useState(0);

  useEffect(() => {
    async function loadFormOptions() {
      const res = await getJobFormOptionsAction();
      if (res.success && res.data) {
        setFormOptions(res.data);
      }
    }
    loadFormOptions();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      // Auto close QR modal if open and it's a payment notification
      if (detail && detail.success) {
        setQrOpen(false);
        // Refresh the current list to fetch updated payment statuses
        void reloadList(currentCursorId);
      }
    };
    window.addEventListener("trigger-red-dot", handler);
    return () => window.removeEventListener("trigger-red-dot", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCursorId]);

  async function reloadList(cursorId?: number) {
    setIsLoading(true);
    try {
      const res = await getJobsAction({ limit: 20, cursorId, ...filters.query });
      if (!res.success) {
        toast.error(res.error || "Không thể tải danh sách việc làm");
        return;
      }
      setItems(res.items);
      setStats(res.stats);
      setNextCursorId(res.nextCursorId);
      setCurrentCursorId(cursorId);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    setCursorStack([]);
    void reloadList(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.query]);

  const clientOptions = formOptions.clients.map((c) => ({ id: c.id, label: c.name }));
  const subjectOptions = formOptions.subjects.map((s) => ({ id: s.id, label: s.name }));
  const batchOptions = formOptions.batches.map((b) => ({ id: b.id, label: b.name }));

  function handleAdd() {
    setFormMode("create");
    setEditingJobId(null);
    setEditingInitial(null);
    setIsFormOpen(true);
  }

  async function handleEdit(id: number) {
    setFormMode("edit");
    setEditingJobId(id);
    setEditingInitial(null);
    setIsFormOpen(true);

    const res = await getJobDetailAction(id);
    if (!res.success || !res.data) {
      toast.error(res.error || "Không thể tải dữ liệu việc làm");
      return;
    }
    setEditingInitial(res.data);
  }

  function handleDeleteClick(id: number) {
    setJobToDelete(id);
    setDeleteDialogOpen(true);
  }

  async function openQrForJobId(id: number) {
    const fromList = items.find((x) => x.id === id) ?? null;
    if (fromList) {
      setQrJobId(fromList.id);
      setQrJobName(fromList.name);
      setQrPaymentStatus(fromList.paymentStatus);
      setQrAmount(toMoneyNumber(fromList.amountText));
      setQrDeposit(toMoneyNumber(fromList.depositText));
      setQrTotalPaid(toMoneyNumber(fromList.totalPaidText));
      setQrOpen(true);
      return;
    }

    const res = await getJobDetailAction(id);
    if (!res.success || !res.data) {
      toast.error(res.error || "Không thể tải chi tiết việc làm");
      return;
    }
    setQrJobId(res.data.id);
    setQrJobName(res.data.name);
    setQrPaymentStatus(res.data.paymentStatus);
    setQrAmount(toMoneyNumber(res.data.amountText));
    setQrDeposit(toMoneyNumber(res.data.depositText));
    setQrTotalPaid(toMoneyNumber(res.data.totalPaidText));
    setQrOpen(true);
  }

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-6">
      {/* Title + CTA */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shadow-glow-mint">
            <Briefcase className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-moss-900">Danh sách việc làm</h1>
            <p className="text-moss-500 text-sm">Quản lý và theo dõi tiến độ công việc hàng ngày</p>
          </div>
        </div>
        <button
          onClick={handleAdd}
          className="bg-mint-500 hover:bg-mint-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-sm shadow-mint-500/20"
        >
          <Plus className="size-5" />
          Thêm việc làm mới
        </button>
      </div>

      {/* KPI Strip (cards) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-xl border border-slate-200 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
            <span className="text-sm font-bold">#</span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Tổng việc làm</p>
            <p className="text-xl font-bold">{stats.totalJobs}</p>
          </div>
        </div>
        <div className="bg-surface p-4 rounded-xl border border-slate-200 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-coral-50 flex items-center justify-center text-coral-600">
            <span className="text-sm font-bold">!</span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Chưa thanh toán</p>
            <p className="text-xl font-bold">{stats.unpaidJobs}</p>
          </div>
        </div>
        <div className="bg-surface p-4 rounded-xl border border-slate-200 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-sand-50 flex items-center justify-center text-sand-700">
            <span className="text-sm font-bold">₫</span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đã đặt cọc</p>
            <p className="text-xl font-bold">{stats.depositPaidJobs}</p>
          </div>
        </div>
        <div className="bg-surface p-4 rounded-xl border border-slate-200 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-mint-100 flex items-center justify-center text-mint-600">
            <span className="text-sm font-bold">✓</span>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Hoàn thành</p>
            <p className="text-xl font-bold">{stats.completedJobs}</p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface p-4 rounded-xl border border-slate-200">
        <JobFilterBar
          search={filters.search}
          onSearchChange={filters.setSearch}
          clientOptions={clientOptions}
          subjectOptions={subjectOptions}
          batchOptions={batchOptions}
          clientId={filters.clientId}
          onClientChange={filters.setClientId}
          subjectId={filters.subjectId}
          onSubjectChange={filters.setSubjectId}
          batchId={filters.batchId}
          onBatchChange={filters.setBatchId}
          status={filters.status ?? "ALL"}
          onStatusChange={filters.setStatus}
          paymentStatus={filters.paymentStatus ?? "ALL"}
          onPaymentStatusChange={filters.setPaymentStatus}
        />
      </div>

      {/* Table + footer */}
      <div className="bg-surface rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <JobTable
          items={items}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
          onOpenQr={(id) => {
            void openQrForJobId(id);
          }}
        />
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <p className="text-xs text-slate-500">Hiển thị {items.length} trong tổng số {stats.totalJobs} việc làm</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (cursorStack.length === 0) return;
                const prev = cursorStack[cursorStack.length - 1];
                setCursorStack((s) => s.slice(0, -1));
                void reloadList(prev || undefined);
              }}
              disabled={cursorStack.length === 0 || isLoading}
              className="px-3 py-2 rounded bg-white border border-slate-200 text-slate-500 hover:text-primary transition-colors disabled:opacity-50"
              aria-label="Trang trước"
            >
              Prev
            </button>
            <span className="text-xs font-bold px-3">Trang {cursorStack.length + 1}</span>
            <button
              type="button"
              onClick={() => {
                if (!nextCursorId) return;
                setCursorStack((s) => [...s, currentCursorId ?? 0]);
                void reloadList(nextCursorId);
              }}
              disabled={!nextCursorId || isLoading}
              className="px-3 py-2 rounded bg-white border border-slate-200 text-slate-500 hover:text-primary transition-colors disabled:opacity-50"
              aria-label="Trang sau"
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => void reloadList(currentCursorId)}
              className="p-2 rounded bg-white border border-slate-200 text-slate-500 hover:text-primary transition-colors"
              aria-label="Làm mới"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>
        </div>
      </div>

      <JobFormModal
        open={isFormOpen}
        mode={formMode}
        initial={formMode === "edit" ? editingInitial : null}
        formOptions={formOptions}
        onClose={() => setIsFormOpen(false)}
        onCreated={(createdId) => {
          void reloadList(currentCursorId);
          void openQrForJobId(createdId);
        }}
        onUpdated={() => {
          void reloadList(currentCursorId);
        }}
        onClientCreated={(client) => {
          setFormOptions((prev) => ({
            ...prev,
            clients: [client, ...prev.clients.filter((c) => c.id !== client.id)],
          }));
        }}
        onSubjectCreated={(subject) => {
          setFormOptions((prev) => ({
            ...prev,
            subjects: [subject, ...prev.subjects.filter((s) => s.id !== subject.id)],
          }));
        }}
      />

      <JobPaymentQRModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        jobId={qrJobId}
        jobName={qrJobName}
        paymentStatus={qrPaymentStatus}
        amount={qrAmount}
        deposit={qrDeposit}
        totalPaid={qrTotalPaid}
      />

      <ConfirmationDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={async () => {
          if (!jobToDelete) return;
          setIsLoading(true);
          try {
            const res = await deleteJobAction(jobToDelete);
            if (!res.success) {
              toast.error(res.error || "Không thể xóa việc làm");
              return;
            }
            toast.success("Đã xóa việc làm");
            setDeleteDialogOpen(false);
            setJobToDelete(null);
            await reloadList(currentCursorId);
          } finally {
            setIsLoading(false);
          }
        }}
        title="Xóa việc làm?"
        description="Job sẽ được đưa vào trạng thái đã xoá mềm. Bạn không thể thao tác thanh toán trên job này nữa."
        confirmText="Đồng ý xoá"
        variant="danger"
        isLoading={isLoading}
      />
    </div>
  );
}

