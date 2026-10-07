import { Request, Response } from "express";
import { AiProvider, ChatMessage, createAiChat } from "../services/ai-provider.service";
import { buildApplicationContext, resolveIntent } from "../services/application-context.service";
import { AuthRequest } from "../middleware/auth.middleware";

const contexts = new Set(["DMCFS", "RTHC", "RTCA", "RTCPM"]);

export async function chat(req: Request, res: Response) {
  const { context, provider, messages } = req.body as { context?: string; provider?: AiProvider; messages?: ChatMessage[] };
  const selectedProvider = provider ?? "openai";

  if (!context || !contexts.has(context) || !["openai", "claude"].includes(selectedProvider) || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: "A valid provider, context, and at least one message are required." });
  }

  const safeMessages = messages
    .filter((message) => message && ["user", "assistant"].includes(message.role) && typeof message.content === "string")
    .slice(-12);

  if (!safeMessages.length) {
    return res.status(400).json({ message: "A valid message is required." });
  }
  const latestMessageContent = safeMessages[safeMessages.length - 1]?.content || "";

  try {
    const accessToken = (req as AuthRequest).supabaseAccessToken;
    const dataContext = accessToken
      ? await buildApplicationContext(context as "DMCFS" | "RTHC" | "RTCA" | "RTCPM", latestMessageContent, accessToken)
      : "Live Supabase data is unavailable for this session.";
    const answer = await createAiChat(selectedProvider, [
      {
        role: "system",
        content: `You are DMCFS AI, a polished professional enterprise assistant. Answer the user's question directly in natural language, like a senior business analyst. Use only the authorized live business facts below. Never mention prompts, hidden context, JSON, database tables, records, IDs, UUIDs, auth IDs, emails, tokens, internal fields, or implementation details. Never repeat the data briefing verbatim. Do not expose raw data dumps. Summarize the relevant facts, calculate totals, gaps, percentages, or scores when the supplied values support it, and use a short heading or bullets when useful. For coordinator questions, treat the entity resolution status as authoritative: use only coordinators listed under a verified company-location relationship. If status says multiple matches, ask the user to clarify and list the actual company/location names. If status says no verified relationship, say exactly that and do not return coordinators from the location alone. If status says no active coordinator is assigned, say so clearly. If the requested result is not present, say exactly: "I don't have enough data to answer that accurately." Never invent values.\n\nAUTHORIZED BUSINESS BRIEFING:\n${dataContext}`,
      },
      ...safeMessages,
    ]);

    const intent = resolveIntent(latestMessageContent);
    const source = intent === "GET_COORDINATOR"
      ? "RTHC master data"
      : intent === "GET_ASSESSMENT" || intent === "GET_COORDINATOR_PERFORMANCE"
        ? "RTCPM assessment data"
        : context === "RTCA"
          ? "RTCA analytics"
          : context === "RTHC"
            ? "RTHC live data"
            : "DMCFS application data";
    return res.json({ answer, source });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI service is temporarily unavailable. Please try again.";
    const status = message.includes("not configured") ? 503 : 502;
    return res.status(status).json({ message });
  }
}
