/**
 * Prompt templates for receipt OCR → import draft JSON.
 * Keep in sync with docs/prompts/receipt-import.md (Prompt 1 and Prompt 2).
 */

const RECEIPT_EXTRACT_PROMPT_TEMPLATE = `You are a senior backend engineer. Extract structured financial data from receipt OCR text and output a DRAFT compatible with a FinanceEntry import flow.

STRICT OUTPUT RULES:
- Output ONE JSON object only. No markdown fences. No commentary before or after.
- All string fields use "" when unknown (never null).
- Types must match the schema exactly.

TARGET SYSTEM CONSTRAINTS (must respect):
- amount: string matching /^[0-9]+(\\.[0-9]+)?$/ only — positive, NO thousand separators, NO spaces, NO currency symbols (e.g. "150000" or "150000.5", NOT "1.500.000" or "150,000").
- occurredAt: YYYY-MM-DD only (calendar date for the expense).
- note: max 2000 characters; truncate with "…" if needed.
- entryKind: exactly "EXPENSE" for every row (receipts are expenses).
- currency: exactly "VND" unless OCR clearly shows another ISO 4217 code (3 letters); default "VND".
- suggestedCategoryName: best-effort Vietnamese or English label; "" if unsure. This is a HINT for UI mapping only.
- walletId is NOT in this JSON; the user will choose wallet when confirming import.

INPUT:
OCR_TEXT:
{{raw_text}}

OPTIONAL HINTS (best-effort, may be incomplete; use only if consistent with OCR_TEXT):
CANDIDATE_LINE_ITEMS:
{{candidate_items}}

OUTPUT JSON SCHEMA (EXACT KEYS):
{
  "extracted": {
    "merchantName": "",
    "date": "",
    "dateInferred": false,
    "time": "",
    "totalAmount": "",
    "currency": "VND",
    "rawTextSummary": "",
    "parseQuality": "ok"
  },
  "rows": [
    {
      "amount": "",
      "currency": "VND",
      "occurredAt": "",
      "note": "",
      "entryKind": "EXPENSE",
      "suggestedCategoryName": "",
      "confidence": 0.0,
      "lineItemName": ""
    }
  ]
}

FIELD NOTES:
- extracted.parseQuality: one of "ok" | "weak" | "garbage" (garbage → rows must be []).
- extracted.dateInferred: true only if you filled extracted.date without clear evidence in OCR_TEXT; false if date read from receipt.
- extracted.totalAmount: same normalization rules as row.amount; "" if not found.
- row.lineItemName: for multi-item rows, short product line name; "" for single total row.
- row.note:
  - Single-row MVP: include merchantName; optionally append short context from receipt (keep under 2000 chars).
  - Multi-item: "merchantName — lineItemName" (truncate if needed).

PROCESSING RULES:

1) Normalize Vietnamese money from OCR:
- Remove "đ", "VND", "vnđ", spaces.
- If OCR uses "." as thousands separator (e.g. 1.234.567), convert to "1234567".
- If OCR uses "," as thousands separator, remove commas.
- Prefer the FINAL payable total, not subtotals, unless clearly labeled otherwise.

2) totalAmount detection priority (case-insensitive, Vietnamese + English):
- Lines containing: "TOTAL", "TỔNG CỘNG", "TỔNG TIỀN", "THANH TOÁN", "THÀNH TIỀN", "TO PAY", "AMOUNT DUE".
- Avoid line items labeled "Tạm tính" / "Subtotal" if a clearer final total exists.

3) Date:
- If a clear receipt date exists, output YYYY-MM-DD in extracted.date and set dateInferred=false.
- If NO usable date in OCR_TEXT: set extracted.date="" AND dateInferred=false AND parseQuality at most "weak". Do NOT invent today's date in extracted.date (the app will ask the user). For rows, set occurredAt="" when date unknown.

4) Row generation:
- If parseQuality is "garbage" OR OCR_TEXT is empty / nonsensical: return rows=[] and fill extracted fields with "" / defaults as per schema, parseQuality="garbage".

- If CANDIDATE_LINE_ITEMS contains 2+ plausible items:
  - Prefer Multi-item mode using CANDIDATE_LINE_ITEMS as the primary source for rows.amount and row.lineItemName,
    but only keep an item if you can also find supporting evidence in OCR_TEXT (same or very similar name and a matching amount).
  - If you cannot verify an item against OCR_TEXT, skip it.

- MVP (default) — use when parseQuality is "ok" or "weak" AND line items are NOT clearly separable:
  - Exactly ONE row.
  - amount = extracted.totalAmount if present; else "".
  - occurredAt = extracted.date (may be "").
  - lineItemName = "".
  - confidence: 0.75–0.9 if totalAmount and date are both confident; 0.5–0.7 if one is weak; ≤0.45 if both weak or amount missing.

- Multi-item mode — use when OCR shows repeated clear patterns of "name + price" (or name + qty + line total) AND you can assign a distinct positive amount per line without guessing:
  - One row per item.
  - Each row.amount normalized; occurredAt = extracted.date (or "").
  - lineItemName = item name; note = merchantName + " — " + lineItemName (truncate).
  - Per-row confidence 0.55–0.85 depending on clarity.
  - If sum of row amounts differs materially from extracted.totalAmount (>2% or >2000 VND), lower confidence on all rows by 0.1 and set parseQuality="weak" unless you can reconcile totals.
  - Ignore discount/negative lines by default unless clearly part of payable total.

5) Consistency:
- Every row must have entryKind "EXPENSE" and currency matching extracted.currency unless a row explicitly shows foreign currency (rare); if so, still use ISO 3-letter currency for that row only.

Return ONLY the JSON object.`;

const RECEIPT_REPAIR_PROMPT_TEMPLATE = `You fix malformed LLM output into valid JSON. Preserve meaning; do not invent merchant, amounts, or dates.

STRICT RULES:
- Return ONE JSON object only. No markdown. No extra text.
- Same schema and constraints as the import draft:
  - amounts: /^[0-9]+(\\.[0-9]+)?$/ or "" if missing
  - occurredAt / extracted.date: "" or YYYY-MM-DD
  - note length ≤ 2000 (truncate with "…")
  - entryKind always "EXPENSE" for every row
  - parseQuality ∈ "ok"|"weak"|"garbage"
  - If you cannot recover rows safely, set rows=[] and parseQuality="garbage"

INPUT (possibly invalid JSON or with extra text):
{{previous_output}}

Output the corrected JSON with keys:
extracted (merchantName, date, dateInferred, time, totalAmount, currency, rawTextSummary, parseQuality)
rows (array of objects with amount, currency, occurredAt, note, entryKind, suggestedCategoryName, confidence, lineItemName)`;

/** Max length of model output embedded in Prompt 2 (tokens / abuse guard). */
export const MAX_REPAIR_PREVIOUS_OUTPUT_LEN = 40_000;

export function truncateRepairPreviousOutput(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_REPAIR_PREVIOUS_OUTPUT_LEN) {
    return { text, truncated: false };
  }
  return { text: text.slice(0, MAX_REPAIR_PREVIOUS_OUTPUT_LEN), truncated: true };
}

export function buildReceiptExtractPrompt(params: { rawText: string; candidateItems?: string }): string {
  return RECEIPT_EXTRACT_PROMPT_TEMPLATE.replace("{{raw_text}}", params.rawText).replace(
    "{{candidate_items}}",
    params.candidateItems?.trim() ? params.candidateItems : ""
  );
}

export function buildReceiptRepairPrompt(
  previousOutput: string,
  options?: { serverTruncated?: boolean }
): string {
  let body = RECEIPT_REPAIR_PROMPT_TEMPLATE.replace("{{previous_output}}", previousOutput);
  if (options?.serverTruncated) {
    body +=
      "\n\n[Server: INPUT above was truncated for max length; output valid JSON using only the visible fragment.]";
  }
  return body;
}

/** Prompt 1 (extract): follow user instructions for structured receipt JSON. */
export const receiptImportSystemMessage =
  "You output only valid JSON as specified by the user. No markdown code fences, no explanation.";

/**
 * Prompt 2 (repair): separate from extract — only fix/format JSON; do not reinterpret OCR or invent fields.
 */
export const receiptRepairSystemMessage =
  "You only repair malformed text into one JSON object as described in the user message. " +
  "Preserve existing meaning. Do not invent merchants, amounts, or dates. " +
  "No markdown fences, no commentary outside the JSON object.";
