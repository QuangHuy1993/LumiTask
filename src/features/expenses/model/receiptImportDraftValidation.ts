import { z } from "zod";

const NOTE_MAX = 2000;

function clampNote(s: string): string {
  if (s.length <= NOTE_MAX) return s;
  const head = s.slice(0, Math.max(0, NOTE_MAX - 1));
  return `${head}…`;
}

const asTrimmedString = z.preprocess((v) => (v == null ? "" : String(v)), z.string());

const moneyOrEmpty = asTrimmedString.refine(
  (v) => v === "" || /^\d+(\.\d+)?$/.test(v),
  "amount must be empty or digits with optional decimal"
);

const dateOrEmpty = asTrimmedString.refine(
  (v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v),
  "date must be empty or YYYY-MM-DD"
);

const isoCurrency = z.preprocess((v) => {
  const raw =
    v == null
      ? ""
      : String(v)
          .trim()
          .toUpperCase()
          .replace(/[^A-Z]/g, "");
  if (raw.length >= 3) return raw.slice(0, 3);
  return "VND";
}, z.string().length(3).regex(/^[A-Z]{3}$/, "currency must be 3 letters"));

const parseQualityIn = z.preprocess((v) => {
  const s = String(v ?? "")
    .trim()
    .toLowerCase();
  if (s === "ok" || s === "weak" || s === "garbage") return s;
  return "weak";
}, z.enum(["ok", "weak", "garbage"]));

const receiptExtractedSchema = z.object({
  merchantName: asTrimmedString,
  date: dateOrEmpty,
  dateInferred: z.preprocess((v) => {
    if (v === true || v === "true" || v === 1) return true;
    return false;
  }, z.boolean()),
  time: asTrimmedString,
  totalAmount: moneyOrEmpty,
  currency: isoCurrency,
  rawTextSummary: asTrimmedString,
  parseQuality: parseQualityIn,
});

const entryKindExpense = z.preprocess((v) => String(v ?? "").trim().toUpperCase(), z.literal("EXPENSE"));

const receiptRowSchema = z.object({
  amount: moneyOrEmpty,
  currency: isoCurrency,
  occurredAt: dateOrEmpty,
  note: asTrimmedString.transform(clampNote),
  entryKind: entryKindExpense,
  suggestedCategoryName: asTrimmedString,
  confidence: z.coerce.number(),
  lineItemName: asTrimmedString,
});

export const receiptImportDraftSchema = z
  .object({
    extracted: z.preprocess(
      (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {}),
      receiptExtractedSchema
    ),
    rows: z.preprocess((v) => (Array.isArray(v) ? v : []), z.array(receiptRowSchema)),
  })
  .superRefine((val, ctx) => {
    if (val.extracted.parseQuality === "garbage" && val.rows.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "parseQuality garbage requires empty rows",
        path: ["rows"],
      });
    }
  });

export type ReceiptImportDraft = z.infer<typeof receiptImportDraftSchema>;
