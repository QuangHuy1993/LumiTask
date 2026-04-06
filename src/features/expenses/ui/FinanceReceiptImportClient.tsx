"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Image from "next/image";
import { Camera, CheckCircle2, Loader2, Receipt, Sparkles, UploadCloud, X, XCircle } from "lucide-react";
import { toast } from "sonner";

import { ExpensesSubNav } from "@/features/expenses/ui/ExpensesSubNav";

import { listFinanceCategoriesAction } from "../actions/financeCategoryActions";
import { listWalletsAction } from "../actions/financeWalletActions";

type WalletOpt = { id: number; name: string };
type CategoryOpt = { id: number; name: string; kind: "INCOME" | "EXPENSE" };

type DraftRow = {
  amount: string;
  occurredAt: string;
  note: string;
  currency: string;
  confidence: number;
  walletId: number | null;
  categoryId: number | null;
  mergeKey: string | null;
};

type ImportBatchDetail = {
  id: number;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  rowCount: number | null;
  errorSummary: string | null;
  metadata: {
    extracted: {
      merchantName: string;
      date: string;
      totalAmount: string;
      currency: string;
      rawTextSummary: string;
      parseQuality: "ok" | "weak" | "garbage";
    };
    rows: DraftRow[];
    mismatch: {
      extractedTotal: number;
      rowsTotal: number;
      diff: number;
      hasMismatch: boolean;
    };
  } | null;
};

function parseQualityLabel(q: "ok" | "weak" | "garbage"): string {
  if (q === "ok") return "Tốt";
  if (q === "weak") return "Cần kiểm tra";
  if (q === "garbage") return "Không đọc được";
  return q;
}

function parseQualityClass(q: string): string {
  if (q === "ok") return "bg-primary/10 text-primary";
  if (q === "weak") return "bg-amber-100 text-amber-900";
  if (q === "garbage") return "bg-error/10 text-error";
  return "bg-on-surface-variant/10 text-on-surface-variant";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function FinanceReceiptImportClient() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const analyzeAbortRef = useRef<AbortController | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [batchId, setBatchId] = useState<number | null>(null);
  const [batch, setBatch] = useState<ImportBatchDetail | null>(null);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [processing, setProcessing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [wallets, setWallets] = useState<WalletOpt[]>([]);
  const [categories, setCategories] = useState<CategoryOpt[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [wRes, cRes] = await Promise.all([
        listWalletsAction({ limit: 200 }),
        listFinanceCategoriesAction({ limit: 200, isActive: true, kind: "ALL" }),
      ]);
      if (cancelled) return;
      if (wRes.success) {
        setWallets(wRes.items.map((x) => ({ id: x.id, name: x.name })));
      }
      if (cRes.success) {
        setCategories(cRes.items.map((x) => ({ id: x.id, name: x.name, kind: x.kind })));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.kind === "EXPENSE"),
    [categories]
  );
  const hasRows = rows.length > 0;
  const hasError = Boolean(batch?.errorSummary) || batch?.status === "FAILED";
  const isAnalyzing = processing || batch?.status === "PROCESSING";
  const isSuccess = !isAnalyzing && !hasError && (batch?.status === "PENDING" || batch?.status === "COMPLETED");
  const currentStep = hasRows ? 3 : isAnalyzing || batch ? 2 : 1;

  const loadBatch = useCallback(async (id: number): Promise<ImportBatchDetail | null> => {
    try {
      const res = await fetch(`/api/import-batch/${id}`, {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await res.json()) as
        | { success: true; data: ImportBatchDetail }
        | { success: false; error: string };
      if (!res.ok || !data.success) return null;
      return data.data;
    } catch (err) {
      console.error("[receipt-import] loadBatch failed", err);
      return null;
    }
  }, []);

  useEffect(() => {
    if (!batchId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let fails = 0;

    const tick = async () => {
      const next = await loadBatch(batchId);
      if (cancelled) return;

      if (!next) {
        fails += 1;
        // keep local fail counter only; avoid hard crash when server stops
        if (fails >= 3) {
          setProcessing(false);
          setBatch((prev) =>
            prev
              ? {
                  ...prev,
                  status: "FAILED",
                  errorSummary:
                    prev.errorSummary ?? "Không tải được trạng thái xử lý. Vui lòng thử lại.",
                }
              : prev
          );
          return;
        }
        timer = setTimeout(() => void tick(), 2000);
        return;
      }

      fails = 0;
      setBatch(next);
      if (next.metadata?.rows) {
        const defaultWalletId = wallets[0]?.id ?? null;
        setRows(
          next.metadata.rows.map((row) => ({
            ...row,
            walletId: row.walletId ?? defaultWalletId,
          }))
        );
      }
      if (next.status === "PROCESSING") {
        timer = setTimeout(() => void tick(), 1500);
      } else {
        setProcessing(false);
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [batchId, loadBatch, wallets]);

  useEffect(() => {
    if (isSuccess && rows.length > 0) setIsReviewOpen(true);
  }, [isSuccess, rows.length]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const applySelectedFile = useCallback((picked: File | null) => {
    setSelectedFile(picked);
    setBatch(null);
    setBatchId(null);
    setRows([]);
    if (!picked) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(picked);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(url);
  }, [previewUrl]);

  const handleSelectFile = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    applySelectedFile(event.target.files?.[0] ?? null);
  }, [applySelectedFile]);

  const removeSelectedFile = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setBatch(null);
    setBatchId(null);
    setRows([]);
    if (inputRef.current) inputRef.current.value = "";
  }, [previewUrl]);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const dropped = event.dataTransfer.files?.[0];
      if (!dropped) return;
      applySelectedFile(dropped);
    },
    [applySelectedFile]
  );

  const startImport = useCallback(async () => {
    if (!selectedFile) {
      toast.error("Chọn ảnh hóa đơn trước khi phân tích.");
      return;
    }
    const form = new FormData();
    form.append("file", selectedFile);
    setProcessing(true);
    try {
      analyzeAbortRef.current?.abort();
      const controller = new AbortController();
      analyzeAbortRef.current = controller;
      const res = await fetch("/api/import-batch", {
        method: "POST",
        credentials: "same-origin",
        body: form,
        signal: controller.signal,
      });
      const json = (await res.json()) as
        | { success: true; data: { batchId: number } }
        | { success: false; error?: string; message?: string };
      if (!res.ok || !json.success) {
        const msg = "message" in json && json.message ? json.message : "Upload thất bại";
        toast.error(msg);
        setProcessing(false);
        return;
      }
      setBatchId(json.data.batchId);
      toast.success("Đã tải ảnh. Hệ thống đang OCR và phân tích...");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        toast.message("Đã dừng phân tích.");
      } else {
        console.error(e);
        toast.error("Lỗi mạng hoặc máy chủ.");
      }
      setProcessing(false);
    } finally {
      // polling effect controls final loading state
    }
  }, [selectedFile]);

  const stopAnalyze = useCallback(() => {
    analyzeAbortRef.current?.abort();
    analyzeAbortRef.current = null;
    setProcessing(false);
    setBatchId(null);
    setBatch(null);
  }, []);

  const closeReview = useCallback(() => setIsReviewOpen(false), []);
  const openReview = useCallback(() => {
    if (!batch) {
      toast.error("Chưa có bản nháp để xem.");
      return;
    }
    setIsReviewOpen(true);
  }, [batch]);

  const commit = useCallback(async () => {
    if (!batchId) {
      toast.error("Chưa có bản nháp để ghi.");
      return;
    }
    setCommitting(true);
    try {
      const res = await fetch(`/api/import-batch/${batchId}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          rows,
        }),
      });
      const json = (await res.json()) as
        | { success: true; data: { createdIds: number[] } }
        | { success: false; message?: string };
      if (!res.ok || !json.success) {
        const msg = "message" in json && json.message ? json.message : "Không ghi được.";
        toast.error(msg);
        return;
      }
      toast.success(`Đã tạo ${json.data.createdIds.length} giao dịch.`);
      setRows([]);
      setBatchId(null);
      setBatch(null);
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
    } catch (e) {
      console.error(e);
      toast.error("Lỗi khi ghi sổ.");
    } finally {
      setCommitting(false);
    }
  }, [batchId, previewUrl, rows]);

  const updateRow = useCallback((index: number, patch: Partial<DraftRow>) => {
    setRows((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  return (
    <main className="mx-auto max-w-[1200px] flex-1 space-y-6 bg-gradient-to-b from-slate-100 to-slate-50 p-3 sm:p-6 lg:p-8">
      <ExpensesSubNav />
      <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200/80 bg-white p-4 shadow-lg shadow-slate-900/5 sm:p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="rounded-2xl bg-green-100 p-2.5 text-green-600">
            <Receipt className="size-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Nhập hóa đơn bằng OCR</h1>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Tải ảnh hóa đơn, hệ thống tự phân tích rồi bạn rà soát và xác nhận.
            </p>
          </div>
        </div>

        <ol className="mb-5 grid grid-cols-3 gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {["Tải ảnh", "Phân tích", "Rà soát"].map((step, idx) => {
            const stepIndex = idx + 1;
            const active = currentStep >= stepIndex;
            return (
              <li
                key={step}
                className={`rounded-xl border px-2 py-2 text-center transition-colors ${
                  active ? "border-green-300 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50"
                }`}
              >
                {stepIndex}. {step}
              </li>
            );
          })}
        </ol>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-5 transition-all sm:p-6 ${
            isDragging
              ? "border-green-400 bg-green-50/70 shadow-sm"
              : "border-slate-300 bg-slate-50 hover:border-green-300 hover:bg-green-50/40"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleSelectFile}
            className="hidden"
            disabled={processing}
          />
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="rounded-full bg-white p-3 text-green-600 shadow-sm">
              {selectedFile ? <Camera className="size-5" /> : <UploadCloud className="size-5" />}
            </div>
            <p className="text-sm font-bold text-slate-800">Chạm để tải ảnh hoặc chụp hóa đơn</p>
            <p className="text-xs text-slate-500">Đảm bảo hóa đơn rõ nét và đủ ánh sáng.</p>
            {selectedFile ? (
              <div className="mt-2 rounded-lg bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
                {selectedFile.name} • {formatFileSize(selectedFile.size)}
              </div>
            ) : null}
          </div>
        </div>

        {previewUrl ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 transition-opacity duration-300">
            <Image
              src={previewUrl}
              alt="Receipt preview"
              width={1280}
              height={720}
              unoptimized
              className="max-h-80 w-full rounded-xl border border-slate-200 object-contain bg-white"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Đổi ảnh
              </button>
              <button
                type="button"
                onClick={removeSelectedFile}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100"
              >
                Xóa ảnh
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
          Ảnh hóa đơn sẽ được OCR + AI xử lý để tạo bản nháp có thể chỉnh sửa trước khi ghi sổ.
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => void startImport()}
            disabled={processing || !selectedFile}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-400 px-5 py-3 text-sm font-extrabold text-white shadow-md transition hover:brightness-105 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {processing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {processing ? "Đang phân tích hóa đơn..." : "Phân tích hóa đơn"}
          </button>
          {processing ? (
            <button
              type="button"
              onClick={stopAnalyze}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] sm:ml-2 sm:mt-0 sm:w-auto"
            >
              Dừng
            </button>
          ) : null}
          {batch && !processing ? (
            <button
              type="button"
              onClick={openReview}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-[0.99] sm:ml-2 sm:mt-0 sm:w-auto"
            >
              Xem bản nháp
            </button>
          ) : null}
        </div>

        <div className="mt-4 space-y-2">
          {isAnalyzing ? (
            <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
              <Loader2 className="size-4 animate-spin" />
              Đang phân tích hóa đơn...
            </div>
          ) : null}
          {isSuccess ? (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              <CheckCircle2 className="size-4" />
              Phân tích thành công. Vui lòng kiểm tra các dòng giao dịch bên dưới.
            </div>
          ) : null}
          {hasError ? (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <XCircle className="mt-0.5 size-4 shrink-0" />
              <span>{batch?.errorSummary ?? "Không thể phân tích hóa đơn này. Vui lòng thử ảnh khác."}</span>
            </div>
          ) : null}
        </div>
      </section>

      {isReviewOpen && batch ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-3 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeReview();
          }}
        >
          <div
            ref={modalRef}
            className="w-full max-w-5xl rounded-2xl bg-white shadow-xl sm:max-h-[85vh] sm:overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-6">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-black text-slate-900 sm:text-lg">Rà soát bản nháp</h2>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                  Batch #{batch.id} - {batch.status}
                </span>
                <span
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    parseQualityClass(batch.metadata?.extracted.parseQuality ?? "weak")
                  }`}
                >
                  {parseQualityLabel(batch.metadata?.extracted.parseQuality ?? "weak")}
                </span>
              </div>
              <button
                type="button"
                onClick={closeReview}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50"
                aria-label="Đóng"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto px-4 py-4 sm:max-h-[calc(85vh-64px)] sm:px-6">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-bold text-slate-500">Cửa hàng</dt>
                  <dd className="font-medium text-slate-900">{batch.metadata?.extracted.merchantName || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-slate-500">Ngày hóa đơn</dt>
                  <dd className="font-medium text-slate-900">{batch.metadata?.extracted.date || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-slate-500">Tổng tiền trích xuất</dt>
                  <dd className="font-medium text-slate-900">{batch.metadata?.extracted.totalAmount || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold text-slate-500">Tiền tệ</dt>
                  <dd className="font-medium text-slate-900">{batch.metadata?.extracted.currency || "VND"}</dd>
                </div>
              </dl>

              {batch.metadata?.mismatch.hasMismatch ? (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  Cảnh báo tổng tiền lệch: receipt={batch.metadata.mismatch.extractedTotal.toLocaleString("vi-VN")} / rows=
                  {batch.metadata.mismatch.rowsTotal.toLocaleString("vi-VN")} (chênh {batch.metadata.mismatch.diff.toLocaleString("vi-VN")}).
                </p>
              ) : null}

              {rows.length > 0 ? (
                <>
                  <div className="mt-4 space-y-3 md:hidden">
                    {rows.map((row, i) => (
                      <div
                        key={i}
                        className={`rounded-xl border p-3 ${
                          row.confidence < 0.6 ? "border-amber-200 bg-amber-50/60" : "border-slate-200 bg-white"
                        }`}
                      >
                        <p className="mb-2 text-xs font-bold text-slate-500">
                          Dòng {i + 1} • Độ tin cậy {row.confidence.toFixed(2)}
                        </p>
                        <div className="space-y-2">
                          <input
                            value={row.amount}
                            onChange={(e) => updateRow(i, { amount: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                            placeholder="Số tiền"
                          />
                          <input
                            value={row.occurredAt}
                            onChange={(e) => updateRow(i, { occurredAt: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                            placeholder="YYYY-MM-DD"
                          />
                          <input
                            value={row.note}
                            onChange={(e) => updateRow(i, { note: e.target.value })}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                            placeholder="Ghi chú"
                          />
                          <select
                            value={row.categoryId ?? ""}
                            onChange={(e) =>
                              updateRow(i, { categoryId: e.target.value ? Number(e.target.value) : null })
                            }
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                          >
                            <option value="">Danh mục</option>
                            {expenseCategories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={row.walletId ?? ""}
                            onChange={(e) =>
                              updateRow(i, { walletId: e.target.value ? Number(e.target.value) : null })
                            }
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                          >
                            <option value="">Ví (bắt buộc)</option>
                            {wallets.map((w) => (
                              <option key={w.id} value={w.id}>
                                {w.name}
                              </option>
                            ))}
                          </select>
                          <input
                            value={row.mergeKey ?? ""}
                            onChange={(e) => updateRow(i, { mergeKey: e.target.value.trim() || null })}
                            className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
                            placeholder="Khóa gộp dòng (tùy chọn)"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-100 md:block">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        <tr>
                          <th className="px-3 py-2">Dòng</th>
                          <th className="px-3 py-2">Số tiền</th>
                          <th className="px-3 py-2">Ngày (YYYY-MM-DD)</th>
                          <th className="px-3 py-2">Ghi chú</th>
                          <th className="px-3 py-2">Danh mục</th>
                          <th className="px-3 py-2">Ví (bắt buộc)</th>
                          <th className="px-3 py-2">Merge key</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr
                            key={i}
                            className={`border-t border-slate-100 ${row.confidence < 0.6 ? "bg-amber-50/60" : ""}`}
                          >
                            <td className="px-3 py-2 align-top text-on-surface-variant">
                              Dòng {i + 1}
                              <div className="text-[11px]">Conf: {row.confidence.toFixed(2)}</div>
                            </td>
                            <td className="px-3 py-2 align-top">
                              <input
                                value={row.amount}
                                onChange={(e) => updateRow(i, { amount: e.target.value })}
                                className="w-full min-w-[100px] rounded-lg border border-slate-200 px-2 py-1 text-sm"
                              />
                            </td>
                            <td className="px-3 py-2 align-top">
                              <input
                                value={row.occurredAt}
                                onChange={(e) => updateRow(i, { occurredAt: e.target.value })}
                                className="w-full min-w-[120px] rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                placeholder="YYYY-MM-DD"
                              />
                            </td>
                            <td className="px-3 py-2 align-top">
                              <input
                                value={row.note}
                                onChange={(e) => updateRow(i, { note: e.target.value })}
                                className="w-full min-w-[200px] rounded-lg border border-slate-200 px-2 py-1 text-sm"
                              />
                            </td>
                            <td className="px-3 py-2 align-top">
                              <select
                                value={row.categoryId ?? ""}
                                onChange={(e) =>
                                  updateRow(i, { categoryId: e.target.value ? Number(e.target.value) : null })
                                }
                                className="w-full min-w-[140px] rounded-lg border border-slate-200 px-2 py-1 text-sm"
                              >
                                <option value="">—</option>
                                {expenseCategories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2 align-top">
                              <select
                                value={row.walletId ?? ""}
                                onChange={(e) =>
                                  updateRow(i, { walletId: e.target.value ? Number(e.target.value) : null })
                                }
                                className="w-full min-w-[140px] rounded-lg border border-slate-200 px-2 py-1 text-sm"
                              >
                                <option value="">Chọn ví</option>
                                {wallets.map((w) => (
                                  <option key={w.id} value={w.id}>
                                    {w.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2 align-top">
                              <input
                                value={row.mergeKey ?? ""}
                                onChange={(e) => updateRow(i, { mergeKey: e.target.value.trim() || null })}
                                className="w-full min-w-[120px] rounded-lg border border-slate-200 px-2 py-1 text-sm"
                                placeholder="vd: coffee-1"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-600">Chưa có dòng giao dịch để rà soát.</p>
              )}
            </div>

            <div className="sticky bottom-0 border-t border-slate-100 bg-white px-4 py-3 sm:px-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeReview}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 sm:w-auto"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={() => void commit()}
                  disabled={committing || processing}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-on-surface px-6 py-2.5 text-sm font-bold text-white shadow transition hover:opacity-95 active:scale-[0.99] disabled:opacity-50 sm:w-auto"
                >
                  {committing ? <Loader2 className="size-5 animate-spin" /> : null}
                  {committing ? "Đang ghi..." : "Xác nhận và tạo giao dịch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
