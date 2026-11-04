import { createSarvamChat } from "./sarvam.service";

export type AiProvider = "openai" | "claude" | "gemini" | "sarvam";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ProviderResponse = {
  choices?: { message?: { content?: unknown } }[];
  content?: { type?: string; text?: string }[];
  candidates?: { content?: { parts?: { text?: string }[] } }[];
};

function extractText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? text.trim() : "";
    })
    .filter(Boolean)
    .join("\n");
}

async function sendRequest(url: string, headers: Record<string, string>, body: unknown, providerName: string) {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error(`${providerName} is busy. Please try again shortly.`);
    if (response.status === 401 || response.status === 403) throw new Error(`${providerName} authentication failed. Check the server configuration.`);
    throw new Error(`${providerName} is temporarily unavailable. Please try again.`);
  }

  const payload = await response.json() as ProviderResponse;
  const answer = providerName === "OpenAI"
    ? extractText(payload.choices?.[0]?.message?.content)
    : providerName === "Gemini" ? extractText(payload.candidates?.[0]?.content?.parts) : extractText(payload.content);
  if (!answer) throw new Error(`${providerName} returned an empty response. Please try again.`);
  return answer;
}

export async function createAiChat(provider: AiProvider, messages: ChatMessage[]) {
  if (provider === "sarvam") {
    return createSarvamChat(messages);
  }

  if (provider === "gemini") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini is not configured. Add GEMINI_API_KEY to the server environment.");
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const systemMessage = messages.find((message) => message.role === "system")?.content;
    const contents = messages
      .filter((message) => message.role !== "system")
      .map((message) => ({ role: message.role === "assistant" ? "model" : "user", parts: [{ text: message.content }] }));

    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await sendRequest(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          {
            ...(systemMessage ? { systemInstruction: { parts: [{ text: systemMessage }] } } : {}),
            contents,
            generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
          },
          "Gemini",
        );
      } catch (error) {
        lastError = error;
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      }
    }
    throw lastError;
  }
  if (provider === "openai") {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OpenAI is not configured. Add OPENAI_API_KEY to the server environment.");
    const configuredModel = process.env.OPENAI_MODEL?.trim();
    const model = configuredModel && !configuredModel.startsWith("sk-") ? configuredModel : "gpt-4.1-mini";

    return sendRequest(
      "https://api.openai.com/v1/chat/completions",
      { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      {
        model,
        messages,
        temperature: 0.2,
        max_tokens: 2048,
      },
      "OpenAI",
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Claude is not configured. Add ANTHROPIC_API_KEY to the server environment.");
  const systemMessage = messages.find((message) => message.role === "system")?.content;
  const conversation = messages.filter((message) => message.role !== "system");

  return sendRequest(
    "https://api.anthropic.com/v1/messages",
    {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    {
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
      max_tokens: 2048,
      ...(systemMessage ? { system: systemMessage } : {}),
      messages: conversation,
    },
    "Claude",
  );
}
