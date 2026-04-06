import { describe, expect, it } from "vitest";

import { receiptImportDraftSchema } from "./receiptImportDraftValidation";

describe("receiptImportDraftSchema", () => {
  it("accepts minimal valid draft", () => {
    const r = receiptImportDraftSchema.safeParse({
      extracted: {
        merchantName: "Cafe",
        date: "2026-01-15",
        dateInferred: false,
        time: "",
        totalAmount: "50000",
        currency: "VND",
        rawTextSummary: "",
        parseQuality: "ok",
      },
      rows: [
        {
          amount: "50000",
          currency: "VND",
          occurredAt: "2026-01-15",
          note: "Cafe",
          entryKind: "EXPENSE",
          suggestedCategoryName: "",
          confidence: 0.8,
          lineItemName: "",
        },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects garbage parseQuality with non-empty rows", () => {
    const r = receiptImportDraftSchema.safeParse({
      extracted: {
        merchantName: "",
        date: "",
        dateInferred: false,
        time: "",
        totalAmount: "",
        currency: "VND",
        rawTextSummary: "",
        parseQuality: "garbage",
      },
      rows: [
        {
          amount: "1",
          currency: "VND",
          occurredAt: "2026-01-01",
          note: "",
          entryKind: "EXPENSE",
          confidence: 1,
          lineItemName: "",
        },
      ],
    });
    expect(r.success).toBe(false);
  });

  it("accepts garbage with empty rows", () => {
    const r = receiptImportDraftSchema.safeParse({
      extracted: {
        merchantName: "",
        date: "",
        dateInferred: false,
        time: "",
        totalAmount: "",
        currency: "VND",
        rawTextSummary: "",
        parseQuality: "garbage",
      },
      rows: [],
    });
    expect(r.success).toBe(true);
  });

  it("coerces missing rows to empty array", () => {
    const r = receiptImportDraftSchema.safeParse({
      extracted: {
        merchantName: "X",
        date: "",
        dateInferred: false,
        time: "",
        totalAmount: "",
        currency: "VND",
        rawTextSummary: "",
        parseQuality: "weak",
      },
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.rows).toEqual([]);
  });
});
