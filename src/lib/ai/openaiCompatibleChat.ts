export type ChatMessageRole = "system" | "user" | "assistant";

export type ChatMessage = {
  role: ChatMessageRole;
  content: string;
};

export type OpenAiCompatibleChatInput = {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  temperature: number;
  maxTokens: number;
  signal?: AbortSignal;
};

export type OpenAiCompatibleChatUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

export type OpenAiCompatibleChatResult =
  | { ok: true; content: string; usage?: OpenAiCompatibleChatUsage }
  | {
      ok: false;
      code: "HTTP_ERROR" | "NETWORK" | "EMPTY_CONTENT" | "INVALID_RESPONSE";
      message: string;
      status?: number;
    };

type RawCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  error?: { message?: string };
};

export async function completeOpenAiCompatibleChat(
  input: OpenAiCompatibleChatInput
): Promise<OpenAiCompatibleChatResult> {
  const url = `${input.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const body = {
    model: input.model,
    messages: input.messages,
    temperature: input.temperature,
    max_tokens: input.maxTokens,
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${input.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: input.signal,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Network error";
    return { ok: false, code: "NETWORK", message: msg };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      code: "INVALID_RESPONSE",
      message: "Response body is not JSON",
      status: res.status,
    };
  }

  const parsed = json as RawCompletionResponse;
  if (!res.ok) {
    const apiMsg = parsed.error?.message ?? res.statusText;
    return {
      ok: false,
      code: "HTTP_ERROR",
      message: apiMsg || `HTTP ${res.status}`,
      status: res.status,
    };
  }

  const content = parsed.choices?.[0]?.message?.content?.trim() ?? "";
  if (!content) {
    return { ok: false, code: "EMPTY_CONTENT", message: "Model returned empty content" };
  }

  const usage: OpenAiCompatibleChatUsage | undefined = parsed.usage
    ? {
        promptTokens: parsed.usage.prompt_tokens,
        completionTokens: parsed.usage.completion_tokens,
        totalTokens: parsed.usage.total_tokens,
      }
    : undefined;

  return { ok: true, content, usage };
}
