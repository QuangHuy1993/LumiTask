/**
 * LLMs sometimes wrap JSON in markdown fences or emit null for string fields.
 */

export function stripLlmJsonFences(text: string): string {
  const t = text.trim();
  const m = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
  if (m) return m[1].trim();
  return t;
}

export function parseJsonFromLlmText(text: string): unknown {
  const raw = stripLlmJsonFences(text);
  return JSON.parse(raw) as unknown;
}

const EXTRACTED_STRING_KEYS = [
  "merchantName",
  "date",
  "time",
  "totalAmount",
  "currency",
  "rawTextSummary",
  "parseQuality",
] as const;

const ROW_STRING_KEYS = [
  "amount",
  "currency",
  "occurredAt",
  "note",
  "entryKind",
  "suggestedCategoryName",
  "lineItemName",
] as const;

/**
 * Mutates `value` in place: replaces null with "" for known string keys; null dateInferred → false.
 */
export function coerceReceiptDraftNulls(value: Record<string, unknown>): void {
  const extracted = value.extracted;
  if (extracted && typeof extracted === "object" && !Array.isArray(extracted)) {
    const e = extracted as Record<string, unknown>;
    for (const k of EXTRACTED_STRING_KEYS) {
      if (e[k] === null) e[k] = "";
    }
    if (e.dateInferred === null) e.dateInferred = false;
  }

  const rows = value.rows;
  if (Array.isArray(rows)) {
    for (const row of rows) {
      if (row && typeof row === "object" && !Array.isArray(row)) {
        const r = row as Record<string, unknown>;
        for (const k of ROW_STRING_KEYS) {
          if (r[k] === null) r[k] = "";
        }
      }
    }
  }
}
