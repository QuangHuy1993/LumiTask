import { appSettingService } from "@/features/settings/services/appSettingService";
import { completeOpenAiCompatibleChat } from "@/lib/ai/openaiCompatibleChat";
import { resolveOpenAiCompatibleBaseUrl } from "@/lib/ai/resolveOpenAiCompatibleBaseUrl";
import { prisma } from "@/lib/db/prisma";

type AISetting = Awaited<ReturnType<typeof appSettingService.getAISettings>>[number];

import {
  buildReceiptExtractPrompt,
  buildReceiptRepairPrompt,
  receiptImportSystemMessage,
  receiptRepairSystemMessage,
  truncateRepairPreviousOutput,
} from "../model/receiptImportPrompts";
import {
  type ReceiptImportDraft,
  receiptImportDraftSchema,
} from "../model/receiptImportDraftValidation";
import {
  coerceReceiptDraftNulls,
  parseJsonFromLlmText,
} from "../utils/receiptDraftJsonUtils";
import { extractCandidateLineItems, formatCandidatesForPrompt } from "../utils/receiptLineItemHeuristics";

const MAX_RAW_TEXT_LEN = 50_000;

export type ReceiptOcrDraftErrorCode =
  | "NO_AI_PROFILE"
  | "AI_INACTIVE"
  | "MISSING_API_KEY"
  | "MISSING_BASE_URL"
  | "LLM_ERROR"
  | "DRAFT_VALIDATION_FAILED"
  | "INPUT_TOO_LONG"
  | "EMPTY_INPUT";

export type ReceiptOcrDraftResult =
  | { ok: true; data: ReceiptImportDraft }
  | { ok: false; code: ReceiptOcrDraftErrorCode; message: string };

function pickActiveAISetting(settings: AISetting[]): AISetting | null {
  const active = settings.filter((s) => s.isActive);
  const def = active.find((s) => s.isDefault);
  if (def) return def;
  return active[0] ?? null;
}

function resolveApiKey(setting: AISetting): string {
  const k = setting.apiKey?.trim();
  if (k) return k;
  if (setting.provider === "OPENAI") return process.env.OPENAI_API_KEY?.trim() ?? "";
  if (setting.provider === "GROQ") return process.env.GROQ_API_KEY?.trim() ?? "";
  return "";
}

function garbageFallback(): ReceiptImportDraft {
  return {
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
  };
}

function validateDraftPayload(raw: unknown): ReceiptImportDraft | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  coerceReceiptDraftNulls(obj);
  const parsed = receiptImportDraftSchema.safeParse(obj);
  return parsed.success ? parsed.data : null;
}

async function logAiRequest(params: {
  setting: AISetting;
  userId: number;
  inputPreview: string;
  outputPreview: string;
  tokensIn?: number;
  tokensOut?: number;
  latencyMs: number;
}): Promise<void> {
  try {
    await prisma.aIRequestLog.create({
      data: {
        provider: params.setting.provider,
        model: params.setting.model,
        aiSettingId: params.setting.id,
        userId: params.userId,
        inputPreview: params.inputPreview,
        outputPreview: params.outputPreview,
        tokensIn: params.tokensIn ?? null,
        tokensOut: params.tokensOut ?? null,
        latencyMs: params.latencyMs,
      },
    });
  } catch (err) {
    console.error("[receiptOcrDraftService] AIRequestLog failed", err);
  }
}

type LlmRoundMode = "extract" | "repair";

function repairRoundTemperature(setting: AISetting): number {
  const t = Number(setting.temperature ?? 0.3);
  return Math.min(Math.max(t, 0), 0.1);
}

async function runLlmRound(params: {
  setting: AISetting;
  userId: number;
  userContent: string;
  mode: LlmRoundMode;
  repairMeta?: { serverTruncated?: boolean };
  signal?: AbortSignal;
}): Promise<
  | { ok: true; content: string; usage?: { promptTokens?: number; completionTokens?: number } }
  | { ok: false; message: string }
> {
  const base = resolveOpenAiCompatibleBaseUrl(params.setting.provider, params.setting.baseUrl);
  if (!base.ok) {
    return { ok: false, message: base.message };
  }

  const apiKey = resolveApiKey(params.setting);
  if (!apiKey) {
    return { ok: false, message: "Missing API key (profile or environment)." };
  }

  const system =
    params.mode === "repair" ? receiptRepairSystemMessage : receiptImportSystemMessage;
  const temperature =
    params.mode === "repair"
      ? repairRoundTemperature(params.setting)
      : params.setting.temperature ?? 0.3;

  const t0 = Date.now();
  const res = await completeOpenAiCompatibleChat({
    baseUrl: base.baseUrl,
    apiKey,
    model: params.setting.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: params.userContent },
    ],
    temperature,
    maxTokens: params.setting.maxTokens ?? 4096,
    signal: params.signal,
  });
  const latencyMs = Date.now() - t0;

  const inputPreview =
    params.mode === "repair"
      ? `[receipt-draft:repair] userContentLen=${params.userContent.length}` +
        (params.repairMeta?.serverTruncated ? " truncated=true" : "")
      : `[receipt-draft:extract] userContentLen=${params.userContent.length}`;
  const outputPreview = res.ok ? res.content.slice(0, 800) : "";

  await logAiRequest({
    setting: params.setting,
    userId: params.userId,
    inputPreview,
    outputPreview: res.ok ? outputPreview : (res.message ?? "").slice(0, 800),
    tokensIn: res.ok ? res.usage?.promptTokens : undefined,
    tokensOut: res.ok ? res.usage?.completionTokens : undefined,
    latencyMs,
  });

  if (!res.ok) {
    return { ok: false, message: res.message };
  }

  return {
    ok: true,
    content: res.content,
    usage: {
      promptTokens: res.usage?.promptTokens,
      completionTokens: res.usage?.completionTokens,
    },
  };
}

function fallbackDraftFromCandidates(params: {
  ocrText: string;
  candidateItems: ReturnType<typeof extractCandidateLineItems>;
  merchantName: string;
  extractedTotalAmount: string;
}): ReceiptImportDraft {
  const rows = params.candidateItems.map((c) => ({
    amount: String(c.lineTotal),
    currency: "VND",
    occurredAt: "",
    note: params.merchantName ? `${params.merchantName} — ${c.name}` : c.name,
    entryKind: "EXPENSE" as const,
    suggestedCategoryName: "",
    confidence: 0.6,
    lineItemName: c.name,
  }));

  return {
    extracted: {
      merchantName: params.merchantName,
      date: "",
      dateInferred: false,
      time: "",
      totalAmount: params.extractedTotalAmount,
      currency: "VND",
      rawTextSummary: "",
      parseQuality: "weak",
    },
    rows,
  };
}

export const receiptOcrDraftService = {
  async extractDraftFromOcrText(
    ownerId: number,
    rawText: string,
    options?: { signal?: AbortSignal }
  ): Promise<ReceiptOcrDraftResult> {
    const trimmed = rawText.trim();
    if (!trimmed) {
      return { ok: false, code: "EMPTY_INPUT", message: "OCR text is empty" };
    }
    if (trimmed.length > MAX_RAW_TEXT_LEN) {
      return {
        ok: false,
        code: "INPUT_TOO_LONG",
        message: `OCR text exceeds ${MAX_RAW_TEXT_LEN} characters`,
      };
    }

    const settings = await appSettingService.getAISettings(ownerId);
    const setting = pickActiveAISetting(settings);
    if (!settings.length) {
      return {
        ok: false,
        code: "NO_AI_PROFILE",
        message: "No AI profile configured. Add one in Settings.",
      };
    }
    if (!setting) {
      return {
        ok: false,
        code: "AI_INACTIVE",
        message: "All AI profiles are inactive. Enable one in Settings.",
      };
    }

    const base = resolveOpenAiCompatibleBaseUrl(setting.provider, setting.baseUrl);
    if (!base.ok) {
      return { ok: false, code: "MISSING_BASE_URL", message: base.message };
    }
    if (!resolveApiKey(setting)) {
      return {
        ok: false,
        code: "MISSING_API_KEY",
        message: "API key is missing for this profile (and no env fallback).",
      };
    }

    const candidateItems = extractCandidateLineItems(trimmed);
    const candidate = formatCandidatesForPrompt(candidateItems);
    const extractPrompt = buildReceiptExtractPrompt({ rawText: trimmed, candidateItems: candidate });
    const first = await runLlmRound({
      setting,
      userId: ownerId,
      userContent: extractPrompt,
      mode: "extract",
      signal: options?.signal,
    });
    if (!first.ok) {
      return { ok: false, code: "LLM_ERROR", message: first.message };
    }

    let lastModelText = first.content;
    let parsed: unknown;
    try {
      parsed = parseJsonFromLlmText(lastModelText);
    } catch {
      const capped = truncateRepairPreviousOutput(lastModelText);
      const repairPrompt = buildReceiptRepairPrompt(capped.text, {
        serverTruncated: capped.truncated,
      });
      const second = await runLlmRound({
        setting,
        userId: ownerId,
        userContent: repairPrompt,
        mode: "repair",
        repairMeta: { serverTruncated: capped.truncated },
        signal: options?.signal,
      });
      if (!second.ok) {
        return { ok: false, code: "LLM_ERROR", message: second.message };
      }
      lastModelText = second.content;
      try {
        parsed = parseJsonFromLlmText(lastModelText);
      } catch {
        return {
          ok: false,
          code: "DRAFT_VALIDATION_FAILED",
          message: "Model output is not valid JSON after repair attempt",
        };
      }
    }

    let draft = validateDraftPayload(parsed);
    if (!draft) {
      const capped = truncateRepairPreviousOutput(lastModelText);
      const repairPrompt = buildReceiptRepairPrompt(capped.text, {
        serverTruncated: capped.truncated,
      });
      const second = await runLlmRound({
        setting,
        userId: ownerId,
        userContent: repairPrompt,
        mode: "repair",
        repairMeta: { serverTruncated: capped.truncated },
        signal: options?.signal,
      });
      if (!second.ok) {
        return { ok: true, data: garbageFallback() };
      }
      lastModelText = second.content;
      try {
        parsed = parseJsonFromLlmText(lastModelText);
      } catch {
        return { ok: true, data: garbageFallback() };
      }
      draft = validateDraftPayload(parsed);
      if (!draft) {
        return { ok: true, data: garbageFallback() };
      }
    }

    // Hard guarantee: if we have multiple strong candidates but the model still output single-row,
    // generate multi-item rows deterministically so the user can review details.
    if (candidateItems.length >= 2 && draft.rows.length <= 1) {
      const merchant = draft.extracted.merchantName || "WinMart";
      draft = fallbackDraftFromCandidates({
        ocrText: trimmed,
        candidateItems,
        merchantName: merchant,
        extractedTotalAmount: draft.extracted.totalAmount,
      });
    }

    return { ok: true, data: draft };
  },
};
