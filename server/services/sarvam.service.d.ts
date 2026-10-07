export type SarvamMessage = {
    role: "system" | "user" | "assistant";
    content: string;
};
export declare function createSarvamChat(messages: SarvamMessage[]): Promise<string>;
//# sourceMappingURL=sarvam.service.d.ts.map