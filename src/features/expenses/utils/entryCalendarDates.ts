export type MonthGridCell = {
  key: string; // ISO date key: YYYY-MM-DD (local)
  dayNumber: number;
  inMonth: boolean;
  date: Date; // local date
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * occurredAt format in this UI: "DD/MM/YYYY"
 * -> ISO date key: "YYYY-MM-DD" (local, timezone-safe since it's string based)
 */
export function toIsoDateKeyFromDdMmYyyy(occurredAt: string): string {
  const [ddRaw, mmRaw, yyyyRaw] = occurredAt.split("/");
  const dd = pad2(Number(ddRaw));
  const mm = pad2(Number(mmRaw));
  const yyyy = String(Number(yyyyRaw));
  return `${yyyy}-${mm}-${dd}`;
}

export function toDdMmYyyyFromIsoDateKey(isoKey: string): string {
  const [yyyy, mm, dd] = isoKey.split("-");
  if (!yyyy || !mm || !dd) return isoKey;
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Convert ISO date key (YYYY-MM-DD) to a local Date object (no UTC off-by-one).
 */
export function toDateLocalFromIsoDateKey(isoKey: string): Date {
  const [yyyyRaw, mmRaw, ddRaw] = isoKey.split("-");
  const yyyy = Number(yyyyRaw);
  const mm = Number(mmRaw);
  const dd = Number(ddRaw);
  return new Date(yyyy, mm - 1, dd);
}

export function getTodayIsoDateKeyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function getMonthLabelVi(visibleMonth: Date): string {
  return new Intl.DateTimeFormat("vi-VN", { month: "long", year: "numeric" }).format(visibleMonth);
}

function startOfWeek(date: Date, weekStartsOn: 0 | 1): Date {
  // weekStartsOn: 0 (Sunday) | 1 (Monday)
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0..6
  const diff = weekStartsOn === 1 ? (day === 0 ? -6 : 1 - day) : -day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDaysLocal(date: Date, days: number): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + days);
  return d;
}

export function buildMonthGrid(visibleMonth: Date, weekStartsOn: 0 | 1 = 1): MonthGridCell[] {
  const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth, weekStartsOn);

  // Render 6x7 cells for consistent layout
  const cells: MonthGridCell[] = [];
  for (let i = 0; i < 42; i++) {
    const date = addDaysLocal(gridStart, i);
    const inMonth = date.getMonth() === visibleMonth.getMonth();
    const key = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    cells.push({ key, dayNumber: date.getDate(), inMonth, date });
  }
  return cells;
}

