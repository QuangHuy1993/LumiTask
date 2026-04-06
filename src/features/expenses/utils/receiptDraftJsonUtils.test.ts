import { describe, expect, it } from "vitest";

import { parseJsonFromLlmText, stripLlmJsonFences } from "./receiptDraftJsonUtils";

describe("receiptDraftJsonUtils", () => {
  it("stripLlmJsonFences unwraps markdown json fence", () => {
    const raw = '```json\n{"a":1}\n```';
    expect(stripLlmJsonFences(raw)).toBe('{"a":1}');
  });

  it("parseJsonFromLlmText parses fenced JSON", () => {
    const text = "```json\n{\"extracted\":{\"parseQuality\":\"ok\"},\"rows\":[]}\n```";
    const v = parseJsonFromLlmText(text) as { extracted: { parseQuality: string }; rows: unknown[] };
    expect(v.extracted.parseQuality).toBe("ok");
    expect(v.rows).toEqual([]);
  });
});
