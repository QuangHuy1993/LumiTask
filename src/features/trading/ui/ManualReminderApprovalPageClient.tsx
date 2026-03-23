"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Filter,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Search,
  SquareCheckBig,
  XCircle,
} from "lucide-react";

import { getCategoriesAction } from "@/features/trading/actions/serviceCategoryActions";
import type { ServiceCategoryListItemDTO } from "@/features/trading/model/categoryTypes";
import type {
  ManualReminderJobStatus,
  ManualReminderJobStatusDTO,
  ReminderPreviewItemDTO,
  ReminderPreviewSkipReason,
  ReminderRecipientAudience,
} from "@/features/trading/model/subscriptionReminderManualTypes";

type RowDisplayStatus = "CHỜ_GỬI" | "ĐÃ_GỬI" | "LỖI" | "BỎ_QUA";

type ReminderApprovalRow = {
  subscriptionId: number;
  title: string;
  categoryName: string;
  renewalOrExpiryAtISO: string;
  nextReminderAtISO: string;
  stage: "LEAD" | "AFTER";
  recipients: Array<{ email: string; audience: ReminderRecipientAudience }>;
  canSend: boolean;
  skipReason?: ReminderPreviewSkipReason;
  displayStatus: RowDisplayStatus;
};

const PAGE_SIZE = 50;

function formatYMDVi(isoYmd: string): string {
  const d = new Date(`${isoYmd}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoYmd;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function toDisplayStatus(item: ReminderPreviewItemDTO): RowDisplayStatus {
  if (item.canSend) return "CHỜ_GỬI";
  if (item.skipReason === "ALREADY_SENT") return "ĐÃ_GỬI";
  if (item.skipReason === "MISSING_RECIPIENTS") return "LỖI";
  return "BỎ_QUA";
}

function statusBadge(status: RowDisplayStatus): string {
  if (status === "ĐÃ_GỬI") return "bg-primary/10 text-primary";
  if (status === "LỖI") return "bg-tertiary/10 text-tertiary";
  if (status === "BỎ_QUA") return "bg-sand/30 text-sand-700";
  return "bg-moss-100 text-moss-600";
}

function stageBadge(stage: "LEAD" | "AFTER"): string {
  return stage === "LEAD" ? "bg-sand/50 text-sand-700 border border-sand-100" : "bg-tertiary/10 text-tertiary border border-tertiary/20";
}

export function ManualReminderApprovalPageClient() {
  const [rows, setRows] = useState<ReminderApprovalRow[]>([]);
  const [categories, setCategories] = useState<ServiceCategoryListItemDTO[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [progressStatus, setProgressStatus] = useState<ManualReminderJobStatus | "IDLE">("IDLE");
  const [progressPercent, setProgressPercent] = useState(0);
  const [processed, setProcessed] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [jobRunId, setJobRunId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [q, setQ] = useState("");
  const [stageFilter, setStageFilter] = useState<"LEAD" | "AFTER" | "ALL">("ALL");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const selectedCount = selectedIds.length;
  const allSelectableIds = rows.filter((r) => r.canSend).map((r) => r.subscriptionId);
  const isAllSelected = allSelectableIds.length > 0 && allSelectableIds.every((id) => selectedIds.includes(id));

  const toggleOne = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    setSelectedIds((prev) => (isAllSelected ? prev.filter((id) => !allSelectableIds.includes(id)) : Array.from(new Set([...prev, ...allSelectableIds]))));
  };

  const loadCategories = async () => {
    const res = await getCategoriesAction({ limit: 200, isActive: "ALL" });
    if (res.success) setCategories(res.items);
  };

  const loadPreview = async () => {
    setIsLoading(true);
    setRequestError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        stage: stageFilter,
      });
      if (q.trim()) params.set("q", q.trim());
      if (categoryId) params.set("categoryId", String(categoryId));
      const res = await fetch(`/api/trading/subscriptions/reminders/due-preview?${params.toString()}`);
      const data = (await res.json().catch(() => null)) as
        | { ok: true; items: ReminderPreviewItemDTO[]; totalCount: number }
        | { ok: false; error?: string }
        | null;
      if (!res.ok || !data || !("ok" in data) || !data.ok) {
        setRequestError("Không tải được danh sách đến hạn.");
        return;
      }
      const nextRows: ReminderApprovalRow[] = data.items.map((item) => ({
        subscriptionId: item.subscriptionId,
        title: item.title,
        categoryName: item.categoryName,
        renewalOrExpiryAtISO: item.renewalOrExpiryAtISO,
        nextReminderAtISO: item.nextReminderAtISO,
        stage: item.stage,
        recipients: item.recipients,
        canSend: item.canSend,
        skipReason: item.skipReason,
        displayStatus: toDisplayStatus(item),
      }));
      setRows(nextRows);
      setTotalCount(data.totalCount);
      setSelectedIds((prev) => prev.filter((id) => nextRows.some((r) => r.subscriptionId === id && r.canSend)));
    } catch {
      setRequestError("Không tải được danh sách đến hạn.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => void loadPreview(), 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, q, stageFilter, categoryId]);

  useEffect(() => {
    if (!jobRunId) return;
    const timer = window.setInterval(async () => {
      const res = await fetch(`/api/trading/subscriptions/reminders/manual-send/${jobRunId}`);
      const data = (await res.json().catch(() => null)) as ManualReminderJobStatusDTO | { ok: false; error?: string } | null;
      if (!res.ok || !data || !("ok" in data) || !data.ok) return;
      setProgressStatus(data.status);
      setProgressPercent(data.progressPercent);
      setProcessed(data.totals.processed);
      setSuccessCount(data.totals.succeeded);
      setFailedCount(data.totals.failed);
      setSkippedCount(data.totals.skipped);
      setLogLines(
        data.recentErrors.map(
          (err) => `#${err.subscriptionId}${err.audience ? ` (${err.audience})` : ""}: ${err.code} - ${err.message}`,
        ),
      );
      if (data.status !== "RUNNING" && data.status !== "QUEUED") {
        window.clearInterval(timer);
        setJobRunId(null);
        void loadPreview();
      }
    }, 1500);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobRunId]);

  const handleRefresh = () => {
    void loadPreview();
  };

  const handleSendSelected = () => {
    if (selectedCount === 0 || progressStatus === "RUNNING" || progressStatus === "QUEUED") return;
    setRequestError(null);
    setProgressStatus("QUEUED");
    setProgressPercent(0);
    setProcessed(0);
    setSuccessCount(0);
    setFailedCount(0);
    setSkippedCount(0);
    setLogLines([]);
    void (async () => {
      try {
        const res = await fetch("/api/trading/subscriptions/reminders/manual-send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedSubscriptionIds: selectedIds }),
        });
        const data = (await res.json().catch(() => null)) as
          | { ok: true; jobRunId: number }
          | { ok: false; error?: string }
          | null;
        if (!res.ok || !data || !("ok" in data) || !data.ok) {
          setProgressStatus("IDLE");
          setRequestError("Không thể khởi chạy tác vụ gửi email.");
          return;
        }
        setJobRunId(data.jobRunId);
      } catch {
        setProgressStatus("IDLE");
        setRequestError("Không thể khởi chạy tác vụ gửi email.");
      }
    })();
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);

  const stageLabel = (stage: "LEAD" | "AFTER") => (stage === "LEAD" ? "Trước hạn" : "Sau hạn");

  const statusLabel = (status: RowDisplayStatus) => {
    if (status === "CHỜ_GỬI") return "Chờ gửi";
    if (status === "ĐÃ_GỬI") return "Đã gửi";
    if (status === "LỖI") return "Lỗi";
    return "Bỏ qua";
  };

  const progressLabel = () => {
    if (progressStatus === "IDLE") return "Chưa chạy";
    if (progressStatus === "QUEUED") return "Đang xếp hàng";
    if (progressStatus === "RUNNING") return "Đang chạy";
    if (progressStatus === "SUCCESS") return "Hoàn tất";
    if (progressStatus === "PARTIAL_SUCCESS") return "Hoàn tất một phần";
    return "Thất bại";
  };

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-moss-400">
            <Link href="/trading/subscriptions" className="hover:text-moss-600">
              Dịch vụ & nhắc hạn
            </Link>
            <ChevronRight className="size-3" />
            <span className="text-primary">Duyệt gửi email</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-moss-900">Dịch vụ đến hạn cần duyệt gửi email</h1>
          <p className="text-moss-500 text-sm mt-1">Chỉ những dòng được chọn mới được gửi email nhắc hạn.</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/trading/subscriptions"
            className="rounded-xl border border-moss-200 px-3 py-2 text-sm font-semibold text-moss-700 transition-colors hover:bg-moss-50 inline-flex items-center gap-2"
          >
            <ArrowLeft className="size-4" />
            Quay lại quản lý dịch vụ
          </Link>
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-xl border border-moss-100 px-3 py-2 text-sm font-semibold text-moss-700 transition-colors hover:bg-moss-50 inline-flex items-center gap-2"
          >
            <RefreshCw className="size-4" />
            Làm mới danh sách
          </button>
          <button
            type="button"
            onClick={handleSendSelected}
            disabled={selectedCount === 0 || progressStatus === "RUNNING" || progressStatus === "QUEUED"}
            className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/20 hover:brightness-110 transition-all disabled:opacity-60"
          >
            {progressStatus === "RUNNING" || progressStatus === "QUEUED" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Gửi đã chọn ({selectedCount})
          </button>
        </div>
      </div>

      {requestError ? (
        <div className="rounded-xl border border-tertiary/30 bg-tertiary/10 p-3 text-sm text-tertiary font-semibold">{requestError}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
        <div className="bg-white rounded-2xl border border-moss-100 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-moss-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-moss-900">Danh sách đến hạn</h2>
            <p className="text-xs font-bold uppercase tracking-widest text-moss-400">Đã chọn {selectedCount}/{allSelectableIds.length}</p>
          </div>

          <div className="px-6 py-4 border-b border-moss-100 bg-moss-50/40">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
              <div className="lg:col-span-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-moss-400 size-4" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tìm theo tên dịch vụ..."
                  className="w-full rounded-xl border border-moss-100 bg-white py-2.5 pr-3 pl-10 text-sm text-moss-700 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
              </div>
              <div className="lg:col-span-3">
                <select
                  value={categoryId ?? "ALL"}
                  onChange={(e) => setCategoryId(e.target.value === "ALL" ? null : Number(e.target.value))}
                  className="w-full rounded-xl border border-moss-100 bg-white px-3 py-2.5 text-sm text-moss-700 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                >
                  <option value="ALL">Tất cả danh mục</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-3">
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value as "LEAD" | "AFTER" | "ALL")}
                  className="w-full rounded-xl border border-moss-100 bg-white px-3 py-2.5 text-sm text-moss-700 outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
                >
                  <option value="ALL">Tất cả giai đoạn</option>
                  <option value="LEAD">Trước hạn</option>
                  <option value="AFTER">Sau hạn</option>
                </select>
              </div>
              <div className="lg:col-span-2 flex items-center justify-end">
                <div className="inline-flex items-center gap-2 rounded-xl border border-moss-100 bg-white px-3 py-2.5 text-xs font-bold uppercase tracking-widest text-moss-500">
                  <Filter className="size-3.5" />
                  Bộ lọc
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleAll}
                      className="size-4 rounded border-moss-300 text-primary focus:ring-primary/20"
                      aria-label="Chọn tất cả"
                    />
                  </th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Dịch vụ</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Danh mục</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mốc đến hạn</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Giai đoạn</th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Người nhận</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                      <span className="inline-flex items-center gap-2 font-semibold">
                        <Loader2 className="size-4 animate-spin" /> Đang tải dữ liệu...
                      </span>
                    </td>
                  </tr>
                ) : null}
                {rows.map((row) => {
                  const isChecked = selectedIds.includes(row.subscriptionId);
                  const disabled = !row.canSend;
                  return (
                    <tr key={row.subscriptionId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={disabled}
                          onChange={() => toggleOne(row.subscriptionId)}
                          className="size-4 rounded border-moss-300 text-primary focus:ring-primary/20 disabled:opacity-50"
                          aria-label={`Chọn ${row.title}`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-moss-900">{row.title}</div>
                        <div className="text-xs text-moss-400">#{row.subscriptionId}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {row.categoryName}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-moss-900">{formatYMDVi(row.renewalOrExpiryAtISO)}</div>
                        <div className="text-xs font-bold text-moss-500">Nhắc vào: {formatYMDVi(row.nextReminderAtISO)}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${stageBadge(row.stage)}`}>
                          {stageLabel(row.stage)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {row.recipients.map((recipient) => (
                            <span
                              key={`${row.subscriptionId}-${recipient.audience}-${recipient.email}`}
                              className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                                recipient.audience === "ADMIN" ? "bg-secondary/15 text-secondary" : "bg-primary/15 text-primary"
                              }`}
                              title={recipient.email}
                            >
                              {recipient.audience === "ADMIN" ? "A" : "B"}
                            </span>
                          ))}
                          {row.recipients.length === 0 ? <span className="text-xs text-tertiary font-semibold">Thiếu người nhận</span> : null}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusBadge(row.displayStatus)}`}>
                          {row.displayStatus === "ĐÃ_GỬI" ? (
                            <CheckCircle2 className="size-3.5" />
                          ) : row.displayStatus === "LỖI" ? (
                            <XCircle className="size-3.5" />
                          ) : (
                            <Mail className="size-3.5" />
                          )}
                          {statusLabel(row.displayStatus)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                      Không có dịch vụ đến hạn phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-500">Hiển thị {rows.length}/{totalCount} dòng.</p>
            <div className="flex items-center gap-2 text-slate-400">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button type="button" className="px-3 py-2 rounded-lg border border-primary bg-primary text-white text-xs font-bold">
                {page}
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border border-slate-200 disabled:opacity-40"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-moss-100 bg-white shadow-card overflow-hidden sticky top-24 h-fit">
          <div className="px-5 py-4 bg-primary text-white">
            <p className="text-[11px] uppercase tracking-widest font-black">Tiến độ gửi email</p>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-sm font-bold">{progressLabel()}</p>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">{progressLabel()}</span>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <div className="mb-2 flex items-end justify-between">
                <span className="text-xs font-bold text-moss-500 uppercase tracking-wider">Tiến độ</span>
                <span className="text-2xl font-black text-primary">{progressPercent}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-moss-100">
                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-moss-50 p-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-moss-400">Đã chọn</p>
                <p className="mt-1 text-xl font-black text-moss-900">{selectedCount}</p>
              </div>
              <div className="rounded-xl bg-moss-50 p-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-moss-400">Đã xử lý</p>
                <p className="mt-1 text-xl font-black text-moss-900">{processed}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-primary">Thành công</p>
                <p className="mt-1 text-xl font-black text-primary">{successCount}</p>
              </div>
              <div className="rounded-xl bg-tertiary/10 p-3">
                <p className="text-[10px] uppercase font-bold tracking-wider text-tertiary">Thất bại</p>
                <p className="mt-1 text-xl font-black text-tertiary">{failedCount}</p>
              </div>
            </div>

            <div className="rounded-xl border border-moss-100 bg-moss-50/50 p-3 text-xs text-moss-600">
              <div className="flex items-center justify-between">
                <span>Bỏ qua</span>
                <span className="font-bold">{skippedCount}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-moss-100 bg-slate-50 px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-moss-400 mb-2">Nhật ký mới nhất</p>
            {logLines.length === 0 ? (
              <div className="text-xs text-moss-500 flex items-center gap-2">
                <CircleAlert className="size-4" />
                Chưa có log, bấm &quot;Gửi đã chọn&quot; để bắt đầu.
              </div>
            ) : (
              <div className="space-y-1.5">
                {logLines.map((line, index) => (
                  <div key={`${line}-${index}`} className="text-xs text-moss-600 flex items-start gap-2">
                    <SquareCheckBig className="size-3.5 mt-0.5 text-primary" />
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

