"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAiChat = createAiChat;
function extractText(value) {
    if (typeof value === "string")
        return value.trim();
    if (!Array.isArray(value))
        return "";
    return value
        .map((part) => {
        if (!part || typeof part !== "object")
            return "";
        const text = part.text;
        return typeof text === "string" ? text.trim() : "";
    })
        .filter(Boolean)
        .join("\n");
}
async function sendRequest(url, headers, body, providerName) {
    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) {
        if (response.status === 429)
            throw new Error(`${providerName} is busy. Please try again shortly.`);
        if (response.status === 401 || response.status === 403)
            throw new Error(`${providerName} authentication failed. Check the server configuration.`);
        throw new Error(`${providerName} is temporarily unavailable. Please try again.`);
    }
    const payload = await response.json();
    const answer = providerName === "OpenAI"
        ? extractText(payload.choices?.[0]?.message?.content)
        : extractText(payload.content);
    if (!answer)
        throw new Error(`${providerName} returned an empty response. Please try again.`);
    return answer;
}
async function createAiChat(provider, messages) {
    if (provider === "openai") {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey)
            throw new Error("OpenAI is not configured. Add OPENAI_API_KEY to the server environment.");
        return sendRequest("https://api.openai.com/v1/chat/completions", { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, {
            model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
            messages,
            temperature: 0.2,
            max_tokens: 2048,
        }, "OpenAI");
    }
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey)
        throw new Error("Claude is not configured. Add ANTHROPIC_API_KEY to the server environment.");
    const systemMessage = messages.find((message) => message.role === "system")?.content;
    const conversation = messages.filter((message) => message.role !== "system");
    return sendRequest("https://api.anthropic.com/v1/messages", {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
    }, {
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5",
        max_tokens: 2048,
        ...(systemMessage ? { system: systemMessage } : {}),
        messages: conversation,
    }, "Claude");
}
//# sourceMappingURL=ai-provider.service.js.map