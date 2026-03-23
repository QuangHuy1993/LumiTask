"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarRange, CheckCircle2, Loader2, Plus, RefreshCw, Search, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import type { WorkBatchListItemDTO, WorkBatchListQuery, WorkBatchListSortKey, WorkBatchListStatusFilter, WorkBatchStatsDTO } from "@/features/work-batches/model/workBatchTypes";
import { WorkBatchTable } from "@/features/work-batches/ui/WorkBatchTable";
import { WorkBatchFormModal } from "@/features/work-batches/ui/WorkBatchFormModal";
import { WorkBatchCloseModal } from "@/features/work-batches/ui/WorkBatchCloseModal";
import { ConfirmationDialog } from "@/components/common/ConfirmationDialog";
import { deleteWorkBatchAction, getWorkBatchesAction, reopenWorkBatchAction } from "@/features/work-batches/actions/workBatchActions";

export function WorkBatchListContainer(props: {
  initialItems: WorkBatchListItemDTO[];
  initialStats: WorkBatchStatsDTO;
  initialNextCursorId: number | null;
  initialError?: string | null;
}) {
  const { initialItems, initialStats, initialNextCursorId, initialError } = props;

  const [items, setItems] = useState<WorkBatchListItemDTO[]>(initialItems);
  const [stats, setStats] = useState<WorkBatchStatsDTO>(initialStats);
  const [nextCursorId, setNextCursorId] = useState<number | null>(initialNextCursorId);
  const [isFetching, setIsFetching] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<WorkBatchListStatusFilter>("ALL");
  const [unpaidOnly, setUnpaidOnly] = useState(false);
  const [sort, setSort] = useState<WorkBatchListSortKey>("NEWEST");

  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const latestQueryRef = useRef<WorkBatchListQuery>({
    limit: 20,
    search: "",
    status: "ALL",
    unpaidOnly: false,
    dateFrom: "",
    dateTo: "",
    sortKey: "NEWEST",
  });

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<WorkBatchListItemDTO | null>(null);

  const [closeOpen, setCloseOpen] = useState(false);
  const [closing, setClosing] = useState<WorkBatchListItemDTO | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState<WorkBatchListItemDTO | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const queryForFetch = useMemo<WorkBatchListQuery>(() => {
    const q: WorkBatchListQuery = {
      limit: 20,
      cursorId: undefined,
      search: search.trim() || undefined,
      status,
      unpaidOnly,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortKey: sort,
    };
    latestQueryRef.current = q;
    return q;
  }, [dateFrom, dateTo, search, sort, status, unpaidOnly]);

  async function fetchFirstPage(q: WorkBatchListQuery) {
    setIsFetching(true);
    try {
      const res = await getWorkBatchesAction({ ...q, cursorId: undefined });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      const successRes = res as {
        items: WorkBatchListItemDTO[];
        stats: WorkBatchStatsDTO;
        nextCursorId: number | null;
      };
      setItems(successRes.items);
      setStats(successRes.stats);
      setNextCursorId(successRes.nextCursorId);
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsFetching(false);
    }
  }

  async function fetchMore() {
    if (!nextCursorId) return;
    const q = latestQueryRef.current;
    setIsFetchingMore(true);
    try {
      const res = await getWorkBatchesAction({ ...q, cursorId: nextCursorId });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      const successRes = res as {
        items: WorkBatchListItemDTO[];
        stats: WorkBatchStatsDTO;
        nextCursorId: number | null;
      };
      setItems((prev) => [...prev, ...successRes.items]);
      setStats(successRes.stats);
      setNextCursorId(successRes.nextCursorId);
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsFetchingMore(false);
    }
  }

  // Debounce search 300ms; other filters immediate.
  useEffect(() => {
    const t = setTimeout(() => void fetchFirstPage(queryForFetch), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryForFetch.search]);

  useEffect(() => {
    void fetchFirstPage(queryForFetch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryForFetch.status, queryForFetch.unpaidOnly, queryForFetch.dateFrom, queryForFetch.dateTo, queryForFetch.sortKey]);

  async function handleReopen(row: WorkBatchListItemDTO) {
    setIsBusy(true);
    try {
      const res = await reopenWorkBatchAction(row.id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      await fetchFirstPage(latestQueryRef.current);
      toast.success("Đã mở lại đợt");
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleting) return;
    setIsBusy(true);
    try {
      const res = await deleteWorkBatchAction(deleting.id);
      if (!res.success) {
        if (res.error === "DELETE_BLOCKED_HAS_JOBS") {
          const details = res as { jobCount?: number };
          toast.error(`Không thể xóa vì đợt đang có ${details.jobCount ?? "nhiều"} job.`);
        } else {
          toast.error(res.error);
        }
        return;
      }
      await fetchFirstPage(latestQueryRef.current);
      toast.success("Đã xóa đợt");
      setDeleteOpen(false);
      setDeleting(null);
    } catch {
      toast.error("Lỗi hệ thống");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="space-y-10">
      {initialError ? (
        <div className="rounded-3xl border border-coral-100 bg-coral-50 p-6 flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-white border border-coral-100 text-coral-600">
            <TriangleAlert className="size-5" />
          </div>
          <div className="flex-1">
            <p className="font-black text-coral-700">Không thể tải danh sách</p>
            <p className="text-sm text-coral-700/80 mt-1">{initialError}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-3 rounded-2xl bg-coral-500 text-white font-black uppercase tracking-[0.2em] text-xs hover:bg-coral-600 transition-colors"
          >
            Tải lại
          </button>
        </div>
      ) : null}

      {/* KPI strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl bg-white border border-moss-100 shadow-card p-6">
          <p className="text-[11px] font-extrabold tracking-wide text-moss-400">ĐỢT ĐANG MỞ</p>
          <p className="text-3xl font-black text-moss-900 mt-2">{stats.openCount}</p>
          <p className="text-sm text-moss-500 mt-1">Đợt đang mở</p>
        </div>
        <div className="rounded-3xl bg-white border border-moss-100 shadow-card p-6">
          <p className="text-[11px] font-extrabold tracking-wide text-moss-400">CẦN CHÚ Ý</p>
          <p className="text-3xl font-black text-sand-700 mt-2">{stats.batchesWithUnpaidCount}</p>
          <p className="text-sm text-moss-500 mt-1">Đợt có unpaid jobs</p>
        </div>
        <div className="rounded-3xl bg-white border border-moss-100 shadow-card p-6">
          <p className="text-[11px] font-extrabold tracking-wide text-moss-400">JOB CHƯA THANH TOÁN</p>
          <p className="text-3xl font-black text-sand-700 mt-2">{stats.totalUnpaidJobs}</p>
          <p className="text-sm text-moss-500 mt-1">Tổng unpaid job (OPEN)</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1 max-w-2xl group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-moss-300 group-focus-within:text-primary transition-colors" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên đợt hoặc ghi chú…"
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-moss-100 shadow-sm font-bold text-moss-900 placeholder:text-moss-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all"
              />
            </div>

            <div className="flex items-center gap-2 bg-white border border-moss-100 rounded-2xl p-2 shadow-sm">
              {(["ALL", "OPEN", "CLOSED"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setStatus(k)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all ${
                    status === k ? "bg-primary text-white shadow-lg shadow-primary/15" : "text-moss-500 hover:bg-moss-50"
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            <button
              onClick={() => {
                setFormMode("create");
                setEditing(null);
                setFormOpen(true);
              }}
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all active:scale-[0.98]"
            >
              <Plus className="size-5" />
              Tạo đợt làm
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-3 text-xs font-extrabold tracking-wide text-moss-600">
              <input
                type="checkbox"
                checked={unpaidOnly}
                onChange={(e) => setUnpaidOnly(e.target.checked)}
                className="size-4 rounded border-moss-200 text-primary focus:ring-primary/20"
              />
              Chỉ hiển thị đợt còn job chưa thanh toán
            </label>

            <div className="flex items-center gap-2">
              <CalendarRange className="size-4 text-moss-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-moss-100 text-xs font-bold text-moss-700"
              />
              <span className="text-moss-300 font-black">—</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-moss-100 text-xs font-bold text-moss-700"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold tracking-wide text-moss-600">Sắp xếp</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as WorkBatchListSortKey)}
                className="px-3 py-2 rounded-xl bg-white border border-moss-100 text-xs font-bold text-moss-700"
              >
                <option value="NEWEST">Mới nhất</option>
                <option value="OLDEST">Cũ nhất</option>
                <option value="UNPAID_DESC">Unpaid nhiều nhất</option>
                <option value="NAME_ASC">Tên A→Z</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white border border-moss-100 text-moss-600 font-black uppercase tracking-[0.2em] text-xs hover:bg-moss-50 transition-colors"
          >
            <RefreshCw className="size-4" />
            Làm mới
          </button>
        </div>
      </div>

      {/* Content */}
      {items.length === 0 ? (
        <div className="rounded-3xl bg-white border border-moss-100 shadow-card p-12 text-center">
          <div className="mx-auto size-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-glow-mint">
            <CheckCircle2 className="size-7" />
          </div>
          <h3 className="text-2xl font-black text-moss-900 mt-6">Chưa có đợt làm nào</h3>
          <p className="text-moss-500 mt-3 max-w-xl mx-auto">
            Tạo đợt để nhóm job và chốt sổ thu tiền theo giai đoạn.
          </p>
          <button
            onClick={() => {
              setFormMode("create");
              setEditing(null);
              setFormOpen(true);
            }}
            className="mt-8 inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-white font-black uppercase tracking-[0.2em] text-xs shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all"
          >
            <Plus className="size-5" />
            Tạo đợt làm đầu tiên
          </button>
        </div>
      ) : (
        <WorkBatchTable
          items={items}
          onEdit={(row) => {
            setFormMode("edit");
            setEditing(row);
            setFormOpen(true);
          }}
          onClose={(row) => {
            setClosing(row);
            setCloseOpen(true);
          }}
          onReopen={(row) => void handleReopen(row)}
          onDelete={(row) => {
            setDeleting(row);
            setDeleteOpen(true);
          }}
        />
      )}

      {isFetching ? (
        <div className="flex items-center justify-center gap-3 text-moss-500 font-bold py-6">
          <Loader2 className="size-5 animate-spin" />
          Đang tải…
        </div>
      ) : null}

      {!isFetching && items.length > 0 ? (
        <div className="flex items-center justify-center pt-2">
          <button
            disabled={!nextCursorId || isFetchingMore}
            onClick={() => void fetchMore()}
            className="px-6 py-4 rounded-2xl bg-white border border-moss-100 text-moss-700 font-black uppercase tracking-[0.2em] text-xs hover:bg-moss-50 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isFetchingMore ? <Loader2 className="size-4 animate-spin" /> : null}
            {nextCursorId ? "Tải thêm" : "Hết dữ liệu"}
          </button>
        </div>
      ) : null}

      <WorkBatchFormModal
        open={formOpen}
        mode={formMode}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onCreated={() => {
          void fetchFirstPage(latestQueryRef.current);
        }}
        onUpdated={() => {
          void fetchFirstPage(latestQueryRef.current);
        }}
      />

      <WorkBatchCloseModal
        open={closeOpen}
        batchId={closing?.id ?? null}
        batchName={closing?.name}
        status={closing?.status}
        onClose={() => {
          setCloseOpen(false);
          setClosing(null);
        }}
        onClosed={() => {
          void fetchFirstPage(latestQueryRef.current);
        }}
        onBlockedViewUnpaid={() => {
          toast.info("Hãy vào chi tiết đợt để lọc danh sách job chưa thanh toán.");
        }}
      />

      <ConfirmationDialog
        isOpen={deleteOpen}
        onClose={() => {
          if (isBusy) return;
          setDeleteOpen(false);
        }}
        onConfirm={() => void handleDeleteConfirm()}
        title="Xóa đợt làm?"
        description={
          deleting
            ? `Đây là xóa mềm (ẩn khỏi danh sách). Không thể xóa nếu đợt đang có job liên quan. Đợt: ${deleting.name}`
            : "Đây là xóa mềm (ẩn khỏi danh sách)."
        }
        confirmText="Đồng ý xóa"
        variant="danger"
        isLoading={isBusy}
      />
    </div>
  );
}

