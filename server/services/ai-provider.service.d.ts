export type AiProvider = "openai" | "claude";
export type ChatMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};
export declare function createAiChat(provider: AiProvider, messages: ChatMessage[]): Promise<string>;
//# sourceMappingURL=ai-provider.service.d.ts.map