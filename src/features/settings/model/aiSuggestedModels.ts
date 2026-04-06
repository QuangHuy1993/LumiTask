import type { AIProvider } from "@/types/aiProvider";

/** Matches upsert key in appSettingService (single default profile in UI). */
export const DEFAULT_AI_PROFILE_NAME = "Default Profile";

/** Sensible default when user has no row yet or switches to GROQ. */
export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export type SuggestedModelOption = { value: string; label: string };

const GROQ_MODELS: SuggestedModelOption[] = [
  { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile" },
  { value: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant" },
  { value: "mixtral-8x7b-32768", label: "Mixtral 8x7B (32k)" },
  { value: "gemma2-9b-it", label: "Gemma 2 9B IT" },
];

const OPENAI_MODELS: SuggestedModelOption[] = [
  { value: "gpt-4o-mini", label: "GPT-4o mini" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 mini" },
  { value: "gpt-4.1", label: "GPT-4.1" },
];

export function suggestedModelsForProvider(provider: AIProvider): SuggestedModelOption[] {
  switch (provider) {
    case "GROQ":
      return GROQ_MODELS;
    case "OPENAI":
      return OPENAI_MODELS;
    case "ANTHROPIC":
    case "CUSTOM":
      return [];
    default: {
      const _exhaustive: never = provider;
      return _exhaustive;
    }
  }
}

export function isPresetModel(provider: AIProvider, model: string): boolean {
  return suggestedModelsForProvider(provider).some((m) => m.value === model);
}
