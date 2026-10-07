const SARVAM_API_URL = "https://api.sarvam.ai/v1/chat/completions";

export type SarvamMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function extractText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(extractText).filter(Boolean).join("\n").trim();
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;
  for (const key of ["content", "text", "answer", "output", "response"]) {
    const text = extractText(record[key]);
    if (text) return text;
  }
  for (const [key, nested] of Object.entries(record)) {
    if (["id", "object", "created", "created_at", "model", "usage", "finish_reason"].includes(key)) continue;
    const text = extractText(nested);
    if (text) return text;
  }
  return "";
}

export async function createSarvamChat(messages: SarvamMessage[]) {
  const apiKey = process.env.SARVAM_API_KEY;

  if (!apiKey) {
    throw new Error("AI service is not configured. Add SARVAM_API_KEY to the server environment.");
  }

  const response = await fetch(SARVAM_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "api-subscription-key": apiKey,
    },
    body: JSON.stringify({
      model: "sarvam-105b",
      messages,
      temperature: 0.2,
      reasoning_effort: "low",
      max_tokens: 2048,
      stream: false,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error("AI service is busy. Please try again shortly.");
    if (response.status === 401 || response.status === 403) throw new Error("AI service authentication failed. Check the server configuration.");
    throw new Error("AI service is temporarily unavailable. Please try again.");
  }

  const responseText = await response.text();
  let payload: unknown;
  try {
    payload = JSON.parse(responseText);
  } catch {
    if (responseText.trim()) return responseText.trim();
    throw new Error("AI service returned an invalid response. Please try again.");
  }

  const record = payload as Record<string, unknown>;
  const choices = Array.isArray(record.choices) ? record.choices : [];
  const firstChoice = choices[0] as Record<string, unknown> | undefined;
  const content = extractText(firstChoice?.message) || extractText(firstChoice) || extractText(payload);

  if (!content) {
    const keys = payload && typeof payload === "object" ? Object.keys(payload as Record<string, unknown>).join(",") : "non-object";
    const finishReason = firstChoice?.finish_reason || "unknown";
    console.warn(`Sarvam returned no text. status=${response.status} keys=${keys} finish_reason=${String(finishReason)}`);
    throw new Error("AI returned an empty response. Please try again.");
  }
  return content;
}
