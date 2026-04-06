import type { AIProvider } from "@/types/aiProvider";

/**
 * Base URL including `/v1` for OpenAI-compatible chat completions.
 * When `storedBaseUrl` is set (CUSTOM / override), it is used as-is after trim.
 */
export function resolveOpenAiCompatibleBaseUrl(
  provider: AIProvider,
  storedBaseUrl: string | null | undefined
): { ok: true; baseUrl: string } | { ok: false; code: "MISSING_BASE_URL"; message: string } {
  const trimmed = storedBaseUrl?.trim() ?? "";
  if (trimmed) {
    return { ok: true, baseUrl: trimmed.replace(/\/$/, "") };
  }

  switch (provider) {
    case "OPENAI":
      return { ok: true, baseUrl: "https://api.openai.com/v1" };
    case "GROQ":
      return { ok: true, baseUrl: "https://api.groq.com/openai/v1" };
    case "ANTHROPIC":
      return {
        ok: false,
        code: "MISSING_BASE_URL",
        message:
          "Provider ANTHROPIC does not use the OpenAI-compatible API. Set a CUSTOM profile with an OpenAI-compatible proxy base URL, or use OPENAI/GROQ.",
      };
    case "CUSTOM":
      return {
        ok: false,
        code: "MISSING_BASE_URL",
        message: "CUSTOM provider requires a base URL (OpenAI-compatible, ending with /v1).",
      };
    default:
      return { ok: false, code: "MISSING_BASE_URL", message: "Unknown AI provider." };
  }
}
