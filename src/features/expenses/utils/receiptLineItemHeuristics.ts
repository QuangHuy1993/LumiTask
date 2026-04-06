type CandidateLineItem = {
  name: string;
  qty: number | null;
  unitPrice: number | null;
  lineTotal: number;
};

function normalizeSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function parseVndNumber(raw: string): number | null {
  const cleaned = raw
    // OCR sometimes adds trailing letters, e.g. "5,50C"
    .replace(/[^\d.,-]/g, "")
    .trim()
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(/,(?=\d{3}(\D|$))/g, "")
    .replace(/,/g, "."); // if OCR uses comma as decimal; rare for VND, but keep safe
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Extract candidate line items from OCR text with a conservative heuristic:
 * - Prefer lines with a recognizable product name and a line total amount.
 * - Ignore obvious summary lines (TOTAL/TONG/THANH TOAN...).
 * - Ignore negative totals (discount lines) by default.
 */
export function extractCandidateLineItems(ocrText: string): CandidateLineItem[] {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => normalizeSpaces(l))
    .filter(Boolean);

  const out: CandidateLineItem[] = [];
  let pendingName: string | null = null;

  for (const line of lines) {
    const u = line.toUpperCase();
    if (
      u.includes("TONG") ||
      u.includes("TOTAL") ||
      u.includes("THANH TOAN") ||
      u.includes("THANH") && u.includes("TOAN") ||
      u.includes("SUBTOTAL") ||
      u.includes("TAM TINH") ||
      u.includes("VAT")
    ) {
      continue;
    }

    // If this looks like a product-name line without numbers, keep it as pending name
    // for the next numeric line (common in supermarket receipts).
    const hasDigits = /-?\d/.test(line);
    if (!hasDigits) {
      if (/[A-Za-zÀ-ỹ]/.test(line) && line.length >= 3) {
        pendingName = line;
      }
      continue;
    }

    // Match patterns like: "<name> <unitPrice> <qty> <lineTotal>"
    // OCR can be messy; we capture last number as lineTotal, then try to find qty and unit price before it.
    const nums = line.match(/-?\d{1,3}(?:[.,]\d{3})+|-?\d{1,3}[.,]\d{2}\w?|-?\d{4,}/g) ?? [];
    if (nums.length === 0) continue;

    const last = nums[nums.length - 1];
    const lineTotal = parseVndNumber(last);
    if (!lineTotal || lineTotal <= 0) continue;

    // Name extraction:
    // - If line starts with numbers, use the last pendingName
    // - Else, take substring before first number
    const firstNumIdx = line.search(/-?\d/);
    const derivedName =
      firstNumIdx <= 0 ? pendingName : normalizeSpaces(line.slice(0, firstNumIdx));
    if (!derivedName || derivedName.length < 3) continue;
    const name = derivedName;
    if (name.length < 3) continue;

    // Try parse qty from any small integer token in nums
    const parsedNums = nums.map((n) => parseVndNumber(n)).filter((n): n is number => n != null);
    const qtyCandidate = parsedNums.find((n) => Number.isInteger(n) && n > 0 && n < 100) ?? null;
    const qty = qtyCandidate;

    // Unit price: best-effort from a positive money-like number before lineTotal that isn't qty
    let unitPrice: number | null = null;
    for (let i = parsedNums.length - 2; i >= 0; i -= 1) {
      const v = parsedNums[i];
      if (qty != null && v === qty) continue;
      if (v > 0 && v <= lineTotal) {
        unitPrice = v;
        break;
      }
    }

    out.push({
      name,
      qty,
      unitPrice,
      lineTotal,
    });

    // Once we consumed a numeric line for pending name, clear it to reduce false joins
    pendingName = null;
  }

  // Keep the first ~25 to avoid prompt bloat
  return out.slice(0, 25);
}

export function formatCandidatesForPrompt(cands: CandidateLineItem[]): string {
  if (cands.length === 0) return "";
  return cands
    .map((c) => {
      const parts = [
        `name=${JSON.stringify(c.name)}`,
        `lineTotal=${c.lineTotal}`,
        c.qty != null ? `qty=${c.qty}` : "",
        c.unitPrice != null ? `unitPrice=${c.unitPrice}` : "",
      ].filter(Boolean);
      return `- ${parts.join(" ")}`;
    })
    .join("\n");
}

