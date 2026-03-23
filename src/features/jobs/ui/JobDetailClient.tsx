"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { JobDetailDTO } from "@/features/jobs/model/jobTypes";
import { JobPaymentQRModal } from "@/features/jobs/ui/JobPaymentQRModal";
import { JobManualPaymentModal } from "@/features/jobs/ui/JobManualPaymentModal";
import { JobFormModal } from "@/features/jobs/ui/JobFormModal";
import { getJobFormOptionsAction } from "@/features/jobs/actions/jobPaymentActions";
import { getJobDetailAction } from "@/features/jobs/actions/jobActions";
import { toast } from "sonner";

type Props = {
  jobId: number;
  job: JobDetailDTO;
  headerIcon: React.ReactNode;
  paymentIcon: React.ReactNode;
  infoIcon: React.ReactNode;
  qrIcon: React.ReactNode;
  editIcon: React.ReactNode;
  paymentHistory: React.ReactNode;
};

function toMoneyNumber(v: string): number {
  const digits = v.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const n = Number.parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

type TabId = "PAYMENTS" | "INFO" | "FILES";

export function JobDetailClient({ jobId, job, headerIcon, paymentIcon, infoIcon, qrIcon, editIcon, paymentHistory }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("PAYMENTS");
  const [qrOpen, setQrOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [formOptions, setFormOptions] = useState<{
    clients: { id: number; name: string; phone?: string | null }[];
    subjects: { id: number; name: string }[];
    batches: { id: number; name: string }[];
  }>({ clients: [], subjects: [], batches: [] });
  const [editInitial, setEditInitial] = useState<JobDetailDTO | null>(job);
  const [paymentReloadKey, setPaymentReloadKey] = useState(0);

  const money = useMemo(
    () => ({
      amount: toMoneyNumber(job.amountText),
      deposit: toMoneyNumber(job.depositText),
      totalPaid: toMoneyNumber(job.totalPaidText),
    }),
    [job.amountText, job.depositText, job.totalPaidText],
  );

  function jobStatusLabel(status: JobDetailDTO["status"]): string {
    switch (status) {
      case "NOT_STARTED":
        return "Chưa bắt đầu";
      case "IN_PROGRESS":
        return "Đang thực hiện";
      case "COMPLETED":
        return "Hoàn thành";
      case "CANCELLED":
        return "Đã hủy";
      default:
        return status;
    }
  }

  function paymentStatusLabel(status: JobDetailDTO["paymentStatus"]): string {
    switch (status) {
      case "UNPAID":
        return "Chưa thanh toán";
      case "DEPOSIT_PAID":
        return "Đã thanh toán tiền cọc";
      case "COMPLETED":
        return "Đã thanh toán đủ";
      default:
        return status;
    }
  }

  useEffect(() => {
    setEditInitial(job);
  }, [job]);

  useEffect(() => {
    if (tab !== "PAYMENTS") return;
    const handleRecorded = (event: Event) => {
      const detail = (event as CustomEvent<{ jobId: number | null }>).detail;
      if (!detail || !detail.jobId || detail.jobId !== jobId) return;
      setPaymentReloadKey((prev) => prev + 1);
    };
    window.addEventListener("job:payment-recorded", handleRecorded as EventListener);
    return () => {
      window.removeEventListener("job:payment-recorded", handleRecorded as EventListener);
    };
  }, [jobId, tab]);

  useEffect(() => {
    if (tab !== "PAYMENTS") return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      setPaymentReloadKey((prev) => prev + 1);
    }, 8000);
    return () => {
      window.clearInterval(interval);
    };
  }, [tab]);

  async function ensureFormOptionsLoaded() {
    if (formOptions.clients.length || formOptions.subjects.length || formOptions.batches.length) return;
    const res = await getJobFormOptionsAction();
    if (!res.success || !res.data) {
      toast.error(res.error || "Không thể tải dữ liệu form");
      return;
    }
    setFormOptions(res.data);
  }

  async function openEdit() {
    await ensureFormOptionsLoaded();
    const res = await getJobDetailAction(jobId);
    if (!res.success || !res.data) {
      toast.error(res.error || "Không thể tải dữ liệu việc làm");
      return;
    }
    setEditInitial(res.data);
    setEditOpen(true);
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">Jobs</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-500">List</span>
        <span className="text-slate-300">/</span>
        <span className="text-slate-900 font-medium truncate">{job.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
            onClick={() => router.push("/jobs/list")}
          >
            ← Quay lại danh sách
          </button>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            {headerIcon}
            <span>Chi tiết việc làm</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{job.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
            <p>
              <span className="font-semibold text-slate-700">Khách hàng:</span> {job.clientName ?? "—"}
            </p>
            <span className="text-slate-300">|</span>
            <p>
              <span className="font-semibold text-slate-700">Môn học:</span> {job.subjectName ?? "—"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
            onClick={() => void openEdit()}
          >
            {editIcon}
            Chỉnh sửa
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all inline-flex items-center gap-2"
            onClick={() => setQrOpen(true)}
          >
            {qrIcon}
            Tạo mã QR
          </button>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium mb-2 uppercase tracking-wider">Tổng tiền</p>
          <h3 className="text-3xl font-black text-slate-900">{job.amountText}</h3>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium mb-2 uppercase tracking-wider">Đã thanh toán</p>
          <h3 className="text-3xl font-black text-slate-900">{job.totalPaidText}</h3>
        </div>
        <div className="bg-surface p-6 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-slate-500 text-sm font-medium mb-2 uppercase tracking-wider">Còn lại</p>
          <h3 className="text-3xl font-black text-slate-900">{job.remainingText}</h3>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 px-6">
          <button
            type="button"
            className={`px-6 py-4 border-b-2 text-sm font-bold ${
              tab === "PAYMENTS" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setTab("PAYMENTS")}
          >
            Thanh toán
          </button>
          <button
            type="button"
            className={`px-6 py-4 border-b-2 text-sm font-bold ${
              tab === "INFO" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setTab("INFO")}
          >
            Thông tin
          </button>
          <button
            type="button"
            className={`px-6 py-4 border-b-2 text-sm font-bold ${
              tab === "FILES" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setTab("FILES")}
          >
            Files
          </button>
        </div>

        <div className="p-6">
          {tab === "PAYMENTS" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h4 className="text-lg font-bold text-slate-900 inline-flex items-center gap-2">
                  {paymentIcon}
                  Lịch sử thanh toán
                </h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 border-2 border-primary text-primary rounded-xl text-sm font-bold hover:bg-primary/5 transition-colors"
                    onClick={() => setManualOpen(true)}
                  >
                    {infoIcon}
                    Ghi nhận thủ công
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
                    onClick={() => setQrOpen(true)}
                  >
                    {qrIcon}
                    Tạo mã QR
                  </button>
                </div>
              </div>

              {React.cloneElement(paymentHistory as React.ReactElement<{ reloadKey?: number; onNewTransaction?: () => void }>, {
                reloadKey: paymentReloadKey,
                onNewTransaction: () => {
                  router.refresh();
                },
              })}
            </div>
          )}

          {tab === "INFO" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Trạng thái</p>
                <div className="space-y-2 text-slate-700">
                  <p>
                    Trạng thái job: <span className="font-semibold">{jobStatusLabel(job.status)}</span>
                  </p>
                  <p>
                    Thanh toán: <span className="font-semibold">{paymentStatusLabel(job.paymentStatus)}</span>
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Ghi chú</p>
                <div className="space-y-2 text-slate-700">
                  <p>
                    Người giới thiệu: <span className="font-semibold">{job.referrer ?? "—"}</span>
                  </p>
                  <p>
                    Hoa hồng: <span className="font-semibold">{job.referralFeeText}</span>
                  </p>
                  <p className="text-slate-600">{job.note ?? "—"}</p>
                </div>
              </div>
            </div>
          )}

          {tab === "FILES" && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
              Chưa hỗ trợ đính kèm file, sẽ bổ sung sau.
            </div>
          )}
        </div>
      </div>

      <JobPaymentQRModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        jobId={jobId}
        jobName={job.name}
        paymentStatus={job.paymentStatus}
        amount={money.amount}
        deposit={money.deposit}
        totalPaid={money.totalPaid}
      />

      <JobManualPaymentModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        jobId={jobId}
        paymentStatus={job.paymentStatus}
        amount={money.amount}
        deposit={money.deposit}
        totalPaid={money.totalPaid}
        onPaymentRecorded={() => {
          setPaymentReloadKey((prev) => prev + 1);
        }}
      />

      <JobFormModal
        open={editOpen}
        mode="edit"
        initial={editInitial}
        formOptions={formOptions}
        onClose={() => setEditOpen(false)}
        onUpdated={() => {
          toast.success("Đã lưu thay đổi");
          setEditOpen(false);
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
    </div>
  );
}

