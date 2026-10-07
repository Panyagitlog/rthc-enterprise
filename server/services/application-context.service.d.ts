type Context = "DMCFS" | "RTHC" | "RTCA" | "RTCPM";
export type Intent = "GET_COORDINATOR" | "GET_HEADCOUNT" | "GET_REQUIREMENT" | "GET_FILLED" | "GET_VACANCY" | "GET_ASSESSMENT" | "GET_COORDINATOR_PERFORMANCE" | "GENERAL_DMCFS";
export declare function resolveIntent(question: string): Intent;
export declare function buildApplicationContext(context: Context, question: string, accessToken: string): Promise<string>;
export {};
//# sourceMappingURL=application-context.service.d.ts.map