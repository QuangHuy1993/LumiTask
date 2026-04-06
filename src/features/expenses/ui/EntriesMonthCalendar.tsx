"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import {
  buildMonthGrid,
  getMonthLabelVi,
  toDateLocalFromIsoDateKey,
  type MonthGridCell,
} from "@/features/expenses/utils/entryCalendarDates";

type EntriesMonthCalendarProps = {
  visibleMonth: Date; // only month/year are used
  selectedDayKey: string; // YYYY-MM-DD
  todayKey: string; // YYYY-MM-DD
  dayCounts: Record<string, number>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onPickDay: (dayKey: string) => void;
};

function weekdayLabels() {
  // weekStartsOn=1 (Monday)
  return ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
}

export function EntriesMonthCalendar({
  visibleMonth,
  selectedDayKey,
  todayKey,
  dayCounts,
  onPrevMonth,
  onNextMonth,
  onPickDay,
}: EntriesMonthCalendarProps) {
  const gridCells: MonthGridCell[] = useMemo(
    () => buildMonthGrid(visibleMonth, 1),
    [visibleMonth]
  );

  const monthLabel = useMemo(() => {
    const raw = getMonthLabelVi(visibleMonth); // "tháng 4 năm 2026"
    return raw.length > 0 ? raw[0]!.toUpperCase() + raw.slice(1) : raw; // "Tháng 4 năm 2026"
  }, [visibleMonth]);

  const selectedDateLocal = useMemo(() => toDateLocalFromIsoDateKey(selectedDayKey), [selectedDayKey]);

  return (
    <section className="bg-white rounded-2xl shadow-card border border-outline-variant/10 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between border-b border-outline-variant/10">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-black text-on-surface-variant opacity-80">
            Lịch tháng
          </div>
          <h2 className="text-xl font-black tracking-tight text-on-surface">{monthLabel}</h2>
          <div className="text-xs font-bold text-primary mt-1">
            Đang chọn: {selectedDateLocal.getDate().toString().padStart(2, "0")}/{(selectedDateLocal.getMonth() + 1).toString().padStart(2, "0")}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onPrevMonth}
            className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="size-5 text-on-surface-variant" />
          </button>
          <button
            type="button"
            onClick={() => onPickDay(todayKey)}
            className="px-3 py-2 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors text-primary text-[11px] font-black whitespace-nowrap"
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="p-2 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors"
            aria-label="Tháng sau"
          >
            <ChevronRight className="size-5 text-on-surface-variant" />
          </button>
        </div>
      </div>

      <div className="px-3 pb-3 pt-2">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {weekdayLabels().map((d) => (
            <div key={d} className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 text-center py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {gridCells.map((cell) => {
            const isSelected = cell.key === selectedDayKey;
            const isToday = cell.key === todayKey;
            const count = dayCounts[cell.key] ?? 0;

            const base =
              "relative w-full h-10 sm:h-11 rounded-xl border transition-all duration-150 flex flex-col items-center justify-center gap-0.5";

            const variant = isSelected
              ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
              : cell.inMonth
              ? "bg-surface-container-low border-outline-variant/10 hover:bg-surface-container transition-colors"
              : "bg-surface-container-lowest border-outline-variant/5 opacity-50";

            const todayAccent = isToday ? "ring-2 ring-primary/30 shadow-sm" : "";

            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => onPickDay(cell.key)}
                className={`${base} ${variant} ${todayAccent}`}
                aria-label={`Chọn ngày ${cell.key}`}
              >
                <span className={`text-xs font-black leading-none ${isSelected ? "text-primary" : "text-on-surface-variant"}`}>
                  {cell.dayNumber}
                </span>
                {count > 0 && (
                  <span
                    className="w-1 h-1 rounded-full bg-primary"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

