"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const headcount_routes_1 = __importDefault(require("./routes/headcount.routes"));
const location_routes_1 = __importDefault(require("./routes/location.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
const company_routes_1 = __importDefault(require("./routes/company.routes"));
const ai_chat_routes_1 = __importDefault(require("./routes/ai-chat.routes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/", (_req, res) => {
    res.json({
        service: "DMCFS API",
        status: "ok",
        aiChat: "/api/ai-chat",
        supabaseReadMode: process.env.SUPABASE_SERVICE_ROLE_KEY ? "super-admin-full-read" : "session-read",
    });
});
app.use("/api/auth", auth_routes_1.default);
app.use("/api/headcount", headcount_routes_1.default);
app.use("/api/locations", location_routes_1.default);
app.use("/api/dashboard", dashboard_routes_1.default);
app.use("/api/companies", company_routes_1.default);
app.use("/api/ai-chat", ai_chat_routes_1.default);
exports.default = app;
//# sourceMappingURL=app.js.map