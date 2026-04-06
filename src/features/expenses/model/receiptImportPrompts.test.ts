import { describe, expect, it } from "vitest";

import {
  MAX_REPAIR_PREVIOUS_OUTPUT_LEN,
  buildReceiptRepairPrompt,
  truncateRepairPreviousOutput,
} from "./receiptImportPrompts";

describe("receiptImportPrompts (Prompt 2)", () => {
  it("buildReceiptRepairPrompt replaces placeholder", () => {
    const prev = '{"broken": true';
    const out = buildReceiptRepairPrompt(prev);
    expect(out).toContain(prev);
    expect(out).not.toContain("{{previous_output}}");
  });

  it("buildReceiptRepairPrompt appends notice when server truncated", () => {
    const out = buildReceiptRepairPrompt('x', { serverTruncated: true });
    expect(out).toContain("truncated");
    expect(out).toContain("x");
  });

  it("truncateRepairPreviousOutput leaves short strings unchanged", () => {
    const s = "a".repeat(100);
    const r = truncateRepairPreviousOutput(s);
    expect(r.truncated).toBe(false);
    expect(r.text).toBe(s);
  });

  it("truncateRepairPreviousOutput caps at MAX_REPAIR_PREVIOUS_OUTPUT_LEN", () => {
    const s = "z".repeat(MAX_REPAIR_PREVIOUS_OUTPUT_LEN + 500);
    const r = truncateRepairPreviousOutput(s);
    expect(r.truncated).toBe(true);
    expect(r.text.length).toBe(MAX_REPAIR_PREVIOUS_OUTPUT_LEN);
  });
});
