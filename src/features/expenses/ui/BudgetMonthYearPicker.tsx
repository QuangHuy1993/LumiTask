"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";

const YEAR_MIN = 2000;
const YEAR_MAX = 2100;

function parsePeriodKey(key: string): { y: number; m: number } | null {
  const [ys, ms] = key.split("-");
  const y = Number(ys);
  const m = Number(ms);
  if (!y || !m || m < 1 || m > 12) return null;
  return { y, m };
}

function currentPeriodKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function BudgetMonthYearPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (periodKey: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const parsed = parsePeriodKey(value);
  const [draftYear, setDraftYear] = useState(parsed?.y ?? new Date().getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    const p = parsePeriodKey(value);
    if (p) setDraftYear(p.y);
  }, [value]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (containerRef.current?.contains(t)) return;
      close();
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("button[data-month]")?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  const setMonth = (month: number) => {
    const y = Math.min(YEAR_MAX, Math.max(YEAR_MIN, draftYear));
    const m = String(month).padStart(2, "0");
    onChange(`${y}-${m}`);
    close();
  };

  const goThisMonth = () => {
    const key = currentPeriodKey();
    onChange(key);
    const p = parsePeriodKey(key);
    if (p) setDraftYear(p.y);
    close();
  };

  const bumpYear = (delta: number) => {
    setDraftYear((y) => Math.min(YEAR_MAX, Math.max(YEAR_MIN, y + delta)));
  };

  const selectedMonth = parsed?.m ?? null;
  const selectedYear = parsed?.y ?? null;

  return (
    <div className="relative z-10 w-full min-w-0 max-w-[min(100%,20rem)]" ref={containerRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        id="budget-period-trigger"
        onClick={() => setOpen((o) => !o)}
        className="relative w-full inline-flex items-center justify-center gap-2 bg-surface-container-low px-4 py-2.5 rounded-full cursor-pointer hover:bg-surface-container-high transition-colors min-w-0 min-h-[2.75rem] select-none shadow-sm"
      >
        <CalendarDays className="size-4 text-primary shrink-0 pointer-events-none" />
        <span
          id="budget-period-label"
          className="font-bold text-xs sm:text-sm text-on-surface tabular-nums pointer-events-none flex-1 text-center min-w-0"
        >
          {label}
        </span>
        <ChevronDown
          className={`size-4 text-on-surface-variant shrink-0 pointer-events-none transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40 sm:hidden" aria-hidden onClick={close} />
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby="budget-month-year-title"
            className="fixed left-1/2 top-[max(1rem,env(safe-area-inset-top))] z-50 w-[min(calc(100vw-2rem),20rem)] -translate-x-1/2 rounded-2xl border border-outline-variant/20 bg-white p-3 shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:translate-x-0 sm:p-4"
          >
            <p id="budget-month-year-title" className="sr-only">
              Chọn tháng và năm ngân sách
            </p>
            <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
              <button
                type="button"
                className="min-h-11 min-w-11 rounded-xl border border-outline-variant/30 text-lg font-bold text-on-surface hover:bg-surface-container-low touch-manipulation"
                onClick={() => bumpYear(-1)}
                aria-label="Năm trước"
              >
                −
              </button>
              <select
                value={draftYear}
                onChange={(e) => setDraftYear(Number(e.target.value))}
                className="flex-1 min-h-11 rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-center text-sm font-bold text-on-surface outline-none focus:ring-2 focus:ring-primary/30"
                aria-label="Chọn năm"
              >
                {Array.from({ length: YEAR_MAX - YEAR_MIN + 1 }, (_, i) => YEAR_MIN + i).map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="min-h-11 min-w-11 rounded-xl border border-outline-variant/30 text-lg font-bold text-on-surface hover:bg-surface-container-low touch-manipulation"
                onClick={() => bumpYear(1)}
                aria-label="Năm sau"
              >
                +
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const isActive =
                  selectedMonth === m && selectedYear === draftYear;
                return (
                  <button
                    key={m}
                    type="button"
                    data-month={m}
                    aria-label={`Tháng ${m}`}
                    onClick={() => setMonth(m)}
                    className={`min-h-10 sm:min-h-11 rounded-xl text-xs font-bold transition-colors touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                      isActive
                        ? "bg-primary text-white shadow-md shadow-primary/25"
                        : "bg-surface-container-low text-on-surface hover:bg-surface-container-high"
                    }`}
                  >
                    T{m}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex flex-col gap-1.5 border-t border-outline-variant/15 pt-3 sm:mt-4 sm:gap-2 sm:pt-4">
              <button
                type="button"
                onClick={goThisMonth}
                className="w-full min-h-11 rounded-xl bg-surface-container-high py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container touch-manipulation"
              >
                Tháng này
              </button>
              <button
                type="button"
                onClick={close}
                className="w-full min-h-11 rounded-xl border border-outline-variant/30 py-2.5 text-sm font-bold text-on-surface hover:bg-surface-container-low touch-manipulation"
              >
                Xong
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
